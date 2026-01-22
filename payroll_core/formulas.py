"""
Fórmulas Legales para la Nómina Venezolana (LOTTT, IVSS, FAOV, RPE, ISLR).

Este módulo contiene la lógica pura de cálculo.
Está diseñado para trabajar con los modelos: LaborContract, PayrollPeriod y PayrollNovelty.
"""
from decimal import Decimal, ROUND_HALF_UP
import calendar
from typing import Any, Dict

# Constante de configuración (Podría venir de un modelo SystemConfig en el futuro)
MINIMUM_WAGE_VES = Decimal('130.00')

def _get_salary_in_ves(contract: Any, rate: Decimal) -> Decimal:
    """
    Normaliza el salario a Bolívares basándose en el modelo LaborContract y Currency.
    """
    amount = contract.salary_amount
    
    # Accedemos a la relación ForeignKey 'salary_currency' definida en LaborContract
    # Se recomienda usar select_related('salary_currency') en el Engine para evitar N+1 queries
    currency_code = contract.salary_currency.code
    
    if currency_code == 'USD' or currency_code == 'EUR':
        return amount * rate
        
    return amount

def count_mondays(date_obj) -> int:
    """Calcula cuántos lunes tiene el mes de la fecha de pago."""
    if not date_obj:
        return 4 # Fallback
    matrix = calendar.monthcalendar(date_obj.year, date_obj.month)
    return sum(1 for week in matrix if week[0] != 0)

# ==========================================
# 1. SALARIO BASE (ASIGNACIÓN PRINCIPAL)
# ==========================================
def formula_basic_salary(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Calcula el sueldo base del periodo.
    Utiliza: LaborContract.salary_amount y PayrollPeriod.start/end_date.
    """
    rate = context.get('rate', Decimal('1.00'))
    period = context.get('period') # Instancia del modelo PayrollPeriod
    
    salary_ves = _get_salary_in_ves(contract, rate)
    
    # Determinar días a pagar usando las fechas del modelo PayrollPeriod
    days_to_pay = 15 # Default
    
    if period:
        # Cálculo de días inclusivo (end - start + 1)
        delta = (period.end_date - period.start_date).days + 1
        
        # Ajuste para nómina comercial venezolana (30 días/mes)
        if delta >= 28: 
            days_to_pay = 30
        elif delta >= 13: 
            days_to_pay = 15
        else: 
            days_to_pay = delta

    # Base diaria (LOTTT Art 113: Salario Mensual / 30)
    daily_salary = salary_ves / Decimal('30')
    total = daily_salary * Decimal(days_to_pay)
    
    return total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# ==========================================
# 2. DEDUCCIONES DE LEY (IVSS, RPE, FAOV)
# ==========================================

def formula_ivss(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Seguro Social Obligatorio (IVSS) - 4%.
    Tope: 5 Salarios Mínimos.
    """
    rate = context.get('rate', Decimal('1.00'))
    payment_date = context.get('payment_date')
    
    salary_ves = _get_salary_in_ves(contract, rate)
    
    limit = MINIMUM_WAGE_VES * 5
    base_salary = min(salary_ves, limit)
    
    mondays = count_mondays(payment_date)
    weekly_base = (base_salary * 12) / 52
    
    amount = weekly_base * mondays * Decimal('0.04')
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def formula_rpe(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Régimen Prestacional de Empleo (Paro Forzoso) - 0.5%.
    """
    rate = context.get('rate', Decimal('1.00'))
    payment_date = context.get('payment_date')
    
    salary_ves = _get_salary_in_ves(contract, rate)
    
    limit = MINIMUM_WAGE_VES * 5
    base_salary = min(salary_ves, limit)
    
    mondays = count_mondays(payment_date)
    weekly_base = (base_salary * 12) / 52
    
    amount = weekly_base * mondays * Decimal('0.005')
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def formula_faov(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    FAOV (Vivienda y Hábitat) - 1%.
    """
    rate = context.get('rate', Decimal('1.00'))
    salary_ves = _get_salary_in_ves(contract, rate)
    
    amount = salary_ves * Decimal('0.01')
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# ==========================================
# 3. NOVEDADES (ASOCIADAS A PAYROLLNOVELTY)
# ==========================================

def formula_overtime(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Horas Extra (Art 118 LOTTT). Recargo 50%.
    Lee 'overtime_hours' inyectado desde PayrollNovelty(concept_code='H_EXTRA').
    """
    rate = context.get('rate', Decimal('1.00'))
    input_vars = context.get('input_variables', {})
    
    # El Engine debe mapear PayrollNovelty 'H_EXTRA' -> 'overtime_hours'
    hours = Decimal(str(input_vars.get('overtime_hours', 0)))
    
    if hours <= 0: return Decimal('0.00')
    
    salary_ves = _get_salary_in_ves(contract, rate)
    
    # Asumimos jornada diurna de 8 horas (contract.work_schedule podría parsearse aquí)
    daily_hours = Decimal('8') 
    
    hour_value = (salary_ves / 30) / daily_hours
    
    # Base + 50% = 1.5
    amount = hour_value * Decimal('1.5') * hours
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def formula_night_bonus(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Bono Nocturno (Art 117 LOTTT). Recargo 30%.
    Lee 'night_hours' inyectado desde PayrollNovelty(concept_code='B_NOCTURNO').
    """
    rate = context.get('rate', Decimal('1.00'))
    input_vars = context.get('input_variables', {})
    
    hours = Decimal(str(input_vars.get('night_hours', 0)))
    
    if hours <= 0: return Decimal('0.00')

    salary_ves = _get_salary_in_ves(contract, rate)
    
    daily_hours = Decimal('8')
    hour_value = (salary_ves / 30) / daily_hours
    
    # Solo el recargo: 30% = 0.30
    amount = hour_value * Decimal('1.5')
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# ==========================================
# REGISTRO GLOBAL
# ==========================================
# Las claves aquí deben coincidir con PayrollConcept.computation_method = 'FORMULA'
# y el PayrollConcept.code correspondiente.
FORMULA_REGISTRY = {
    'SUELDO_BASE': formula_basic_salary,
    'IVSS_VE': formula_ivss,
    'RPE_VE': formula_rpe,
    'FAOV_VE': formula_faov,
    'H_EXTRA': formula_overtime,
    'B_NOCTURNO': formula_night_bonus,
}