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
        if input_variables is not None:
            self.input_variables = input_variables
        else:
            self.input_variables = self._load_novelties_from_db()

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
            'SALARIO_DIARIO': {
                'description': 'Salario mensual dividido entre 30 días',
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
            'FALTAS': {
                'description': 'Cantidad de faltas injustificadas reportadas',
                'category': 'Novedades/Ausencias',
                'example': 1
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
        """
        # Contexto base para que la validación no falle por variables faltantes
        context = {k: v['example'] for k, v in PayrollEngine.get_variable_inventory().items()}
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

            # Validation based on internal mapped name
            if internal_key == 'DIAS_SABADO':
                if numeric_val > saturdays_calendar:
                    print(f"⚠️ Alerta: Intentando ingresar {numeric_val} sábados, pero el calendario solo tiene {saturdays_calendar}. Ajustando al máximo.")
                    numeric_val = float(saturdays_calendar)
            elif internal_key == 'DIAS_DOMINGO':
                if numeric_val > sundays_calendar:
                    print(f"⚠️ Alerta: Intentando ingresar {numeric_val} domingos, pero el calendario solo tiene {sundays_calendar}. Ajustando al máximo.")
                    numeric_val = float(sundays_calendar)
            elif internal_key == 'DIAS_FERIADO':
                if numeric_val > holidays_calendar:
                    print(f"⚠️ Alerta: Intentando ingresar {numeric_val} feriados, pero el calendario solo tiene {holidays_calendar}. Ajustando al máximo.")
                    numeric_val = float(holidays_calendar)

            context[internal_key] = numeric_val
            # Also keep it under original key if different
            if u_key != internal_key:
                context[u_key] = numeric_val
            
            # Legacy mapping for formulas
            if u_key in self.NOVELTY_MAP:
                context[self.NOVELTY_MAP[u_key]] = numeric_val

        return context

    def calculate_concept(self, concept: PayrollConcept, override_value=None, context=None) -> Dict[str, Any]:
        
        base_val = override_value if override_value is not None else concept.value
        amount = Decimal('0.00')
        trace = ""
        variables = {}
        formula = concept.formula
        
        if context is None:
            context = self._build_eval_context()

        if concept.computation_method == PayrollConcept.ComputationMethod.FIXED_AMOUNT:
            rate = self._get_exchange_rate_value(concept.currency)
            amount = base_val * rate
            if rate != 1:
                trace = f"{float(base_val):.2f} {concept.currency.code} * {float(rate):.4f}"
            else:
                trace = f"{float(base_val):.2f} Bs."

        elif concept.computation_method == PayrollConcept.ComputationMethod.PERCENTAGE_OF_BASIC:
            contract_rate = self._get_exchange_rate_value(self.contract.salary_currency)
            
            # Determinar qué base usar según la configuración del concepto
            if concept.calculation_base == PayrollConcept.CalculationBase.BASE:
                breakdown = SalarySplitter.get_salary_breakdown(self.contract)
                salary_ves = breakdown['base'] * contract_rate
                base_name = "Sueldo Base"
            else:
                salary_ves = self.contract.monthly_salary * contract_rate
                base_name = "Salario Total"

            amount = (salary_ves * base_val) / Decimal('100.00')
            trace = f"({float(salary_ves):.2f} [{base_name}] * {float(base_val):.2f}%) / 100"

        elif concept.computation_method == PayrollConcept.ComputationMethod.DYNAMIC_FORMULA:
            # Si hay un override_value (novedad), inyectarlo al contexto bajo el código del concepto
            # Esto permite que fórmulas como "BONO_X * 2" usen el valor de la novedad BONO_X
            if override_value is not None:
                context[concept.code] = float(override_value)
            
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
            elif override_value is not None:
                # Si no hay fórmula pero hay override, usar el valor directo
                amount = Decimal(str(override_value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                trace = f"Valor manual: {float(override_value):.2f}"

        return {
            'amount': amount,
            'trace': trace,
            'variables': variables,
            'formula': concept.formula
        }


    def _handle_salary_base(self, cc, eval_context, company):
        """
        Handler para el sueldo base. 
        Asegura que el sueldo base se reporte por los días completos del periodo (15/30)
        sin restar descansos o feriados, los cuales se calculan como conceptos aditivos.
        """
        lines = []
        total_days = eval_context.get('DIAS', 15)
        
        # El Sueldo Base siempre representa la totalidad del periodo asignado (concept_data['base_ves'])
        # No restamos nada para evitar modificar el monto principal.
        lines.append({
            'code': 'SUELDO_BASE',
            'name': cc['name'],
            'kind': 'EARNING',
            'amount_ves': cc['amount_ves'],
            'quantity': total_days,
            'unit': 'días',
            'tipo_recibo': 'salario',
            'trace': f"{float(cc['amount_ves']):.2f} Bs. (Total {total_days} días)",
            'formula': 'SALARIO_PERIOD',
            'variables': {'SALARIO_PERIOD': float(cc['amount_ves']), 'DIAS': total_days}
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
        
        # --- 0. INICIALIZACIÓN DE ACUMULADORES DINÁMICOS ---
        accumulators = {}
        all_concepts = PayrollConcept.objects.filter(active=True).order_by('receipt_order', 'id')
        
        # Pre-poblar acumuladores basados en el inventario de la tabla
        for c in all_concepts:
            if c.incidences:
                for tag in c.incidences:
                    accumulators[tag] = 0.0
                    eval_context[f'TOTAL_{tag}'] = 0.0

        # --- 1. PRE-CÁLCULO DE VALORES DE CONTRATO (SalarySplitter) ---
        # Obtenemos el desglose base/complemento para usarlos cuando el loop llegue a esos comportamientos
        breakdown = SalarySplitter.get_salary_breakdown(self.contract)
        
        # Factor de frecuencia
        salary_factor = Decimal('1.0')
        if company:
            if company.payroll_journey == 'BIWEEKLY':
                salary_factor = Decimal('0.5')
            elif company.payroll_journey == 'WEEKLY':
                salary_factor = Decimal('7') / Decimal('30')
        
        rate = self._get_exchange_rate_value(self.contract.salary_currency)
        
        contract_data = {
            'base_ves': (breakdown['base'] * salary_factor * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'complement_ves': (breakdown['complement'] * salary_factor * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            'monthly_base': breakdown['base'],
            'monthly_complement': breakdown['complement'],
            'salary_factor': salary_factor,
            'rate': rate
        }

        # --- 2. LOOP DE ASIGNACIONES (EARNINGS) ---
        overrides = {
            ec.concept.code: ec.override_value 
            for ec in self.contract.employee.concepts.filter(active=True)
        }

        for concept in all_concepts.filter(kind=PayrollConcept.ConceptKind.EARNING):
            # A. Identificar Valor (Novedad > Override > Fijo/Fórmula)
            override_val = self.input_variables.get(concept.code)
            if override_val is None:
                for k, v in self.input_variables.items():
                    if concept.code.upper() == k.upper():
                        override_val = v
                        break
            if override_val is None:
                override_val = overrides.get(concept.code)

            # B. Despachar Lógica por Comportamiento
            amount = Decimal('0.00')
            trace = ""
            variables = {}
            formula = concept.formula
            tipo_recibo = 'salario'

            if concept.behavior == PayrollConcept.ConceptBehavior.SALARY_BASE:
                # Lógica de Sueldo Base (Desglose)
                temp_cc = {
                    'code': concept.code,
                    'name': concept.name,
                    'amount_ves': contract_data['base_ves']
                }
                salary_lines = self._handle_salary_base(temp_cc, eval_context, company)
                for sl in salary_lines:
                    sl['tipo_recibo'] = 'salario'
                    results_lines.append(sl)
                    # Acumular cada línea desglosada
                    if concept.incidences:
                        for tag in concept.incidences:
                            accumulators[tag] += float(sl['amount_ves'])
                            eval_context[f'TOTAL_{tag}'] = accumulators[tag]
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
                amount = contract_data['complement_ves']
                trace = f"{float(contract_data['monthly_complement']):.2f} (Base) * {float(salary_factor):.2f} (Fac) * {float(rate):.2f} (Tasa)"

            else:
                # Lógica General (Fórmula o Fijo)
                res = self.calculate_concept(concept, override_value=override_val, context=eval_context)
                amount = res['amount']
                trace = res['trace']
                formula = res['formula']
                variables = res['variables']
                
                # Determinar tipo recibo por convención si no es de sistema
                if 'TICKET' in concept.code: tipo_recibo = 'cestaticket'
                elif 'COMPLE' in concept.code and not concept.is_salary_incidence: tipo_recibo = 'complemento'

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
                
                results_lines.append(line)

                # D. Actualizar Acumuladores
                if concept.incidences:
                    for tag in concept.incidences:
                        accumulators[tag] += float(amount)
                        eval_context[f'TOTAL_{tag}'] = accumulators[tag]

        # --- 3. LOOP DE DEDUCCIONES ---
        for concept in all_concepts.filter(kind=PayrollConcept.ConceptKind.DEDUCTION):
            # A. Valor
            override_val = self.input_variables.get(concept.code)
            if override_val is None:
                override_val = overrides.get(concept.code)

            amount = Decimal('0.00')
            trace = ""
            variables = {}
            formula = concept.formula

            if concept.behavior == PayrollConcept.ConceptBehavior.LAW_DEDUCTION:
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
                res = self.calculate_concept(concept, override_value=override_val, context=eval_context)
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