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
    Company
)

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
        
        # Cálculo de Lunes en el periodo (Base legal IVSS/RPE)
        mondays = 0
        if self.period:
            curr = self.period.start_date
            while curr <= self.period.end_date:
                if curr.weekday() == 0: # 0 = Lunes
                    mondays += 1
                curr += timedelta(days=1)
        else:
            # Fallback para simulación (lunes del mes de la fecha de pago)
            import calendar
            curr_month = self.payment_date.month
            curr_year = self.payment_date.year
            _, last_day = calendar.monthrange(curr_year, curr_month)
            for d in range(1, last_day + 1):
                if date(curr_year, curr_month, d).weekday() == 0:
                    mondays += 1
        
        # Obtener Salario Mínimo y Jornada de la configuración de la empresa
        company = Company.objects.first()
        min_salary = company.national_minimum_salary if company else FALLBACK_SALARIO_MINIMO
        
        # 3. Determinar días del periodo
        days_in_period = 15
        if company:
            if company.payroll_journey == 'BIWEEKLY': days_in_period = 15
            elif company.payroll_journey == 'MONTHLY': days_in_period = 30
            elif company.payroll_journey == 'WEEKLY': days_in_period = 7

        if self.period:
            delta = (self.period.end_date - self.period.start_date).days + 1
            # Si el delta es cercano a la configuración, usamos la configuración (ej: 13-16 días => 15)
            # para mantener la estandarización de 30 días comerciales.
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
            'LUNES': mondays,
            
            # Defaults para evitar errores si no se cargan estas novedades
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
        }

        for key, val in self.input_variables.items():
            u_key = key.upper()
            context[u_key] = float(val)
            if u_key in self.NOVELTY_MAP:
                context[self.NOVELTY_MAP[u_key]] = float(val)

        return context

    def calculate_concept(self, concept: PayrollConcept, override_value=None, context=None) -> Decimal:
        
        base_val = override_value if override_value is not None else concept.value
        
        if concept.computation_method == PayrollConcept.ComputationMethod.FIXED_AMOUNT:
            rate = self._get_exchange_rate_value(concept.currency)
            return base_val * rate

        elif concept.computation_method == PayrollConcept.ComputationMethod.PERCENTAGE_OF_BASIC:
            contract_rate = self._get_exchange_rate_value(self.contract.salary_currency)
            salary_ves = self.contract.salary_amount * contract_rate
            return (salary_ves * base_val) / Decimal('100.00')

        elif concept.computation_method == PayrollConcept.ComputationMethod.DYNAMIC_FORMULA:
            if not concept.formula: return Decimal('0.00')
            
            if context is None:
                context = self._build_eval_context()
            
            try:
                # CORRECCIÓN PRINCIPAL AQUÍ:
                # Pasamos 'names' (variables) y 'functions' (min, max) por separado
                result = simple_eval(
                    concept.formula, 
                    names=context, 
                    functions=self._get_allowed_functions() # <--- INYECCIÓN DE FUNCIONES
                )
                
                return Decimal(str(result)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            except Exception as e:
                print(f"Error evaluando fórmula [{concept.code}]: {concept.formula} -> {e}")
                return Decimal('0.00')

        return Decimal('0.00')

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
        
        # Valores del contrato proporcionados
        base_salary_bs = Decimal(str(self.contract.base_salary_bs or 0)) * salary_factor
        total_package_usd = (self.contract.salary_amount or Decimal('0')) * salary_factor
        
        sueldo_base_ves = base_salary_bs
        
        # 2. Cestaticket (Lógica especial)
        cestaticket_ves = Decimal('0.00')
        if self.contract.includes_cestaticket and company:
            if company.cestaticket_journey == 'PERIODIC':
                # Se paga proporcional según la frecuencia de la nómina
                cestaticket_ves = MONTO_CESTATICKET_USD * rate * salary_factor
            else:
                # Se paga en una fecha específica (MENSUAL)
                # Solo se incluye si el periodo actual contiene el día de pago configurado
                payment_day = company.cestaticket_payment_day
                if self.period and self.period.start_date.day <= payment_day <= self.period.end_date.day:
                    cestaticket_ves = MONTO_CESTATICKET_USD * rate
                elif not self.period:
                    # Si es simulación sin periodo, asumimos el pago completo para que el usuario lo vea
                    cestaticket_ves = MONTO_CESTATICKET_USD * rate
        
        # Complemento = (Total USD * Tasa) - Sueldo Base - Cestaticket
        total_package_ves = total_package_usd * rate
        complemento_ves = total_package_ves - sueldo_base_ves - cestaticket_ves
        if complemento_ves < 0:
            complemento_ves = Decimal('0.00')
        
        # Redondeo final
        sueldo_base_ves = sueldo_base_ves.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        cestaticket_ves = cestaticket_ves.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        complemento_ves = complemento_ves.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return [
            {
                'code': 'SUELDO_BASE',
                'name': 'Sueldo Base',
                'kind': 'EARNING',
                'amount_ves': sueldo_base_ves,
            },
            {
                'code': 'CESTATICKET',
                'name': 'Cestaticket',
                'kind': 'EARNING',
                'amount_ves': cestaticket_ves,
            },
            {
                'code': 'COMPLEMENTO',
                'name': 'Complemento Salarial',
                'kind': 'EARNING',
                'amount_ves': complemento_ves,
            }
        ]

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

        # 3. RPE / Paro Forzoso (Tope 10 SM)
        tope_rpe = 10 * sm
        base_rpe = min(sueldo_base_mensual, tope_rpe)
        semanal_rpe = (base_rpe * 12) / 52
        rpe_ves = (semanal_rpe * num_lunes * Decimal('0.005')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # 4. FAOV (1% sobre Total Integral - Sin tope)
        faov_ves = (total_income_ves * Decimal('0.01')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        return [
            {'code': 'IVSS', 'name': f'Seguro Social IVSS (4% - {num_lunes} Lun)', 'kind': 'DEDUCTION', 'amount_ves': ivss_ves},
            {'code': 'PIE', 'name': f'Paro Forzoso RPE (0.5% - {num_lunes} Lun)', 'kind': 'DEDUCTION', 'amount_ves': rpe_ves},
            {'code': 'FAOV', 'name': 'Bono Vivienda FAOV (1%)', 'kind': 'DEDUCTION', 'amount_ves': faov_ves}
        ]

    def calculate_payroll(self) -> Dict[str, Any]:
        """Orquesta el cálculo completo incluyendo conceptos del contrato y de ley."""
        results_lines = []
        total_income = Decimal('0.00')
        total_deductions = Decimal('0.00')

        # 1. Inyectar conceptos del contrato (Asignaciones fijos)
        contract_concepts = self._get_contract_concepts()
        eval_context = self._build_eval_context()
        
        for cc in contract_concepts:
            if cc['kind'] == 'EARNING' and cc['amount_ves'] > 0:
                # Agregar metadata de cantidad para el sueldo base
                if cc['code'] == 'SUELDO_BASE':
                    cc['quantity'] = eval_context.get('DIAS', 0)
                    cc['unit'] = 'días'
                results_lines.append(cc)
                total_income += cc['amount_ves']

        # 2. Procesar conceptos dinámicos de ASIGNACIÓN primero
        eval_context = self._build_eval_context()
        all_concepts = PayrollConcept.objects.filter(active=True).order_by('id')
        
        # Evitar duplicados con los ya procesados
        contract_codes = {cc['code'] for cc in contract_concepts}
        
        overrides = {
            ec.concept.code: ec.override_value 
            for ec in self.contract.employee.concepts.filter(active=True)
        }

        # Primero EARNINGS para tener la base del FAOV
        for concept in all_concepts.filter(kind='EARNING'):
            if concept.code in contract_codes:
                continue
                
            override_val = overrides.get(concept.code)
            amount = self.calculate_concept(concept, override_value=override_val, context=eval_context)
            
            if amount > 0:
                line = {
                    'code': concept.code,
                    'name': concept.name,
                    'kind': concept.kind,
                    'amount_ves': amount
                }
                
                # Inyectar cantidad si el concepto mapea a una novedad
                var_name = self.NOVELTY_MAP.get(concept.code)
                if var_name and eval_context.get(var_name):
                    line['quantity'] = eval_context[var_name]
                    line['unit'] = 'hrs' if 'HOURS' in var_name else 'días'
                
                results_lines.append(line)
                total_income += amount

        # 3. Inyectar deducciones de ley (Ahora con total_income para FAOV)
        law_deductions = self._get_law_deductions(total_income)
        for ld in law_deductions:
            if ld['amount_ves'] > 0:
                results_lines.append(ld)
                total_deductions += ld['amount_ves']

        # 4. Procesar conceptos dinámicos de DEDUCCIÓN
        # Evitar duplicados con las deducciones de ley ya calculadas
        law_codes = {ld['code'] for ld in law_deductions}
        law_codes.update({'IVSS_VE', 'RPE_VE', 'FAOV_VE', 'PIE_VE', 'SSO', 'SPF', 'LPH'})
        
        for concept in all_concepts.filter(kind='DEDUCTION'):
            if concept.code in contract_codes or concept.code in law_codes:
                continue
                
            override_val = overrides.get(concept.code)
            amount = self.calculate_concept(concept, override_value=override_val, context=eval_context)
            
            if amount > 0:
                results_lines.append({
                    'code': concept.code,
                    'name': concept.name,
                    'kind': concept.kind,
                    'amount_ves': amount
                })
                total_deductions += amount

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