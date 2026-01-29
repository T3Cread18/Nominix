from datetime import date, timedelta
from typing import List, Dict, Tuple, Any
from django.db.models import Q
from ..models.variations import EmployeeVariation
from ..models.payroll import PayrollPeriod

class VariationsEngine:
    """
    Motor de cálculo para el módulo de variaciones.
    Encargado de validar solapamientos y calcular el impacto en nómina (días a descontar, novedades a generar).
    """

    @staticmethod
    def validate_overlap(employee, start_date: date, end_date: date, exclude_id=None):
        """
        Verifica si el ragon de fechas choca con alguna variación existente.
        Lanza ValueError si hay solapamiento.
        """
        qs = EmployeeVariation.objects.filter(
            employee=employee,
            start_date__lte=end_date,
            end_date__gte=start_date
        )
        
        if exclude_id:
            qs = qs.exclude(id=exclude_id)
            
        if qs.exists():
            conflict = qs.first()
            raise ValueError(f"Conflicto de fechas con variación existente: {conflict.cause.name} ({conflict.start_date} - {conflict.end_date})")

    @staticmethod
    def calculate_period_impact(employee, period_start: date, period_end: date) -> Dict[str, Any]:
        """
        Calcula cómo las variaciones afectan este periodo de nómina.
        
        Returns:
            {
                'deducted_days': int,  # Días a restar del sueldo base (por causas no remuneradas o que descuentan)
                'novelties': List[Dict] # Lista de novedades a inyectar (concept_code, amount, tipo_recibo)
            }
        """
        variations = EmployeeVariation.objects.filter(
            employee=employee,
            start_date__lte=period_end,
            end_date__gte=period_start
        ).select_related('cause')

        deducted_days = 0
        novelties = []

        for var in variations:
            # Calcular intersección de fechas con el periodo
            # Max(inicio_periodo, inicio_var)
            effective_start = max(period_start, var.start_date)
            # Min(fin_periodo, fin_var)
            effective_end = min(period_end, var.end_date)
            
            # Días efectivos en este periodo
            days_in_period = (effective_end - effective_start).days + 1
            
            if days_in_period <= 0:
                continue

            # 1. Deducción de Salario Base
            if var.cause.affects_salary_days:
                deducted_days += days_in_period

            # 2. Generación de Concepto de Pago (Novedad)
            if var.cause.pay_concept_code:
                # Determinar tipo de recibo
                tipo_recibo = 'salario'
                if var.cause.category == 'VACATION':
                    tipo_recibo = 'vacaciones'
                
                novelties.append({
                    'concept_code': var.cause.pay_concept_code,
                    'amount': days_in_period,
                    'tipo_recibo': tipo_recibo,
                    'notes': f"Variación: {var.cause.name} ({effective_start} - {effective_end})"
                })
                
        return {
            'deducted_days': deducted_days,
            'novelties': novelties
        }
