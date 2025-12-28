"""
Fórmulas Legales para la Nómina Venezolana (LOTTT, IVSS, FAOV).

Este módulo contiene la lógica pura de cálculo según la legislación vigente.
"""
from decimal import Decimal, ROUND_HALF_UP
import calendar
from typing import Any, Dict

# Constante de Salario Mínimo (Placeholder)
MINIMUM_WAGE_VES = Decimal('130.00')

def count_mondays(date_obj) -> int:
    """
    Calcula cuántos lunes tiene el mes de la fecha dada.
    Vital para el cálculo de retenciones de IVSS y Paro Forzoso.
    """
    year = date_obj.year
    month = date_obj.month
    
    # calendar.monthcalendar devuelve una matriz de semanas (0 si el día no es del mes)
    # El lunes es el índice 0 por defecto
    matrix = calendar.monthcalendar(year, month)
    mondays = sum(1 for week in matrix if week[0] != 0)
    return mondays

def formula_ivss(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Cálculo de Seguro Social (IVSS).
    Tope: 5 Salarios Mínimos.
    Fórmula semanal: ((SueldoBase * 12) / 52) * 0.04 (Empleado).
    Mensual: Semanal * Nro Lunes.
    """
    rate = context.get('rate', Decimal('1.00'))
    payment_date = context.get('payment_date')
    
    # Sueldo base convertido a Bolívares
    salary_ves = contract.salary_amount * rate
    
    # Aplicar tope de 5 salarios mínimos
    limit = MINIMUM_WAGE_VES * 5
    if salary_ves > limit:
        salary_ves = limit
    
    mondays = count_mondays(payment_date)
    
    # Cálculo: (Sueldo * 12 meses / 52 semanas) * % * nro_lunes
    weekly_base = (salary_ves * 12) / 52
    amount = weekly_base * mondays * Decimal('0.04')
    
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def formula_faov(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Cálculo de FAOV (Ley de Vivienda y Hábitat).
    1% del salario base/integral sin tope.
    """
    rate = context.get('rate', Decimal('1.00'))
    salary_ves = contract.salary_amount * rate
    
    amount = salary_ves * Decimal('0.01')
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def formula_overtime(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Cálculo de Horas Extras (Art 118 LOTTT).
    Recargo del 50%.
    """
    rate = context.get('rate', Decimal('1.00'))
    input_vars = context.get('input_variables', {})
    hours = Decimal(str(input_vars.get('overtime_hours', 0)))
    
    if hours <= 0:
        return Decimal('0.00')
    
    salary_ves = contract.salary_amount * rate
    hour_value = (salary_ves / 30) / 8
    
    # Recargo de 50% = 1.5
    amount = hour_value * Decimal('1.5') * hours
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def formula_night_bonus(contract: Any, context: Dict[str, Any]) -> Decimal:
    """
    Cálculo de Bono Nocturno (Art 117 LOTTT).
    Recargo del 30% sobre el valor de la hora diurna.
    """
    rate = context.get('rate', Decimal('1.00'))
    input_vars = context.get('input_variables', {})
    hours = Decimal(str(input_vars.get('night_hours', 0)))
    
    if hours <= 0:
        return Decimal('0.00')

    salary_ves = contract.salary_amount * rate
    hour_value = (salary_ves / 30) / 8
    
    # Recargo del 30% = 0.30
    amount = hour_value * Decimal('0.30') * hours
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

# Registro de fórmulas mapeadas por código de concepto
FORMULA_REGISTRY = {
    'IVSS_VE': formula_ivss,
    'FAOV_VE': formula_faov,
    'H_EXTRA': formula_overtime,
    'B_NOCTURNO': formula_night_bonus,
}
