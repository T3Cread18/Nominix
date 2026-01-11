from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any, Optional

def calculate_payroll_concepts(
    start_date: date,
    end_date: date,
    daily_salary: Decimal,
    holidays_list: List[date],
    rest_days_schema: List[int],
    worked_sundays: int = 0,
    worked_rest_days: int = 0
) -> Dict[str, Any]:
    """
    Desglosa automáticamente los días de una quincena en conceptos de nómina.
    
    Reglas de Jerarquía:
    1. Feriado (Incluye Domingos y fechas en holidays_list)
    2. Descanso (Días en rest_days_schema que no son feriados)
    3. Trabajado (Días restantes)
    """
    
    total_days = (end_date - start_date).days + 1
    
    qty_holidays = 0
    qty_rest_days = 0
    qty_worked_days = 0
    
    current_date = start_date
    while current_date <= end_date:
        # PRIORIDAD 1: FERIADO (Domingo o Lista)
        is_sunday = current_date.weekday() == 6
        if is_sunday or (current_date in holidays_list):
            qty_holidays += 1
        
        # PRIORIDAD 2: DESCANSO
        elif current_date.weekday() in rest_days_schema:
            qty_rest_days += 1
            
        # PRIORIDAD 3: TRABAJADO
        else:
            qty_worked_days += 1
            
        current_date += timedelta(days=1)
    
    # VALIDACIÓN DE INTEGRIDAD
    assert qty_holidays + qty_rest_days + qty_worked_days == total_days, "La suma de días no coincide con el periodo"
    
    # CÁLCULOS DE MONTOS
    # Días Trabajados y Feriados se pagan al Salario Diario Base
    total_worked = qty_worked_days * daily_salary
    total_holidays = qty_holidays * daily_salary
    
    # Días de Descanso se pagan al Salario Promedio
    # Fórmula: (Días Trabajados * Salario Diario) / Total Días
    # Nota: Según el ejemplo, 'Días Trabajados' en la fórmula incluye Feriados (días que generaron ingreso base).
    income_for_average = (qty_worked_days + qty_holidays) * daily_salary
    if total_days > 0:
        rest_rate = (income_for_average / Decimal(str(total_days))).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
    else:
        rest_rate = Decimal('0.00')
        
    total_rest = qty_rest_days * rest_rate
    
    # CONSTRUCCIÓN DE LA RESPUESTA
    response = {
        "period_total_days": total_days,
        "concepts": [
            {
                "code": "WORKED_DAYS",
                "name": "Días Trabajados",
                "quantity": qty_worked_days,
                "rate": float(daily_salary.quantize(Decimal('0.01'))),
                "total": float(total_worked.quantize(Decimal('0.01')))
            },
            {
                "code": "REST_DAYS",
                "name": "Días de Descanso",
                "quantity": qty_rest_days,
                "rate": float(rest_rate),
                "total": float(total_rest.quantize(Decimal('0.01')))
            },
            {
                "code": "HOLIDAYS",
                "name": "Días Feriados",
                "quantity": qty_holidays,
                "rate": float(daily_salary.quantize(Decimal('0.01'))),
                "total": float(total_holidays.quantize(Decimal('0.01')))
            }
        ],
        "manual_concepts_metadata": {
            "allows_worked_sunday": True,
            "allows_worked_rest_day": True,
            "input_worked_sundays": worked_sundays,
            "input_worked_rest_days": worked_rest_days
        }
    }
    
    return response

if __name__ == "__main__":
    # Prueba rápida con el ejemplo del usuario
    from datetime import date
    try:
        res = calculate_payroll_concepts(
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 15),
            daily_salary=Decimal('50.00'),
            holidays_list=[date(2025, 1, 1)], # Año Nuevo
            rest_days_schema=[5], # Sábados (Domingo es auto-feriado)
        )
        import json
        print(json.dumps(res, indent=2, ensure_ascii=False))
    except Exception as e:
        print(f"Error en prueba: {e}")
