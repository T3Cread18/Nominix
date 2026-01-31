"""
Servicio de Cálculo y Gestión de Vacaciones.

Proporciona lógica para:
- Calcular días de vacaciones según antigüedad (LOTTT)
- Generar saldos anuales automáticamente
- Consumir días al asignar variaciones de vacaciones
"""
from datetime import date, timedelta
from typing import Dict, Optional, List
from django.db import transaction
from django.core.exceptions import ValidationError

from ..models import (
    Employee, 
    LaborContract, 
    VacationBalance,
    EmployeeVariation,
    VariationCause
)
from ..models.organization import PayrollPolicy, Company


class VacationCalculator:
    """
    Calculadora de vacaciones según LOTTT Venezuela.
    
    Reglas:
    - Después de 1 año de servicio: 15 días hábiles de vacaciones
    - +1 día adicional por cada año de servicio adicional
    - Máximo: 30 días de vacaciones
    - Bono vacacional: mismas reglas que días de vacaciones
    """
    
    @staticmethod
    def get_policy() -> Optional[PayrollPolicy]:
        """Obtiene la política de nómina de la empresa."""
        company = Company.objects.first()
        if company and hasattr(company, 'policy'):
            return company.policy
        return None
    
    @staticmethod
    def calculate_entitled_days(seniority_years: int, policy: Optional[PayrollPolicy] = None) -> Dict[str, int]:
        """
        Calcula los días de vacaciones y bono según antigüedad.
        
        Args:
            seniority_years: Años de antigüedad del empleado
            policy: Política de vacaciones (si no se proporciona, se usa la de la empresa)
            
        Returns:
            Dict con vacation_days y bonus_days
        """
        if policy is None:
            policy = VacationCalculator.get_policy()
        
        # Defaults según LOTTT si no hay política
        base_days = getattr(policy, 'vacation_days_base', 15) if policy else 15
        days_per_year = getattr(policy, 'vacation_days_per_year', 1) if policy else 1
        max_days = getattr(policy, 'vacation_days_max', 30) if policy else 30
        
        bonus_base = getattr(policy, 'vacation_bonus_days_base', 15) if policy else 15
        bonus_per_year = getattr(policy, 'vacation_bonus_days_per_year', 1) if policy else 1
        bonus_max = getattr(policy, 'vacation_bonus_days_max', 30) if policy else 30
        
        # Cálculo según fórmula LOTTT
        vacation_days = min(
            base_days + max(seniority_years - 1, 0) * days_per_year,
            max_days
        )
        
        bonus_days = min(
            bonus_base + max(seniority_years - 1, 0) * bonus_per_year,
            bonus_max
        )
        
        return {
            'vacation_days': int(vacation_days),
            'bonus_days': int(bonus_days),
            'seniority_years': seniority_years
        }
    
    @staticmethod
    def generate_annual_balance(employee: Employee, service_year: Optional[int] = None) -> VacationBalance:
        """
        Genera el saldo de vacaciones para un año de servicio específico.
        
        Args:
            employee: Empleado para el cual generar el saldo
            service_year: Año de servicio (si no se proporciona, se calcula automáticamente)
            
        Returns:
            VacationBalance creado o existente
        """
        # Obtener contrato activo
        contract = employee.contracts.filter(is_active=True).first()
        if not contract:
            raise ValidationError(f"El empleado {employee} no tiene un contrato activo.")
        
        # Determinar año de servicio
        if service_year is None:
            service_year = employee.seniority_years
            if service_year < 1:
                raise ValidationError(
                    f"El empleado {employee} no ha cumplido 1 año de servicio. "
                    f"Antigüedad actual: {employee.seniority_days} días."
                )
        
        # Verificar si ya existe
        existing = VacationBalance.objects.filter(
            employee=employee,
            service_year=service_year
        ).first()
        
        if existing:
            return existing
        
        # Calcular fechas del periodo
        hire_date = employee.hire_date
        period_start = hire_date + timedelta(days=365 * (service_year - 1))
        period_end = hire_date + timedelta(days=365 * service_year - 1)
        
        # Calcular días correspondientes
        entitled = VacationCalculator.calculate_entitled_days(service_year)
        
        # Crear registro
        balance = VacationBalance.objects.create(
            employee=employee,
            contract=contract,
            service_year=service_year,
            period_start=period_start,
            period_end=period_end,
            entitled_vacation_days=entitled['vacation_days'],
            entitled_bonus_days=entitled['bonus_days']
        )
        
        return balance
    
    @staticmethod
    def get_employee_balances(employee: Employee) -> List[VacationBalance]:
        """Obtiene todos los saldos de vacaciones de un empleado ordenados."""
        return list(VacationBalance.objects.filter(employee=employee).order_by('-service_year'))
    
    @staticmethod
    def get_available_days(employee: Employee) -> int:
        """Obtiene el total de días de vacaciones disponibles del empleado."""
        balances = VacationBalance.objects.filter(employee=employee)
        return sum(b.remaining_days for b in balances)
    
    @staticmethod
    @transaction.atomic
    def consume_days_from_variation(variation: EmployeeVariation) -> Dict[str, any]:
        """
        Consume días de vacaciones del saldo más antiguo disponible.
        
        Esta función debe llamarse cuando se crea una EmployeeVariation
        de tipo VACATION para actualizar los saldos automáticamente.
        
        Args:
            variation: La variación de vacaciones creada
            
        Returns:
            Dict con información del consumo realizado
        """
        if variation.cause.category != VariationCause.Category.VACATION:
            return {'consumed': 0, 'message': 'No es una variación de vacaciones'}
        
        days_to_consume = variation.duration_days
        employee = variation.employee
        
        # Obtener saldos con días disponibles ordenados del más antiguo al más reciente
        balances = VacationBalance.objects.filter(
            employee=employee,
            used_vacation_days__lt=models.F('entitled_vacation_days')
        ).order_by('service_year')
        
        consumed_from = []
        remaining = days_to_consume
        
        for balance in balances:
            if remaining <= 0:
                break
            
            can_consume = balance.remaining_days
            to_consume = min(remaining, can_consume)
            
            if to_consume > 0:
                balance.used_vacation_days += to_consume
                balance.save(update_fields=['used_vacation_days', 'updated_at'])
                consumed_from.append({
                    'year': balance.service_year,
                    'days': to_consume,
                    'remaining': balance.remaining_days
                })
                remaining -= to_consume
        
        if remaining > 0:
            # No había suficientes días en saldos existentes
            return {
                'consumed': days_to_consume - remaining,
                'deficit': remaining,
                'details': consumed_from,
                'warning': f'Déficit de {remaining} días. Se recomienda generar saldos pendientes.'
            }
        
        return {
            'consumed': days_to_consume,
            'details': consumed_from,
            'success': True
        }
    
    @staticmethod
    def generate_missing_balances(employee: Employee) -> List[VacationBalance]:
        """
        Genera saldos faltantes para todos los años de servicio completados.
        
        Útil para empleados que ya tienen antigüedad pero no se habían
        generado sus saldos de vacaciones.
        
        Returns:
            Lista de VacationBalance creados
        """
        created = []
        seniority = employee.seniority_years
        
        for year in range(1, seniority + 1):
            try:
                balance = VacationCalculator.generate_annual_balance(employee, service_year=year)
                if balance._state.adding is False:  # Si fue recién creado
                    created.append(balance)
            except ValidationError:
                continue
        
        return created
