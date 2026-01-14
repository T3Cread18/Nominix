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
        contract_rate = self._get_exchange_rate_value(self.contract.salary_currency)
        salary_ves = float(self.contract.salary_amount * contract_rate)
        
        # Cálculo de Lunes y desglose de días por tipo
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

        context = {
            'SALARIO_MENSUAL': salary_ves,
            'SALARIO_DIARIO': salary_ves / 30,
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
        }

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
            salary_ves = self.contract.salary_amount * contract_rate
            amount = (salary_ves * base_val) / Decimal('100.00')
            trace = f"({float(salary_ves):.2f} * {float(base_val):.2f}%) / 100"

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

    def _get_contract_concepts(self) -> list:
        """
        Genera los 3 conceptos fijos derivados del contrato activo,
        respetando la frecuencia configurada en la empresa.
        """
        rate = self._get_exchange_rate_value(self.contract.salary_currency)
        company = Company.objects.first()
        
        # 1. Determinar el factor de proporción para el salario base según la jornada de la empresa
        # Si la empresa paga Quincenal (BIWEEKLY), el factor es 0.5 (15 días / 30 días)
        # Si la empresa paga Mensual (MONTHLY), el factor es 1.0 (30 días / 30 días)
        # Si la empresa paga Semanal (WEEKLY), el factor es 7/30 (~0.2333)
        
        salary_factor = Decimal('1.0')
        if company:
            if company.payroll_journey == 'BIWEEKLY':
                salary_factor = Decimal('0.5')
            elif company.payroll_journey == 'WEEKLY':
                salary_factor = Decimal('7') / Decimal('30')
        
        # =========================================================================
        # NUEVA LÓGICA CON SalarySplitter
        # =========================================================================
        
        # 1. Obtener desglose Mensual (en moneda del contrato, ej: USD)
        breakdown = SalarySplitter.get_salary_breakdown(self.contract)
        monthly_base = breakdown['base']
        monthly_complement = breakdown['complement']
        
        # 2. Aplicar Factor de Frecuencia (Proporción del periodo)
        # Ejemplo: Si es Quincenal, pagamos el 50% del mensual
        period_base_amount = monthly_base * salary_factor
        period_complement_amount = monthly_complement * salary_factor
        
        # 3. Convertir a Moneda de Pago (Bs.)
        # rate ya fue calculado al inicio de la función (Tasa de la moneda del contrato)
        sueldo_base_ves = period_base_amount * rate
        
        # 4. Lógica de Cestaticket (Se mantiene igual que la original)
        cestaticket_ves = Decimal('0.00')
        
        # Intentar obtener configuración de DB para el monto
        ct_concept = PayrollConcept.objects.filter(code='CESTATICKET').first()
        ct_base_amount = MONTO_CESTATICKET_USD
        ct_currency = self.contract.salary_currency # Default USD (asumido por MONTO_CESTATICKET_USD)
        
        if ct_concept and ct_concept.value > 0:
            ct_base_amount = ct_concept.value
            if ct_concept.currency:
                ct_currency = ct_concept.currency
            elif ct_concept.currency_code: # Fallback
                ct_currency = Currency.objects.filter(code=ct_concept.currency_code).first() or ct_currency

        if self.contract.includes_cestaticket and company:
            # Calcular la tasa para la moneda del concepto (puede ser diferente a la del contrato)
            ct_rate = self._get_exchange_rate_value(ct_currency)
            
            if company.cestaticket_journey == 'PERIODIC':
                # Se paga proporcional según la frecuencia de la nómina
                cestaticket_ves = ct_base_amount * ct_rate * salary_factor
            else:
                # Se paga en una fecha específica (MENSUAL)
                # Solo se incluye si el periodo actual contiene el día de pago configurado
                payment_day = company.cestaticket_payment_day
                if self.period and self.period.start_date.day <= payment_day <= self.period.end_date.day:
                    cestaticket_ves = ct_base_amount * ct_rate
                elif not self.period:
                    # Si es simulación sin periodo, asumimos el pago completo para que el usuario lo vea
                    cestaticket_ves = ct_base_amount * ct_rate
        
        # 5. Calcular Complemento Final en Bs.
        # El complemento calculado por Splitter también se convierte y ajusta
        # Nota: El cálculo original restaba Cestaticket del "Total Package". 
        # Dependiendo de la estrategia (PERCENTAGE del SALARIO INTEGRAL), el Cestaticket es APARTE.
        # Asumiremos que el "Total Salary" del contrato NO INCLUYE Cestaticket (es Salario + Bono).
        # Si la estrategia del cliente es que el Cestaticket se reste del Bono, lo hacemos aquí.
        # Pero SalarySplitter dividió el "SalaryAmount".
        
        complemento_ves = period_complement_amount * rate
        
        # Redondeo final
        sueldo_base_ves = sueldo_base_ves.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        cestaticket_ves = cestaticket_ves.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        complemento_ves = complemento_ves.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        concepts = []
        
        # 1. DÍAS TRABAJADOS (Sueldo Base)
        if not company or company.show_base_salary:
            st = f"{float(monthly_base):.2f} {self.contract.salary_currency.code} (Base) * {float(salary_factor):.2f} (Factor) * {float(rate):.2f} (Tasa)"
            concepts.append({
                'code': 'SUELDO_BASE',
                'name': 'Días Trabajados',
                'kind': 'EARNING',
                'amount_ves': sueldo_base_ves,
                'trace': st
            })

        # 2. CESTATICKET
        if not company or company.show_tickets:
             st = f"{float(ct_base_amount):.2f} {ct_currency.code} * {float(ct_rate):.4f}"
             if salary_factor != 1: st += f" * {float(salary_factor):.2f}"
             concepts.append({
                'code': 'CESTATICKET',
                'name': 'Cestaticket',
                'kind': 'EARNING',
                'amount_ves': cestaticket_ves,
                'trace': st
            })

        # 3. COMPLEMENTO
        if not company or company.show_supplement:
            st = f"{float(monthly_complement):.2f} (Comp. Men) * {float(salary_factor):.2f} (Fac) * {float(rate):.2f} (Tasa)"
            concepts.append({
                'code': 'COMPLEMENTO',
                'name': 'Complemento Salarial',
                'kind': 'EARNING',
                'amount_ves': complemento_ves,
                'trace': st
            })
        
        return concepts

    def _get_law_deductions(self, total_income_ves: Decimal) -> list:
        """
        Calcula las deducciones de ley venezolana (IVSS, FAOV, PIE/RPE)
        siguiendo las reglas de topes y base semanal.
        """
        sueldo_base_mensual = Decimal(str(self.contract.base_salary_bs or 0))
        
        # Obtener Salario Mínimo de la configuración de la empresa
        company = Company.objects.first()
        sm = company.national_minimum_salary if company else FALLBACK_SALARIO_MINIMO
        
        if sueldo_base_mensual <= 0:
            return []

        # 1. Contar Lunes del periodo (Misma lógica que eval_context)
        num_lunes = 0
        if self.period:
            curr = self.period.start_date
            while curr <= self.period.end_date:
                if curr.weekday() == 0: num_lunes += 1
                curr += timedelta(days=1)
        else:
            # Fallback 4 semanas si no hay periodo (simulación)
            num_lunes = 4

        # 2. IVSS (Tope 5 SM)
        tope_ivss = 5 * sm
        base_ivss = min(sueldo_base_mensual, tope_ivss)
        semanal_ivss = (base_ivss * 12) / 52
        ivss_ves = (semanal_ivss * num_lunes * Decimal('0.04')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        trace_ivss = f"({float(base_ivss):.2f} * 12 / 52) * {num_lunes} Lun * 4%"

        # 3. RPE / Paro Forzoso (Tope 10 SM)
        tope_rpe = 10 * sm
        base_rpe = min(sueldo_base_mensual, tope_rpe)
        semanal_rpe = (base_rpe * 12) / 52
        rpe_ves = (semanal_rpe * num_lunes * Decimal('0.005')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        trace_rpe = f"({float(base_rpe):.2f} * 12 / 52) * {num_lunes} Lun * 0.5%"

        # 4. FAOV (1% sobre Total Integral - Sin tope)
        faov_ves = (total_income_ves * Decimal('0.01')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        trace_faov = f"{float(total_income_ves):.2f} * 1%"

        return [
            {
                'code': 'IVSS', 
                'name': f'Seguro Social IVSS (4% - {num_lunes} Lun)', 
                'kind': 'DEDUCTION', 
                'amount_ves': ivss_ves, 
                'quantity': num_lunes, 
                'unit': 'lunes', 
                'trace': trace_ivss,
                'formula': '(MIN(SUELDO_MENSUAL, TOPE) * 12 / 52) * LUNES * 0.04',
                'variables': {'SUELDO_MENSUAL': float(sueldo_base_mensual), 'TOPE': float(tope_ivss), 'LUNES': num_lunes}
            },
            {
                'code': 'PIE', 
                'name': f'Paro Forzoso RPE (0.5% - {num_lunes} Lun)', 
                'kind': 'DEDUCTION', 
                'amount_ves': rpe_ves, 
                'quantity': num_lunes, 
                'unit': 'lunes', 
                'trace': trace_rpe,
                'formula': '(MIN(SUELDO_MENSUAL, TOPE) * 12 / 52) * LUNES * 0.005',
                'variables': {'SUELDO_MENSUAL': float(sueldo_base_mensual), 'TOPE': float(tope_rpe), 'LUNES': num_lunes}
            },
            {
                'code': 'FAOV', 
                'name': 'Bono Vivienda FAOV (1%)', 
                'kind': 'DEDUCTION', 
                'amount_ves': faov_ves, 
                'quantity': 1, 
                'unit': 'mes', 
                'trace': trace_faov,
                'formula': 'TOTAL_INTEGRAL * 0.01',
                'variables': {'TOTAL_INTEGRAL': float(total_income_ves)}
            }
        ]

    def calculate_payroll(self) -> Dict[str, Any]:
        """Orquesta el cálculo completo incluyendo conceptos del contrato y de ley."""
        results_lines = []
        total_income = Decimal('0.00')
        integral_income = Decimal('0.00') # Base para deducciones de ley (Salario Integral)
        total_deductions = Decimal('0.00')

        # 1. Inyectar conceptos del contrato (Asignaciones fijos)
        contract_concepts = self._get_contract_concepts()
        eval_context = self._build_eval_context()
        
        # Cargar configuración de Conceptos de Sistema (Sueldo, Cestaticket, Complemento)
        system_codes = ['SUELDO_BASE', 'CESTATICKET', 'COMPLEMENTO']
        system_concepts_map = {c.code: c for c in PayrollConcept.objects.filter(code__in=system_codes)}

        for cc in contract_concepts:
            # Verificar configuración en DB
            db_concept = system_concepts_map.get(cc['code'])
            
            # 1. Chequeo de visibilidad
            if db_concept and not db_concept.show_on_payslip:
                continue
                
            # 2. Override de Nombre (Personalización)
            if db_concept:
                cc['name'] = db_concept.name

            if cc['kind'] == 'EARNING' and cc['amount_ves'] > 0:
                # Determinamos tipo de recibo
                tipo = 'salario'
                is_integral = True
                
                if cc['code'] == 'CESTATICKET':
                    tipo = 'cestaticket'
                    is_integral = False
                elif cc['code'] == 'COMPLEMENTO':
                    tipo = 'complemento'
                    is_integral = False

                # LÓGICA ESPECIAL: Desglosar SUELDO_BASE si el usuario lo requiere
                if cc['code'] == 'SUELDO_BASE':
                    total_days = eval_context.get('DIAS', 15)
                    amount_per_day = cc['amount_ves'] / Decimal(str(total_days))

                    # Calculamos los días que NO son descanso/feriado para que el Sueldo Base sea el remanente
                    sun_days = eval_context.get('DIAS_DOMINGO', 0)
                    hol_days = eval_context.get('DIAS_FERIADO', 0)
                    sat_days = eval_context.get('DIAS_SABADO', 0) 
                    
                    # Días trabajados = Total - (Descansos y Feriados reportados)
                    work_days = total_days - sun_days - hol_days - sat_days
                    
                    if work_days > 0:
                        results_lines.append({
                            'code': 'SUELDO_BASE',
                            'name': cc['name'],
                            'kind': 'EARNING',
                            'amount_ves': (amount_per_day * Decimal(str(work_days))).quantize(Decimal('0.01')),
                            'quantity': work_days,
                            'unit': 'días',
                            'tipo_recibo': 'salario',
                            'trace': f"({float(cc['amount_ves']):.2f} / {total_days}) * {work_days} Días Trab.",
                            'formula': '(QUINCENA / DIAS_TOTALES) * (DIAS - DESC - FER)',
                            'variables': {'QUINCENA': float(cc['amount_ves']), 'DIAS_TOTALES': total_days, 'DIAS_TRAB': work_days}
                        })
                    
                    # 2. Días Descanso (Sábados)
                    sat_days = eval_context.get('DIAS_SABADO', 0)
                    if sat_days > 0:
                        results_lines.append({
                            'code': 'DIAS_DESCANSO',
                            'name': 'Días Descanso Trabajados',
                            'kind': 'EARNING',
                            'amount_ves': (amount_per_day * Decimal(str(sat_days))).quantize(Decimal('0.01')),
                            'quantity': sat_days,
                            'unit': 'días',
                            'tipo_recibo': 'salario',
                            'trace': f"({float(cc['amount_ves']):.2f} / {total_days}) * {sat_days} Sábados",
                            'formula': '(QUINCENA / DIAS_TOTALES) * DIAS_SABADO',
                            'variables': {'QUINCENA': float(cc['amount_ves']), 'DIAS_TOTALES': total_days, 'DIAS_SABADO': sat_days}
                        })

                    # 3. Días Domingo
                    sun_days = eval_context.get('DIAS_DOMINGO', 0)
                    if sun_days > 0:
                        results_lines.append({
                            'code': 'DIAS_DOMINGO',
                            'name': 'Días de Descanso (Domingo)',
                            'kind': 'EARNING',
                            'amount_ves': (amount_per_day * Decimal(str(sun_days))).quantize(Decimal('0.01')),
                            'quantity': sun_days,
                            'unit': 'días',
                            'tipo_recibo': 'salario',
                            'trace': f"({float(cc['amount_ves']):.2f} / {total_days}) * {sun_days} Dom",
                            'formula': '(QUINCENA / DIAS_TOTALES) * DIAS_DOMINGO',
                            'variables': {'QUINCENA': float(cc['amount_ves']), 'DIAS_TOTALES': total_days, 'DIAS_DOMINGO': sun_days}
                        })

                    # 4. Días Feriados
                    hol_days = eval_context.get('DIAS_FERIADO', 0)
                    if hol_days > 0:
                        results_lines.append({
                            'code': 'DIAS_FERIADO',
                            'name': 'Días Feriados',
                            'kind': 'EARNING',
                            'amount_ves': (amount_per_day * Decimal(str(hol_days))).quantize(Decimal('0.01')),
                            'quantity': hol_days,
                            'unit': 'días',
                            'tipo_recibo': 'salario',
                            'trace': f"({float(cc['amount_ves']):.2f} / {total_days}) * {hol_days} Fer",
                            'formula': '(QUINCENA / DIAS_TOTALES) * DIAS_FERIADO',
                            'variables': {'QUINCENA': float(cc['amount_ves']), 'DIAS_TOTALES': total_days, 'DIAS_FERIADO': hol_days}
                        })
                    
                    integral_income += cc['amount_ves']
                else:
                    results_lines.append({
                        'code': cc['code'],
                        'name': cc['name'],
                        'kind': cc['kind'],
                        'amount_ves': cc['amount_ves'],
                        'tipo_recibo': tipo,
                        'trace': cc.get('trace', ''),
                        'formula': cc.get('formula', ''),
                        'variables': cc.get('variables', {})
                    })
                    if is_integral:
                        integral_income += cc['amount_ves']
                
                total_income += cc['amount_ves']

        # 2. Procesar conceptos dinámicos de ASIGNACIÓN
        all_concepts = PayrollConcept.objects.filter(active=True).order_by('id')
        
        # Excluir códigos procesados manualmente en el desglose de Sueldo Base
        contract_codes = {cc['code'] for cc in contract_concepts}
        contract_codes.update(['DIAS_DESCANSO', 'DIAS_DOMINGO', 'DIAS_FERIADO', 'DIAS_FERIADOS'])
        overrides = {
            ec.concept.code: ec.override_value 
            for ec in self.contract.employee.concepts.filter(active=True)
        }

        for concept in all_concepts.filter(kind='EARNING'):
            if concept.code in contract_codes:
                continue

            # Prioridad: Novedad Manual > Valor Fijo Empleado
            # Buscar por código exacto del concepto
            override_val = self.input_variables.get(concept.code)
            
            # Si no se encuentra, buscar por nombre de variable mapeada (alias reverso)
            if override_val is None:
                # Buscar si alguna key de input_variables mapea a este concepto
                for input_key, input_val in self.input_variables.items():
                    mapped_var = self.NOVELTY_MAP.get(input_key.upper(), input_key.upper())
                    # Si el código del concepto coincide con el input_key o con el mapped_var
                    if concept.code.upper() == input_key.upper() or concept.code.upper() == mapped_var:
                        override_val = input_val
                        break
            
            # Si NO es novedad, pero tiene un valor fijo configurado para el empleado
            if override_val is None:
                override_val = overrides.get(concept.code)
            
            # Si NO es novedad AND no debe mostrarse si es 0, omitir
            if override_val is None and not concept.show_on_payslip:
                continue
                
            calc_res = self.calculate_concept(concept, override_value=override_val, context=eval_context)
            amount = calc_res['amount']
            trace = calc_res['trace']
            
            if amount > 0:
                # Determinar tipo de recibo para dinámicos
                tipo = 'salario'
                if concept.code == 'CESTATICKET' or 'TICKET' in concept.code:
                    tipo = 'cestaticket'
                elif concept.code == 'COMPLEMENTO' or ('COMPLE' in concept.code and not concept.is_salary_incidence):
                    tipo = 'complemento'

                line = {
                    'code': concept.code,
                    'name': concept.name,
                    'kind': concept.kind,
                    'amount_ves': amount,
                    'tipo_recibo': tipo,
                    'trace': trace,
                    'formula': calc_res.get('formula', ''),
                    'variables': calc_res.get('variables', {})
                }
                
                # Inyectar cantidad...
                var_name = self.NOVELTY_MAP.get(concept.code)
                if var_name and eval_context.get(var_name):
                    line['quantity'] = eval_context[var_name]
                    line['unit'] = 'hrs' if 'HOURS' in var_name else 'días'
                
                results_lines.append(line)
                total_income += amount
                if concept.is_salary_incidence:
                    integral_income += amount

        # 3. Inyectar deducciones de ley (USANDO integral_income)
        law_concepts_config = {
            c.code: c.show_on_payslip 
            for c in PayrollConcept.objects.filter(code__in=['IVSS', 'PIE', 'FAOV', 'RPE'])
        }

        law_deductions = self._get_law_deductions(integral_income)
        for ld in law_deductions:
            is_visible = law_concepts_config.get(ld['code'], True)
            if ld['amount_ves'] > 0 and is_visible:
                ld['tipo_recibo'] = 'salario'
                results_lines.append(ld)
                total_deductions += ld['amount_ves']

        # 3.1 Procesar Préstamos y Anticipos (Cuentas por Cobrar)
        # Buscamos préstamos activos para este empleado
        from .models.loans import Loan
        active_loans = Loan.objects.filter(employee=self.contract.employee, status=Loan.LoanStatus.Active)
        
        for loan in active_loans:
            if loan.balance <= 0 or not loan.installment_amount:
                continue
                
            # Verificar frecuencia
            # Si es 2ND_Q, solo cobramos si es la 2da quincena (día > 15) o fin de mes
            if loan.frequency == Loan.Frequency.SECOND_FORTNIGHT:
                if self.payment_date.day <= 15:
                    continue

            # Determinar monto a descontar: Min(Cuota, Saldo Restante)
            deduction_amount = min(loan.installment_amount, loan.balance)
            
            # Conversión de Moneda si el préstamo es en USD
            amount_ves = deduction_amount
            trace_loan = f"Min({float(loan.installment_amount):.2f}, {float(loan.balance):.2f})"
            if loan.currency.code != 'VES':
                 rate = self._get_exchange_rate_value(loan.currency)
                 amount_ves = (deduction_amount * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                 trace_loan += f" * {float(rate):.4f} (Tasa)"

            if amount_ves > 0:
                results_lines.append({
                    'code': 'LOAN',
                    'name': f"Préstamo: {loan.description}",
                    'kind': 'DEDUCTION',
                    'amount_ves': amount_ves,
                    'loan_id': loan.id,
                    'tipo_recibo': 'salario',
                    'trace': trace_loan,
                    'formula': 'MIN(CUOTA, SALDO) * TASA',
                    'variables': {'CUOTA': float(loan.installment_amount), 'SALDO': float(loan.balance), 'TASA': float(rate if loan.currency.code != 'VES' else 1)}
                })
                total_deductions += amount_ves

        # 4. Procesar conceptos dinámicos de DEDUCCIÓN
        # Evitar duplicados con las deducciones de ley ya calculadas
        law_codes = {ld['code'] for ld in law_deductions}
        law_codes.update({'IVSS_VE', 'RPE_VE', 'FAOV_VE', 'PIE_VE', 'SSO', 'SPF', 'LPH'})
        
        for concept in all_concepts.filter(kind='DEDUCTION'):
            if concept.code in contract_codes or concept.code in law_codes:
                continue
            
            # Prioridad: Novedad Manual > Valor Fijo Empleado
            override_val = self.input_variables.get(concept.code)
            
            if override_val is None:
                override_val = overrides.get(concept.code)

            if override_val is None and not concept.show_on_payslip:
                continue
                
            calc_res = self.calculate_concept(concept, override_value=override_val, context=eval_context)
            amount = calc_res['amount']
            trace = calc_res['trace']
            
            if amount > 0:
                results_lines.append({
                    'code': concept.code,
                    'name': concept.name,
                    'kind': concept.kind,
                    'amount_ves': amount,
                    'tipo_recibo': 'salario',
                    'trace': trace,
                    'formula': calc_res.get('formula', ''),
                    'variables': calc_res.get('variables', {})
                })
                total_deductions += amount

        # Recalcular totales reales basados en las líneas finales para consistencia absoluta
        total_income = sum(l['amount_ves'] for l in results_lines if l['kind'] == 'EARNING')
        total_deductions = sum(l['amount_ves'] for l in results_lines if l['kind'] == 'DEDUCTION')
        
        net_pay_ves = total_income - total_deductions
        ref_rate = self._get_exchange_rate_value(self.contract.salary_currency)
        net_pay_usd = net_pay_ves / ref_rate if ref_rate > 0 else Decimal('0.00')

        return {
            'employee': self.contract.employee.full_name,
            'national_id': self.contract.employee.national_id,
            'position': self.contract.position,
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