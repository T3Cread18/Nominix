"""
Motor de Nómina Dinámico (Rule Engine).
Corregido para soportar funciones (min, max) y Timezones.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Dict, Any
from datetime import date, datetime, timedelta
import calendar
from simpleeval import simple_eval
from django.utils import timezone  # <--- IMPORTANTE PARA TIMEZONES

from .models import (
    PayrollConcept, 
    LaborContract, 
    Currency, 
    ExchangeRate, 
    PayrollPeriod, 
    PayrollNovelty,
    Company,
    Loan
)
from .services.salary import SalarySplitter
from .services.variations_engine import VariationsEngine

# Constantes de Configuración
FALLBACK_SALARIO_MINIMO = Decimal('130.00')
MONTO_CESTATICKET_USD = Decimal('40.00')  # Monto legal fijo del cestaticket

class PayrollEngine:
    def __init__(
        self, 
        contract: LaborContract, 
        period: Optional[PayrollPeriod] = None, 
        payment_date: Optional[date] = None,
        input_variables: Optional[Dict[str, float]] = None
    ):
        self.contract = contract
        self.period = period
        
        # Manejo robusto de fechas
        if period:
            self.payment_date = period.payment_date
        elif payment_date:
            self.payment_date = payment_date
        else:
            self.payment_date = timezone.now().date() # <--- Uso correcto de Timezone

        self.exchange_rate_obj = None
        self._cached_rate_value = None
        
        # Cargar novedades
        # Cargar novedades
        if input_variables is not None:
            self.input_variables = input_variables
        else:
            self.input_variables = self._load_novelties_from_db()

        # --- VARIACIONES (Nuevo) ---
        self.deducted_days = 0
        self.variation_lines = [] # Para inyectar en recibo si es necesario
        self.novelty_metadata = {} # Para guardar tipo_recibo, etc.
        
        if self.period:
            impact = VariationsEngine.calculate_period_impact(
                self.contract.employee, 
                self.period.start_date, 
                self.period.end_date
            )
            self.deducted_days = impact['deducted_days']
            
            # Inyectar novedades automáticas de variaciones (ej: VACACIONES=5)
            # Se suman a las manuales.
            for nov in impact['novelties']:
                code = nov['concept_code']
                val = float(nov['amount'])
                
                # Guardar metadata antes de sumar (tipo_recibo)
                self.novelty_metadata[code] = {
                    'tipo_recibo': nov.get('tipo_recibo', 'salario')
                }

                if code in self.input_variables:
                    self.input_variables[code] += val
                else:
                    self.input_variables[code] = val
                
                # Guardamos metadata de tipo_recibo para usarla luego si es necesario
                # Aunque el Engine procesa input_variables genéricos,
                # modificaremos calculate_payroll para usar 'tipo_recibo' desde aquí si es posible.
                # Por ahora, solo inyectamos la variable para que la fórmula funcione.
                # TODO: Pasar metadata completa al procesar concepto.

    def _load_novelties_from_db(self) -> Dict[str, float]:
        if not self.period:
            return {}
        novelties = PayrollNovelty.objects.filter(employee=self.contract.employee, period=self.period)
        variables = {}
        for nov in novelties:
            variables[nov.concept_code] = float(nov.amount)
        return variables

    def _get_exchange_rate_value(self, target_currency: Currency) -> Decimal:
        if target_currency.code == 'VES': return Decimal('1.00')
        if self._cached_rate_value and self.contract.salary_currency == target_currency:
            return self._cached_rate_value

        # Corrección Timezone: Aseguramos comparar fechas o datetimes conscientes
        # Convertimos payment_date (date) a datetime con timezone para la consulta
        query_date = timezone.make_aware(
            datetime.combine(self.payment_date, datetime.min.time())
        )

        rate_obj = ExchangeRate.objects.filter(
            currency=target_currency, 
            date_valid__lte=query_date 
        ).order_by('-date_valid').first()
        if not rate_obj:
            rate_obj = ExchangeRate.objects.filter(
                currency=target_currency
            ).order_by('date_valid').first()

        val = rate_obj.rate if rate_obj else Decimal('1.00')
        if self.contract.salary_currency == target_currency:
            self.exchange_rate_obj = rate_obj
            self._cached_rate_value = val
        return val

    @staticmethod
    def get_variable_inventory() -> Dict[str, Dict[str, Any]]:
        """
        Devuelve un diccionario de todas las variables disponibles para las fórmulas,
        con descripción y ejemplos.
        """
        return {
            'SALARIO_MENSUAL': {
                'description': 'Monto total del salario mensual pactado en el contrato (VES)',
                'category': 'Salario',
                'example': 5000.00
            },
            'SUELDO_BASE_MENSUAL': {
                'description': 'Sueldo base mensual pactado en el contrato (Tabular)',
                'category': 'Salario',
                'example': 3000.00
            },
            'SUELDO_BASE_DIARIO': {
                'description': 'Sueldo base mensual dividido entre 30',
                'category': 'Salario',
                'example': 100.00
            },
            'SUELDO_BASE': {
                'description': 'Alias para el sueldo base proporcional al periodo',
                'category': 'Salario',
                'example': 1500.00
            },
            'SUELDO_BASE_PERIODO': {
                'description': 'Monto bruto del sueldo base correspondiente al periodo (sin deducciones)',
                'category': 'Salario',
                'example': 750.00
            },
            'COMPLEMENTO_MENSUAL': {
                'description': 'Monto del complemento o bono no salarial mensual (VES)',
                'category': 'Salario',
                'example': 2000.00
            },
            'COMPLEMENTO_PERIODO': {
                'description': 'Monto del complemento correspondiente al periodo',
                'category': 'Salario',
                'example': 1000.00
            },
            'SALARIO_DIARIO': {
                'description': 'Salario total mensual dividido entre 30 días',
                'category': 'Salario',
                'example': 166.67
            },
            'SALARIO_MINIMO': {
                'description': 'Salario mínimo nacional vigente configurado en la empresa',
                'category': 'Salario',
                'example': 130.00
            },
            'DIAS': {
                'description': 'Días totales del periodo de nómina (ej: 15 para quincena, 30 para mes)',
                'category': 'Tiempos',
                'example': 15
            },
            'LUNES': {
                'description': 'Cantidad de lunes que caen dentro del periodo (usado para IVSS/PIE)',
                'category': 'Tiempos',
                'example': 2
            },
            'ANTIGUEDAD': {
                'description': 'Años de servicio del empleado en la empresa',
                'category': 'Empleado',
                'example': 3
            },
            'DIAS_HABILES': {
                'description': 'Días laborables (Lunes-Viernes) reales en el calendario del periodo',
                'category': 'Tiempos',
                'example': 11
            },
            'DIAS_SABADO': {
                'description': 'Días de descanso (Sábados) reportados o trabajados en el periodo',
                'category': 'Novedades/Descansos',
                'example': 2
            },
            'DIAS_DOMINGO': {
                'description': 'Días de descanso (Domingos) reportados o trabajados en el periodo',
                'category': 'Novedades/Descansos',
                'example': 2
            },
            'DIAS_FERIADO': {
                'description': 'Días feriados detectados o reportados en el periodo',
                'category': 'Novedades/Descansos',
                'example': 1
            },
            'OVERTIME_HOURS': {
                'description': 'Horas extras diurnas reportadas como novedad',
                'category': 'Novedades/Horas',
                'example': 5.5
            },
            'NIGHT_HOURS': {
                'description': 'Horas de bono nocturno reportadas como novedad',
                'category': 'Novedades/Horas',
                'example': 10.0
            },
            'SUNDAY_HOURS': {
                'description': 'Horas trabajadas en domingo reportadas como novedad',
                'category': 'Novedades/Horas',
                'example': 8.0
            },
            'DIAS_REPOSO': {
                'description': 'Días de reposo médico reportados',
                'category': 'Novedades/Ausencias',
                'example': 3
            },
            'DIAS_DESCANSO': {
                'description': 'Alias para DIAS_SABADO (Días de descanso semanal)',
                'category': 'Novedades/Descansos',
                'example': 2
            },
            'H_EXTRA_DIURNA': {
                'description': 'Alias para OVERTIME_HOURS (Horas extras diurnas)',
                'category': 'Novedades/Horas',
                'example': 2.0
            },
            'H_EXTRA_NOCTURNA': {
                'description': 'Alias para NIGHT_HOURS (Horas extras nocturnas)',
                'category': 'Novedades/Horas',
                'example': 2.0
            },
            'BONO_NOCTURNO': {
                'description': 'Alias para NIGHT_BONUS (Bono nocturno)',
                'category': 'Novedades/Horas',
                'example': 10.0
            },
            'FALTAS': {
                'description': 'Cantidad de faltas injustificadas reportadas',
                'category': 'Novedades/Ausencias',
                'example': 1
            },
            # Variables especiales para fórmulas de ajuste (FIXED_AMOUNT)
            'VALOR_BASE': {
                'description': 'Valor fijo base del concepto (solo en fórmulas de ajuste)',
                'category': 'Ajuste/FIXED_AMOUNT',
                'example': 100.0
            },
            'CANTIDAD': {
                'description': 'Multiplicador/cantidad de la novedad (solo en fórmulas de ajuste)',
                'category': 'Ajuste/FIXED_AMOUNT',
                'example': 1.0
            },
            'MONTO_CALCULADO': {
                'description': 'Resultado de VALOR_BASE * CANTIDAD * TASA antes del ajuste',
                'category': 'Ajuste/FIXED_AMOUNT',
                'example': 5000.0
            },
        }

    def _get_formula_breakdown(self, formula: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Genera una versión legible de la fórmula y el mapeo de variables usadas,
        incluyendo metadatos de las variables si están disponibles.
        """
        import re
        if not formula: return {"trace": "", "variables": {}}
        
        inventory = self.get_variable_inventory()
        words = re.findall(r'[A-Za-z_][A-Za-z0-9_]*', formula)
        resolved = formula
        variables_used = {}
        
        for word in sorted(set(words), key=len, reverse=True):
            if word in context:
                val = context[word]
                meta = inventory.get(word, {})
                
                if word not in variables_used:
                    variables_used[word] = {
                        "value": float(val) if isinstance(val, Decimal) else val,
                        "description": meta.get('description', 'Variable de sistema o novedad'),
                        "category": meta.get('category', 'Otros')
                    }

                if isinstance(val, (int, float, Decimal)):
                    str_val = f"{float(val):.2f}"
                else:
                    str_val = str(val)
                
                # Usar regex para reemplazar solo palabras completas
                resolved = re.sub(r'\b' + word + r'\b', str_val, resolved)
        
        return {
            "trace": resolved,
            "variables": variables_used
        }

    def _get_formula_trace(self, formula: str, context: Dict[str, Any]) -> str:
        return self._get_formula_breakdown(formula, context)["trace"]

    @staticmethod
    def validate_formula(formula: str, custom_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Prueba una fórmula de forma aislada para validación.
        Carga automáticamente códigos de conceptos y acumuladores para evitar errores de definición.
        """
        # 1. Contexto base de variables de sistema
        context = {k: v['example'] for k, v in PayrollEngine.get_variable_inventory().items()}
        
        # 2. Cargar códigos de conceptos existentes (usar su valor base como ejemplo realista)
        try:
            concept_codes = {c.code: float(c.value) for c in PayrollConcept.objects.filter(active=True)}
            context.update(concept_codes)
        except Exception:
            pass # Fallback si no hay DB en este hilo

        # 3. Cargar acumuladores definidos
        from .serializers import ACCUMULATOR_LABELS
        accumulators = {f"TOTAL_{code}": 1.0 for code in ACCUMULATOR_LABELS.keys()}
        context.update(accumulators)

        # 4. Cargar sufijos de cantidad (_CANT) para evitar NameError
        quantities = {f"{c.code}_CANT": 1.0 for c in PayrollConcept.objects.filter(active=True)}
        context.update(quantities)

        # 5. Variables especiales para fórmulas de ajuste en conceptos FIXED_AMOUNT
        context.update({
            'VALOR_BASE': 100.0,
            'CANTIDAD': 1.0,
            'TASA': 50.0,
            'MONTO_CALCULADO': 5000.0,
        })

        if custom_context:
            context.update(custom_context)

        functions = {
            'min': min,
            'max': max,
            'round': round,
            'int': int,
            'abs': abs,
            'float': float,
        }

        try:
            from simpleeval import simple_eval
            result = simple_eval(formula, names=context, functions=functions)
            
            import re
            words = re.findall(r'[A-Za-z_][A-Za-z0-9_]*', formula)
            resolved = formula
            for word in sorted(set(words), key=len, reverse=True):
                if word in context:
                    val = context[word]
                    str_val = f"{float(val):.2f}" if isinstance(val, (int, float, Decimal)) else str(val)
                    resolved = re.sub(r'\b' + word + r'\b', str_val, resolved)

            return {
                "success": True,
                "result": float(result) if isinstance(result, (Decimal, int, float)) else result,
                "trace": resolved
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    def _get_allowed_functions(self):
        """
        Define explícitamente qué funciones de Python puede usar el usuario.
        """
        return {
            'min': min,
            'max': max,
            'round': round,
            'int': int,
            'abs': abs,
            'float': float,
        }

    def _build_eval_context(self) -> Dict[str, Any]:
        """
        Construye SOLO las VARIABLES (Datos).
        """
        # 1. Determinar Salario Total y Sueldo Base
        contract_rate = self._get_exchange_rate_value(self.contract.salary_currency)
        total_salary_ves = float(self.contract.monthly_salary * contract_rate)
        
        # Obtener desglose para tener el Sueldo Base real
        breakdown = SalarySplitter.get_salary_breakdown(self.contract, contract_rate)
        base_salary_ves = float(breakdown['base'] * contract_rate)
        
        # 2. Cálculo de Lunes y desglose de días por tipo
        mondays = 0
        workdays_count = 0  # L-V
        # Contador real del calendario para validación
        saturdays_calendar = 0 # S
        sundays_calendar = 0 
        holidays_calendar = 0
        
        # Lista de feriados nacionales venezolanos
        # TODO: Implementar modelo de Feriados en DB
        current_year = self.period.start_date.year if self.period else self.payment_date.year
        national_holidays = [
            date(current_year, 1, 1),   # Año Nuevo
            date(current_year, 4, 19),  # Proclamación Independencia
            date(current_year, 5, 1),   # Día del Trabajador
            date(current_year, 6, 24),  # Batalla de Carabobo
            date(current_year, 7, 5),   # Firma Acta Independencia
            date(current_year, 7, 24),  # Natalicio de Simón Bolívar
            date(current_year, 10, 12), # Día de la Resistencia Indígena
            date(current_year, 12, 24), # Víspera de Navidad
            date(current_year, 12, 25), # Navidad
            date(current_year, 12, 31), # Fin de Año
        ]

        if self.period:
            curr = self.period.start_date
            while curr <= self.period.end_date:
                wd = curr.weekday() # 0=Mon, ..., 4=Fri, 5=Sat, 6=Sun
                is_holiday = curr in national_holidays
                
                if wd == 0: mondays += 1
                
                if is_holiday:
                    holidays_calendar += 1
                elif wd < 5: # Lunes a Viernes
                    workdays_count += 1
                elif wd == 5: # Sábado
                    saturdays_calendar += 1
                else: # Domingo
                    sundays_calendar += 1
                
                curr += timedelta(days=1)
        else:
            # Fallback para simulación (basado en el mes de pago)
            import calendar
            curr_month = self.payment_date.month
            curr_year = self.payment_date.year
            _, last_day = calendar.monthrange(curr_year, curr_month)
            for d in range(1, last_day + 1):
                dt = date(curr_year, curr_month, d)
                wd = dt.weekday()
                is_holiday = dt in national_holidays
                
                if wd == 0: mondays += 1
                
                if is_holiday:
                    holidays_calendar += 1
                elif wd < 5: workdays_count += 1
                elif wd == 5: saturdays_calendar += 1
                else: sundays_calendar += 1
        
        # Ajuste a 15/30 para mantener consistencia comercial si es necesario
        # Si la suma es 13-16, ajustamos proporcionalmente? 
        # O simplemente mostramos el real del calendario. El usuario pidió "intervalo de cierre".
        
        # Obtener Salario Mínimo y Jornada de la configuración de la empresa
        company = Company.objects.first()
        min_salary = company.national_minimum_salary if company else FALLBACK_SALARIO_MINIMO
        
        # 3. Determinar días totales del periodo (comercial)
        days_in_period = 15
        if company:
            if company.payroll_journey == 'BIWEEKLY': days_in_period = 15
            elif company.payroll_journey == 'MONTHLY': days_in_period = 30
            elif company.payroll_journey == 'WEEKLY': days_in_period = 7

        if self.period:
            delta = (self.period.end_date - self.period.start_date).days + 1
            if delta >= 28: days_in_period = 30
            elif delta >= 13: days_in_period = 15
            elif delta >= 6: days_in_period = 7
            else: days_in_period = delta

        # 3. Contexto de Variables
        context = {
            'SALARIO_MENSUAL': total_salary_ves,
            'SALARIO_DIARIO': total_salary_ves / 30,
            
            # Nuevas variables desglosadas
            'SALARIO_TOTAL_MENSUAL': total_salary_ves,
            'SALARIO_TOTAL_DIARIO': total_salary_ves / 30,
            'SUELDO_BASE_MENSUAL': base_salary_ves,
            'SUELDO_BASE_DIARIO': base_salary_ves / 30,
            'COMPLEMENTO_MENSUAL': float(breakdown['complement'] * contract_rate),
            'COMPLEMENTO_DIARIO': float(breakdown['complement'] * contract_rate) / 30,
            
            'SALARIO_MINIMO': float(min_salary),
            'ANTIGUEDAD': self.contract.employee.seniority_years,
            'DIAS': days_in_period,
            'DIAS_HABILES': workdays_count,
            'DIAS_SABADO': 0.0,  # Por defecto 0 (pedido por usuario)
            'DIAS_DOMINGO': 0.0, # Por defecto 0 (pedido por usuario)
            'DIAS_FERIADO': 0.0, # Por defecto 0 (pedido por usuario)
            'LUNES': mondays,
            
            # Defaults para evitar errores
            'OVERTIME_HOURS': 0.0,
            'NIGHT_HOURS': 0.0,
            'SUNDAY_HOURS': 0.0,
            'HOLIDAY_HOURS': 0.0,
            'FALTAS': 0.0,
            'DIAS_FALTAS': 0.0,
            'DIAS_REPOSO': 0.0,
            'FERIADOS_TRABAJADOS': 0.0,
            'H_EXTRA_DIURNA': 0.0,
            'H_EXTRA_NOCTURNA': 0.0,
            'BONO_NOCTURNO': 0.0,
            'H_EXTRA': 0.0,
            'B_NOCTURNO': 0.0,
            'DIAS_DESCANSO': 0.0,
            'FERIADOS_TRABAJADOS': 0.0,
            'H_EXTRA_DIURNA': 0.0,
            
            # Polítitcas y Factores (de la base de datos)
            'FACTOR_HED': 1.50,
            'FACTOR_HEN': 1.80,
            'TASA_BONO_NOCTURNO': 0.30,
            'FACTOR_FERIADO': 1.50,
            'FACTOR_DESCANSO': 1.50,
        }

        # Intentar cargar factores reales de la política de la empresa
        if company and hasattr(company, 'policy'):
            policy = company.policy
            context.update({
                'FACTOR_HED': float(policy.overtime_day_factor),
                'FACTOR_HEN': float(policy.overtime_night_factor),
                'TASA_BONO_NOCTURNO': float(policy.night_bonus_rate),
                'FACTOR_FERIADO': float(policy.holiday_payout_factor),
                'FACTOR_DESCANSO': float(policy.rest_day_payout_factor),
            })

        # Mapeo de códigos de novedades (DB) a nombres de variables (Fórmulas)
        self.NOVELTY_MAP = {
            'H_EXTRA': 'OVERTIME_HOURS',
            'B_NOCTURNO': 'NIGHT_HOURS',
            'BONO_DOMINGO': 'SUNDAY_HOURS',
            'FERIADO': 'HOLIDAY_HOURS',
            'FALTAS': 'FALTAS',
            'REPOSO': 'DIAS_REPOSO',
            'FERIADO_TRAB': 'FERIADOS_TRABAJADOS',
            
            # Alias para Días de Descanso y Feriados (Sincronización con Frontend)
            'DIAS_DESCANSO': 'DIAS_SABADO',
            'DIAS_DOMINGO': 'DIAS_DOMINGO',
            'DIAS_FERIADO': 'DIAS_FERIADO',
            'DIAS_FERIADOS': 'DIAS_FERIADO',
            'HED': 'H_EXTRA_DIURNA',
            'HEN': 'H_EXTRA_NOCTURNA',
            'BN': 'BONO_NOCTURNO',
        }

        for key, val in self.input_variables.items():
            u_key = key.upper()
            numeric_val = float(val or 0)
            
            # Map input key to internal variable name
            internal_key = self.NOVELTY_MAP.get(u_key, u_key)

            # Validation removed at user request: allow any number of days
            pass

            context[internal_key] = numeric_val
            # Also keep it under original key if different
            if u_key != internal_key:
                context[u_key] = numeric_val
            
            # Legacy mapping for formulas
            if u_key in self.NOVELTY_MAP:
                mapped_key = self.NOVELTY_MAP[u_key]
                context[mapped_key] = numeric_val
                context[f"{mapped_key}_CANT"] = numeric_val

            # Siempre inyectar el sufijo _CANT para el código original de la novedad
            context[f"{u_key}_CANT"] = numeric_val

        return context

    def calculate_concept(self, concept: PayrollConcept, override_value=None, multiplier=None, context=None) -> Dict[str, Any]:
        """
        Calcula el monto de un concepto individual.
        - override_value: Pone un nuevo valor base (ej: cambio de sueldo en contrato).
        - multiplier: Multiplica el valor base (ej: cantidad en una novedad).
        """
        # 1. Determinar el Valor Base
        # Si hay override_value (contrato), ese manda sobre el del catálogo.
        base_val = Decimal(str(override_value)) if override_value is not None else concept.value
        
        # 2. Determinar el Multiplicador
        # Si es monto fijo, el multiplicador es la cantidad (novedad). Default 1.0.
        m = Decimal(str(multiplier)) if multiplier is not None else Decimal('1.0')
        
        amount = Decimal('0.00')
        trace = ""
        variables = {'BASE_VALUE': float(base_val), 'QTY': float(m)}
        formula = concept.formula
        
        if context is None:
            context = self._build_eval_context()

        if concept.computation_method == PayrollConcept.ComputationMethod.FIXED_AMOUNT:
            # Tasa de cambio según la moneda del concepto
            rate = self._get_exchange_rate_value(concept.currency)
            # Monto base = Valor Base * Multiplicador * Tasa
            base_amount = base_val * m * rate
            
            # NUEVO: Evaluar fórmula de ajuste si existe
            adjustment = Decimal('0.00')
            adjustment_trace = ""
            if concept.formula:
                try:
                    # Inyectar variables especiales para el ajuste
                    context['VALOR_BASE'] = float(base_val)
                    context['CANTIDAD'] = float(m)
                    context['TASA'] = float(rate)
                    context['MONTO_CALCULADO'] = float(base_amount)
                    
                    adjustment_result = simple_eval(
                        concept.formula,
                        names=context,
                        functions=self._get_allowed_functions()
                    )
                    adjustment = Decimal(str(adjustment_result)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    adjustment_breakdown = self._get_formula_breakdown(concept.formula, context)
                    adjustment_trace = f" + Ajuste ({adjustment_breakdown['trace']}) = {float(adjustment):.2f}"
                    variables.update(adjustment_breakdown['variables'])
                    variables['formula_adjustment'] = concept.formula
                except Exception as e:
                    print(f"Error evaluando fórmula de ajuste [{concept.code}]: {concept.formula} -> {e}")
                    adjustment_trace = f" (Error ajuste: {str(e)})"
            
            amount = (base_amount + adjustment).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            trace_parts = [f"{float(base_val):.2f}"]
            if m != 1: trace_parts.append(f"Qty: {float(m):.2f}")
            if rate != 1: trace_parts.append(f"Tasa ({concept.currency.code}): {float(rate):.4f}")
            
            trace = " * ".join(trace_parts)
            if len(trace_parts) == 1 and rate == 1 and m == 1: 
                trace += " Bs."
            else:
                trace += f" = {float(base_amount):.2f}"
            
            if adjustment != 0:
                trace += adjustment_trace
                trace += f" → Final: {float(amount):.2f}"

        elif concept.computation_method == PayrollConcept.ComputationMethod.PERCENTAGE_OF_BASIC:
            # Multiplicador no suele aplicar aquí, pero lo guardamos por integridad
            contract_rate = self._get_exchange_rate_value(self.contract.salary_currency)
            
            if concept.calculation_base == PayrollConcept.CalculationBase.BASE:
                breakdown = SalarySplitter.get_salary_breakdown(self.contract)
                salary_ves = breakdown['base'] * contract_rate
                base_name = "Sueldo Base"
            else:
                salary_ves = self.contract.monthly_salary * contract_rate
                base_name = "Salario Total"

            amount = (salary_ves * base_val * m) / Decimal('100.00')
            trace = f"({float(salary_ves):.2f} [{base_name}] * {float(base_val):.2f}%"
            if m != 1: trace += f" * Qty: {m}"
            trace += ") / 100"

        elif concept.computation_method == PayrollConcept.ComputationMethod.DYNAMIC_FORMULA:
            # Inyectar tanto el valor como la cantidad al contexto
            if override_value is not None:
                context[concept.code] = float(override_value)
            if multiplier is not None:
                context[f"{concept.code}_CANT"] = float(multiplier)
            
            if concept.formula:
                try:
                    result = simple_eval(
                        concept.formula, 
                        names=context, 
                        functions=self._get_allowed_functions()
                    )
                    amount = Decimal(str(result)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    breakdown = self._get_formula_breakdown(concept.formula, context)
                    trace = breakdown["trace"]
                    variables = breakdown["variables"]
                except Exception as e:
                    print(f"Error evaluando fórmula [{concept.code}]: {concept.formula} -> {e}")
                    trace = f"Error: {str(e)}"
            elif override_value is not None or multiplier is not None:
                # Fallback: si no hay fórmula pero hay datos, usar el valor/cantidad directo
                val = override_value if override_value is not None else concept.value
                amount = (Decimal(str(val)) * m).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                trace = f"Valor manual: {float(val):.2f} * {float(m):.2f}"

        return {
            'amount': amount,
            'trace': trace,
            'variables': variables,
            'formula': concept.formula,
            'quantity': float(m)
        }


    def _handle_salary_base(self, cc, eval_context, company, deducted_days=0):
        """
        Handler para el sueldo base. 
        Ahora soporta deducir días y su valor proporcional del monto base.
        
        Args:
            cc: Diccionario con datos del concepto (code, name, amount_ves)
            eval_context: Contexto de evaluación
            company: Instancia de Company
            deducted_days: Número de días a restar del periodo
        """
        lines = []
        total_period_days = eval_context.get('DIAS', 15)
        effective_days = max(total_period_days - deducted_days, 0)
        
        # Calcular valor diario y deducción
        base_amount = Decimal(str(cc['amount_ves']))
        daily_rate = base_amount / total_period_days if total_period_days > 0 else Decimal('0.00')
        deducted_value = daily_rate * Decimal(str(deducted_days))
        effective_amount = (base_amount - deducted_value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        trace_parts = [f"{float(base_amount):.2f} Bs. ({total_period_days} días)"]
        if deducted_days > 0:
            trace_parts.append(f"- {float(deducted_value):.2f} ({deducted_days} días deducidos)")
        trace_parts.append(f"= {float(effective_amount):.2f} ({effective_days} días efectivos)")
        
        lines.append({
            'code': 'SUELDO_BASE',
            'name': cc['name'],
            'kind': 'EARNING',
            'amount_ves': effective_amount,
            'quantity': effective_days,
            'unit': 'días',
            'tipo_recibo': 'salario',
            'trace': ' '.join(trace_parts),
            'formula': 'SALARIO_PERIOD',
            'variables': {
                'SALARIO_PERIOD': float(base_amount), 
                'DIAS_TOTALES': total_period_days,
                'DIAS_DEDUCIDOS': deducted_days,
                'DIAS_EFECTIVOS': effective_days,
                'VALOR_DEDUCIDO': float(deducted_value)
            }
        })
            
        return lines

    def _handle_law_deduction(self, code, context, sm, params, num_lunes):
        """
        Handler general para deducciones de ley.
        Soporta base de acumuladores dinámicos.
        """
        # Determinar la base de cálculo
        if params.get('base_source') == 'ACCUMULATOR':
            # Obtener del acumulador (ej: TOTAL_FAOV_BASE)
            tag = params.get('tag', code + '_BASE')
            base_salary = Decimal(str(context.get(f'TOTAL_{tag}', 0)))
        else:
            # Por defecto: Salario Base Mensual del contrato
            base_salary = params.get('fixed_base', Decimal('0.00'))

        if base_salary <= 0:
            return None

        rate = Decimal(str(params.get('rate', 0)))
        tope_multiplier = params.get('tope_sm')
        
        # Aplicar tope si existe
        if tope_multiplier:
            tope = tope_multiplier * sm
            base_calc = min(base_salary, tope)
            trace_base = f"MIN({float(base_salary):.2f}, {float(tope):.2f})"
        else:
            base_calc = base_salary
            trace_base = f"{float(base_salary):.2f}"

        amount = Decimal('0.00')
        trace = ""
        variables = {'SM': float(sm), 'BASE': float(base_salary)}

        if params.get('is_weekly'):
            # Lógica SSO/SPF: (Base * 12 / 52) * Lunes * Rate
            semanal = (base_calc * 12) / 52
            amount = (semanal * num_lunes * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            trace = f"({trace_base} * 12 / 52) * {num_lunes} Lun * {float(rate)*100}%"
            variables.update({'LUNES': num_lunes, 'RATE': float(rate)})
        else:
            # Lógica Simple: Base * Rate
            amount = (base_calc * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            trace = f"{trace_base} * {float(rate)*100}%"
            variables.update({'RATE': float(rate)})

        return {
            'code': code,
            'name': params.get('name', code),
            'kind': 'DEDUCTION',
            'amount_ves': amount,
            'quantity': num_lunes if params.get('is_weekly') else 1,
            'unit': 'lunes' if params.get('is_weekly') else 'mes',
            'trace': trace,
            'formula': params.get('formula_text', ''),
            'variables': variables
        }



    def calculate_payroll(self) -> Dict[str, Any]:
        """
        Orquesta el cálculo completo recorriendo la tabla de conceptos y 
        despachando la lógica según el campo 'behavior'.
        """
        results_lines = []
        company = Company.objects.first()
        eval_context = self._build_eval_context()
        
        # --- 0. INICIALIZACIÓN DE VARIABLES Y ACUMULADORES ---
        accumulators = {}
        all_concepts = PayrollConcept.objects.filter(active=True).order_by('receipt_order', 'id')
        
        # Pre-pobla códigos de conceptos, cantidades y acumuladores en el contexto
        for c in all_concepts:
            # 1. Los códigos de concepto inician en 0.0 (si no vienen en la entrada como novedad)
            if c.code not in eval_context:
                eval_context[c.code] = 0.0
                eval_context[f"{c.code}_CANT"] = 0.0
            else:
                # Si YA existe (vino de novedad/input), aseguramos que:
                # - CODE_CANT tenga la cantidad (input de la novedad)
                # - CODE se resetee a 0.0 para que represente el MONTO (resultado calculado)
                # 
                # IMPORTANTE: _build_eval_context ya crea ambos (CODE y CODE_CANT) con el mismo valor,
                # así que debemos forzar el reset del CODE principal aquí.
                if f"{c.code}_CANT" not in eval_context:
                    eval_context[f"{c.code}_CANT"] = eval_context[c.code]
                # Siempre reseteamos el valor principal para que sea el acumulador de monto
                eval_context[c.code] = 0.0
            
            # 2. Los acumuladores inician en 0.0
            if c.incidences:
                for tag in c.incidences:
                    accumulators[tag] = 0.0
                    eval_context[f'TOTAL_{tag}'] = 0.0

        # --- 1. PRE-CÁLCULO DE VALORES DE CONTRATO (SalarySplitter) ---
        # Obtenemos el desglose base/complemento para usarlos cuando el loop llegue a esos comportamientos
        rate = self._get_exchange_rate_value(self.contract.salary_currency)
        breakdown = SalarySplitter.get_salary_breakdown(self.contract, exchange_rate=rate)
        
        # Factor de frecuencia
        salary_factor = Decimal('1.0')
        if company:
            if company.payroll_journey == 'BIWEEKLY':
                salary_factor = Decimal('0.5')
            elif company.payroll_journey == 'WEEKLY':
                salary_factor = Decimal('7') / Decimal('30')
        
        # * PROTECCIÓN DE PRECISIÓN *
        # Si el splitter nos devolvió valores protegidos en VES, los usamos directamente.
        if 'base_ves_protected' in breakdown:
            base_ves_calc = breakdown['base_ves_protected'] * salary_factor
        else:
            base_ves_calc = (breakdown['base'] * salary_factor * rate)
            
        contract_data = {
            'base_ves': base_ves_calc.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'complement_ves': (breakdown['complement'] * salary_factor * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'monthly_base': breakdown['base'],
            'monthly_complement': breakdown['complement'],
            'salary_factor': salary_factor,
            'rate': rate
        }
        
        # * INICIALIZACIÓN DE COMPLEMENTO DINÁMICO *
        # Sembramos el valor base del contrato en el contexto para que los bonos se sumen a él
        eval_context['COMPLEMENTO_PERIOD'] = float(contract_data['complement_ves'])
        
        # * VARIABLES DE PERIODO (SOLICITUD DE USUARIO) *
        # Exponemos los valores brutos del periodo (sin deducciones) para uso en fórmulas
        eval_context['SUELDO_BASE_PERIODO'] = float(contract_data['base_ves'])
        eval_context['COMPLEMENTO_PERIODO'] = float(contract_data['complement_ves'])
        
        # Lista para registrar conceptos que se suman al complemento (para trazabilidad)
        complement_additions = []  # [(nombre, monto), ...]
        
        print(f"DEBUG ENGINE: Breakdown={breakdown}")
        print(f"DEBUG ENGINE: Rate={rate}, Factor={salary_factor}")
        print(f"DEBUG ENGINE: BaseVES={contract_data['base_ves']}, CompVES={contract_data['complement_ves']}")


        # --- 2. LOOP DE ASIGNACIONES (EARNINGS) ---
        overrides = {
            ec.concept.code: ec.override_value 
            for ec in self.contract.employee.concepts.filter(active=True)
        }

        for concept in all_concepts.filter(kind=PayrollConcept.ConceptKind.EARNING):
            # A. Identificar Valor (Novedad > Override > Fijo/Fórmula)
            # 1. Novedad (Actúa como multiplicador si es Monto Fijo, o como valor si es Fórmula)
            novelty_val = self.input_variables.get(concept.code)
            if novelty_val is None:
                for k, v in self.input_variables.items():
                    if concept.code.upper() == k.upper():
                        novelty_val = v
                        break
            
            # 2. Override del Contrato (Actúa como nuevo precio base)
            contract_override_val = overrides.get(concept.code)

            # --- FILTRADO DE CONCEPTOS GENÉRICOS ---
            if concept.behavior == PayrollConcept.ConceptBehavior.FIXED:
                if novelty_val is None and contract_override_val is None:
                    continue
            elif concept.behavior == PayrollConcept.ConceptBehavior.DYNAMIC:
                if not concept.formula and novelty_val is None and contract_override_val is None:
                    continue

            # B. Despachar Lógica por Comportamiento
            amount = Decimal('0.00')
            trace = ""
            variables = {}
            formula = concept.formula
            tipo_recibo = 'salario'

            if concept.behavior == PayrollConcept.ConceptBehavior.SALARY_BASE:
                # --- PRE-CÁLCULO DE DÍAS DEDUCIDOS ---
                deducted_days = 0
                for deductor_concept in all_concepts.filter(deducts_from_base_salary=True):
                    deductor_novelty = self.input_variables.get(deductor_concept.code)
                    if deductor_novelty is None:
                        for k, v in self.input_variables.items():
                            if deductor_concept.code.upper() == k.upper():
                                deductor_novelty = v
                                break
                    if deductor_novelty is not None:
                        deducted_days += float(deductor_novelty)
                
                # Lógica de Sueldo Base (Desglose)
                temp_cc = {
                    'code': concept.code,
                    'name': concept.name,
                    'amount_ves': contract_data['base_ves']
                }
                # SUMAR días deducidos por variaciones (VariationsEngine) a los días deducidos por novedades
                total_deducted_days = int(deducted_days) + int(self.deducted_days)
                salary_lines = self._handle_salary_base(temp_cc, eval_context, company, deducted_days=total_deducted_days)
                total_base_ves = Decimal('0.00')
                for sl in salary_lines:
                    sl['tipo_recibo'] = 'salario'
                    results_lines.append(sl)
                    total_base_ves += Decimal(str(sl['amount_ves']))
                    # Acumular cada línea desglosada
                    if concept.incidences:
                        for tag in concept.incidences:
                            accumulators[tag] += float(sl['amount_ves'])
                            eval_context[f'TOTAL_{tag}'] = accumulators[tag]
                
                # Inyectar resultado total al contexto
                eval_context[concept.code] = float(total_base_ves)
                eval_context[f"{concept.code}_CANT"] = float(eval_context.get('DIAS', 15) - deducted_days)
                continue # Ya agregamos las líneas, saltamos al siguiente concepto
            
            elif concept.behavior == PayrollConcept.ConceptBehavior.CESTATICKET:
                # Lógica de Cestaticket
                tipo_recibo = 'cestaticket'
                # Reutilizamos la lógica de cálculo de ct que estaba en _get_contract_concepts
                ct_base_amount = concept.value if concept.value > 0 else MONTO_CESTATICKET_USD
                ct_currency = concept.currency or self.contract.salary_currency
                
                if self.contract.includes_cestaticket and company:
                    ct_rate = self._get_exchange_rate_value(ct_currency)
                    if company.cestaticket_journey == 'PERIODIC':
                        amount = ct_base_amount * ct_rate * salary_factor
                    else:
                        payment_day = company.cestaticket_payment_day
                        if self.period and self.period.start_date.day <= payment_day <= self.period.end_date.day:
                            amount = ct_base_amount * ct_rate
                        elif not self.period:
                            amount = ct_base_amount * ct_rate
                    amount = amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                    trace = f"{float(ct_base_amount):.2f} {ct_currency.code} * {float(ct_rate):.4f}"
                    if salary_factor != 1 and company.cestaticket_journey == 'PERIODIC': 
                        trace += f" * {float(salary_factor):.2f}"
            
            elif concept.behavior == PayrollConcept.ConceptBehavior.COMPLEMENT:
                # Lógica de Complemento
                tipo_recibo = 'complemento'
                # * ACTUALIZACIÓN DINÁMICA *
                # Leemos del contexto acumulado en lugar del dato estático del contrato
                # Esto permite que bonos previos (adds_to_complement) inflen este monto
                dyn_base_complement = eval_context.get('COMPLEMENTO_PERIOD', contract_data['complement_ves'])
                
                amount = Decimal(str(dyn_base_complement))
                
                # Reconstruimos el trace para reflejar que es un valor compuesto con detalle
                base_complement_val = float(contract_data['complement_ves'])
                if complement_additions:
                    # Construir trace detallado: "Base (1500.00) + BONO_X (200.00) + BONO_Y (100.00) = 1800.00"
                    trace_parts = [f"Base ({base_complement_val:.2f})"]
                    for nombre, monto in complement_additions:
                        trace_parts.append(f"{nombre} ({monto:.2f})")
                    trace = " + ".join(trace_parts) + f" = {float(amount):.2f}"
                else:
                    trace = f"{float(contract_data['monthly_complement']):.2f} (Complemento) * {float(salary_factor):.2f} (Fac) * {float(rate):.2f} (Tasa)"
                
                # Agregar las variables para auditoría
                variables = {
                    'COMPLEMENTO_BASE': base_complement_val,
                    'COMPLEMENTO_TOTAL': float(amount),
                    'CONCEPTOS_SUMADOS': [{'nombre': n, 'monto': m} for n, m in complement_additions]
                }

            else:
                # Lógica General (Fórmula o Fijo)
                res = self.calculate_concept(
                    concept, 
                    override_value=contract_override_val, 
                    multiplier=novelty_val,
                    context=eval_context
                )
                amount = res['amount']
                trace = res['trace']
                formula = res['formula']
                variables = res['variables']
                
                # Determinar tipo recibo por convención si no es de sistema
                if 'TICKET' in concept.code: tipo_recibo = 'cestaticket'
                elif 'COMPLE' in concept.code and not concept.is_salary_incidence: tipo_recibo = 'complemento'
                
                # REGLA DE ORO: Si viene de una variación (Ej: Vacaciones), respetar su tipo
                if concept.code in self.novelty_metadata:
                    tipo_recibo = self.novelty_metadata[concept.code]['tipo_recibo']

            # C. Agregar Línea si corresponde
            if amount > 0 or (concept.show_even_if_zero and concept.show_on_payslip):
                line = {
                    'code': concept.code,
                    'name': concept.name,
                    'kind': concept.kind,
                    'amount_ves': amount,
                    'tipo_recibo': tipo_recibo,
                    'trace': trace,
                    'formula': formula,
                    'variables': variables
                }
                # Inyectar cantidad si hay novedad mapeada
                var_name = self.NOVELTY_MAP.get(concept.code)
                if var_name and eval_context.get(var_name):
                    line['quantity'] = eval_context[var_name]
                    line['unit'] = 'hrs' if 'HOURS' in var_name else 'días'
                
                # * OCULTAR SI SUMA AL COMPLEMENTO *
                # Si el usuario pidió que se sume al complemento y no aparezca como línea aparte
                if not getattr(concept, 'adds_to_complement', False):
                    results_lines.append(line)

                # D. Actualizar Acumuladores e inyectar al contexto para fórmulas subsecuentes
                eval_context[concept.code] = float(amount)
                
                # * SUMA AL COMPLEMENTO / BONO *
                if getattr(concept, 'adds_to_complement', False):
                    # Actualizar variables de complemento en el contexto
                    current_complement_period = eval_context.get('COMPLEMENTO_PERIOD', 0.0)
                    new_complement_period = current_complement_period + float(amount)
                    eval_context['COMPLEMENTO_PERIOD'] = new_complement_period
                    
                    # Registrar este concepto para la trazabilidad del complemento
                    complement_additions.append((concept.name, float(amount)))
                    
                    # Para mantener consistencia, también actualizamos el mensual proyectado (estimado)
                    factor = float(contract_data.get('salary_factor', 1))
                    if factor > 0:
                        projected_monthly = float(amount) / factor 
                        eval_context['COMPLEMENTO_MENSUAL'] = eval_context.get('COMPLEMENTO_MENSUAL', 0.0) + projected_monthly

                if concept.incidences:
                    for tag in concept.incidences:
                        accumulators[tag] += float(amount)
                        eval_context[f'TOTAL_{tag}'] = accumulators[tag]

        # --- 3. LOOP DE DEDUCCIONES ---
        for concept in all_concepts.filter(kind=PayrollConcept.ConceptKind.DEDUCTION):
            # A. Valor
            novelty_val = self.input_variables.get(concept.code)
            contract_override_val = overrides.get(concept.code)

            # --- FILTRADO DE CONCEPTOS GENÉRICOS ---
            if concept.behavior in [PayrollConcept.ConceptBehavior.DYNAMIC, PayrollConcept.ConceptBehavior.FIXED]:
                if novelty_val is None and contract_override_val is None:
                    continue

            amount = Decimal('0.00')
            trace = ""
            variables = {}
            formula = concept.formula

            # Lógica de Ley (SOLO si no se especificó una fórmula dinámica explícita)
            if (concept.behavior == PayrollConcept.ConceptBehavior.LAW_DEDUCTION and 
                concept.computation_method != PayrollConcept.ComputationMethod.DYNAMIC_FORMULA):
                
                # Lógica de Ley (Soporta system_params para configuración dinámica)
                sm = company.national_minimum_salary if company else FALLBACK_SALARIO_MINIMO
                num_lunes = eval_context.get('LUNES', 4)
                
                # Leer system_params del concepto (si existe)
                system_params = concept.system_params or {}
                rate_source = system_params.get('rate_source', 'CONCEPT')
                
                # Determinar la tasa de retención
                if rate_source == 'CONTRACT':
                    # Tasa desde el contrato del empleado (ej: ISLR)
                    contract_field = system_params.get('contract_field', 'islr_retention_percentage')
                    contract_rate_value = getattr(self.contract, contract_field, Decimal('0.00'))
                    rate = Decimal(str(contract_rate_value)) / 100
                else:
                    # Tasa desde el valor del concepto (ej: IVSS, FAOV, RPE)
                    rate = concept.value / 100 if concept.computation_method == PayrollConcept.ComputationMethod.DYNAMIC_FORMULA else concept.value
                
                # Determinar etiqueta de base (default: CODIGO_BASE)
                tag = system_params.get('base_label', concept.code + '_BASE')
                
                # Determinar tope en salarios mínimos
                cap_multiplier = system_params.get('cap_multiplier')
                if cap_multiplier is None:
                    # Fallback a lógica legacy para conceptos sin system_params
                    cap_multiplier = 5 if concept.code == 'IVSS' else (10 if concept.code == 'RPE' else None)
                
                # Construir params para el handler
                law_params = {
                    'rate': rate,
                    'base_source': system_params.get('base_source', 'ACCUMULATOR'),
                    'tag': tag,
                    'is_weekly': concept.code in ['IVSS', 'RPE'],
                    'tope_sm': cap_multiplier,
                    'name': concept.name
                }
                
                # Intentar calcular
                res = self._handle_law_deduction(concept.code, eval_context, sm, law_params, num_lunes)
                if res:
                    amount = res['amount_ves']
                    trace = res['trace']
                    formula = res['formula']
                    variables = res['variables']
            
            else:
                # Deducción normal
                res = self.calculate_concept(
                    concept, 
                    override_value=contract_override_val, 
                    multiplier=novelty_val,
                    context=eval_context
                )
                amount = res['amount']
                trace = res['trace']
                formula = res['formula']
                variables = res['variables']

            if amount > 0 or (concept.show_even_if_zero and concept.show_on_payslip):
                results_lines.append({
                    'code': concept.code,
                    'name': concept.name,
                    'kind': concept.kind,
                    'amount_ves': amount,
                    'tipo_recibo': 'salario',
                    'trace': trace,
                    'formula': formula,
                    'variables': variables
                })
                
                # Inyectar resultado al contexto
                eval_context[concept.code] = float(amount)
                
                # Determinar cantidad para _CANT (Preferir novedad si existe, si no 1.0)
                qty = 1.0
                var_name = self.NOVELTY_MAP.get(concept.code)
                if var_name and eval_context.get(f"{var_name}_CANT") is not None:
                    qty = eval_context[f"{var_name}_CANT"]
                elif eval_context.get(f"{concept.code}_CANT") is not None:
                    qty = eval_context[f"{concept.code}_CANT"]
                
                eval_context[f"{concept.code}_CANT"] = float(qty)

                # Acumular deducciones
                if concept.incidences:
                    for tag in concept.incidences:
                        accumulators[tag] += float(amount)
                        eval_context[f'TOTAL_{tag}'] = accumulators[tag]

        # --- 4. PRÉSTAMOS ---
        active_loans = Loan.objects.filter(employee=self.contract.employee, status=Loan.LoanStatus.Active)
        for loan in active_loans:
            if loan.balance <= 0 or not loan.installment_amount: continue
            if loan.frequency == Loan.Frequency.SECOND_FORTNIGHT and self.payment_date.day <= 15: continue

            deduction_amount = min(loan.installment_amount, loan.balance)
            amount_ves = deduction_amount
            trace_loan = f"Min({float(loan.installment_amount):.2f}, {float(loan.balance):.2f})"
            if loan.currency.code != 'VES':
                 l_rate = self._get_exchange_rate_value(loan.currency)
                 amount_ves = (deduction_amount * l_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                 trace_loan += f" * {float(l_rate):.4f} (Tasa)"

            if amount_ves > 0:
                results_lines.append({
                    'code': 'LOAN',
                    'name': f"Préstamo: {loan.description}",
                    'kind': 'DEDUCTION',
                    'amount_ves': amount_ves,
                    'tipo_recibo': 'salario',
                    'trace': trace_loan,
                    'loan_id': loan.id
                })

        # --- 5. TOTALES FINALES ---
        total_income = sum(l['amount_ves'] for l in results_lines if l['kind'] == 'EARNING')
        total_deductions = sum(l['amount_ves'] for l in results_lines if l['kind'] == 'DEDUCTION')
        net_pay_ves = total_income - total_deductions
        ref_rate = self._get_exchange_rate_value(self.contract.salary_currency)
        net_pay_usd = net_pay_ves / ref_rate if ref_rate > 0 else Decimal('0.00')

        return {
            'employee': self.contract.employee.full_name,
            'national_id': self.contract.employee.national_id,
            'position': str(self.contract.job_position or self.contract.position),
            'contract_currency': self.contract.salary_currency.code,
            'payment_date': self.payment_date.strftime('%Y-%m-%d'),
            'exchange_rate_used': ref_rate,
            'lines': results_lines,
            'totals': {
                'income_ves': total_income,
                'deductions_ves': total_deductions,
                'net_pay_ves': net_pay_ves,
                'net_pay_usd_ref': net_pay_usd
            }
        }