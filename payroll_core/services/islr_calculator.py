"""
Servicio de Retención ISLR — Impuesto Sobre la Renta.

Calcula la retención mensual de ISLR para empleados bajo relación de dependencia
según la tabla progresiva de tramos del SENIAT.

Normativa:
- Decreto 1.808 (Reglamento Parcial de la Ley de ISLR en materia de retenciones)
- Art. 31 LISLR: Enriquecimiento neto de asalariados
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Tuple

from django.db import transaction

from payroll_core.models import Employee, PayrollPolicy
from payroll_core.models.government_filings import ISLRRetentionTable, ISLRRetention
from payroll_core.services.currency import get_usd_exchange_rate


class ISLRCalculator:
    """
    Motor de retención ISLR para empleados.
    
    Usa la tabla progresiva de tramos en UT:
    1. Convierte ingreso mensual a UT
    2. Proyecta ingreso anual
    3. Aplica tabla progresiva con sustraendo
    4. Divide retención anual entre 12 meses restantes
    """
    
    @staticmethod
    def calculate_monthly_retention(
        employee: Employee,
        year: int,
        month: int,
        taxable_income_ves: Decimal,
        created_by: str = 'system'
    ) -> ISLRRetention:
        """
        Calcula y persiste la retención ISLR de un empleado para un mes.
        
        Args:
            employee: Empleado
            year: Año fiscal
            month: Mes (1-12)
            taxable_income_ves: Ingreso gravable del mes en VES
            created_by: Usuario
        
        Returns:
            ISLRRetention con el monto retenido
        """
        policy = PayrollPolicy.objects.first()
        if not policy:
            raise ValueError("No existe PayrollPolicy configurada")
        
        ut_value = policy.ut_value_ves
        if ut_value <= 0:
            raise ValueError("Valor de UT no configurado en PayrollPolicy")
        
        # Obtener tramos vigentes
        brackets = ISLRRetentionTable.objects.filter(
            year=year,
            is_active=True
        ).order_by('income_from_ut')
        
        if not brackets.exists():
            # Sin tabla = sin retención
            return ISLRCalculator._persist_retention(
                employee, year, month,
                taxable_income_ves, Decimal('0'), Decimal('0'), ut_value,
                created_by
            )
        
        # Obtener acumulado del año hasta el mes anterior
        accumulated = ISLRRetention.objects.filter(
            employee=employee,
            year=year,
            month__lt=month
        ).order_by('-month').first()
        
        prev_accumulated_income = accumulated.accumulated_income_ves if accumulated else Decimal('0')
        prev_accumulated_retention = accumulated.accumulated_retention_ves if accumulated else Decimal('0')
        
        # Nuevo acumulado
        new_accumulated_income = prev_accumulated_income + taxable_income_ves
        
        # Proyectar ingreso anual
        months_remaining = 12 - month + 1
        projected_annual_income = new_accumulated_income + (taxable_income_ves * (months_remaining - 1))
        
        # Convertir a UT
        annual_income_ut = projected_annual_income / ut_value
        
        # Aplicar tabla progresiva
        annual_retention_ut = Decimal('0')
        rate_applied = Decimal('0')
        
        for bracket in brackets:
            if annual_income_ut >= bracket.income_from_ut:
                if bracket.income_to_ut is None or annual_income_ut <= bracket.income_to_ut:
                    annual_retention_ut = (annual_income_ut * bracket.rate / 100) - bracket.subtrahend
                    rate_applied = bracket.rate
                    break
        
        # Convertir retención anual de UT a VES
        annual_retention_ves = max(Decimal('0'), annual_retention_ut * ut_value)
        
        # Retención del mes = (retención anual - ya retenido) / meses restantes
        monthly_retention = max(
            Decimal('0'),
            ((annual_retention_ves - prev_accumulated_retention) / months_remaining)
        ).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        return ISLRCalculator._persist_retention(
            employee, year, month,
            taxable_income_ves, monthly_retention, rate_applied, ut_value,
            created_by,
            accumulated_income=new_accumulated_income,
            accumulated_retention=prev_accumulated_retention + monthly_retention
        )
    
    @staticmethod
    def _persist_retention(
        employee, year, month,
        taxable_income_ves, retention_amount_ves, rate_applied, ut_value,
        created_by,
        accumulated_income=None, accumulated_retention=None
    ) -> ISLRRetention:
        """Persiste o actualiza la retención ISLR."""
        retention, _ = ISLRRetention.objects.update_or_create(
            employee=employee,
            year=year,
            month=month,
            defaults={
                'taxable_income_ves': taxable_income_ves,
                'retention_amount_ves': retention_amount_ves,
                'accumulated_income_ves': accumulated_income or taxable_income_ves,
                'accumulated_retention_ves': accumulated_retention or retention_amount_ves,
                'rate_applied': rate_applied,
                'ut_value_used': ut_value,
            }
        )
        return retention
    
    @staticmethod
    def calculate_batch(year: int, month: int, created_by: str = 'system'):
        """
        Calcula la retención ISLR para todos los empleados activos en un mes.
        
        Returns:
            Lista de ISLRRetention creadas
        """
        employees = Employee.objects.filter(is_active=True)
        exchange_rate = get_usd_exchange_rate()
        results = []
        
        for employee in employees:
            contract = employee.contracts.filter(is_active=True).first()
            if not contract:
                continue
            
            # Obtener ingreso gravable del mes en VES
            salary = contract.monthly_salary
            currency_code = getattr(contract.salary_currency, 'code', 'VES')
            
            if currency_code in ('USD', 'EUR'):
                taxable_income_ves = (salary * exchange_rate).quantize(Decimal('0.01'))
            else:
                taxable_income_ves = salary
            
            # Solo retener si tiene porcentaje ISLR > 0 o existe tabla
            if contract.islr_retention_percentage > 0 or ISLRRetentionTable.objects.filter(
                year=year, is_active=True
            ).exists():
                retention = ISLRCalculator.calculate_monthly_retention(
                    employee=employee,
                    year=year,
                    month=month,
                    taxable_income_ves=taxable_income_ves,
                    created_by=created_by,
                )
                results.append(retention)
        
        return results
