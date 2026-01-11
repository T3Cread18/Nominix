"""
Servicios relacionados con gestión de empleados.
"""
from decimal import Decimal
from datetime import date
from typing import Optional, Tuple
from django.db.models import QuerySet
from django.utils import timezone

from ..models import Employee, LaborContract
from .currency import SalaryConverter, CurrencyNotFoundError, ExchangeRateNotFoundError


class EmployeeService:
    """
    Servicio para operaciones relacionadas con empleados.
    
    Proporciona métodos para consultas comunes y operaciones
    de negocio sobre empleados.
    """
    
    @staticmethod
    def get_active_employees() -> QuerySet[Employee]:
        """
        Obtiene todos los empleados activos.
        
        Returns:
            QuerySet[Employee]: Empleados activos ordenados por apellido
        """
        return Employee.objects.filter(is_active=True).order_by('last_name', 'first_name')
    
    @staticmethod
    def get_employees_by_seniority(min_years: int = 0) -> QuerySet[Employee]:
        """
        Obtiene empleados con antigüedad mínima.
        
        Args:
            min_years: Años mínimos de antigüedad
        
        Returns:
            QuerySet[Employee]: Empleados que cumplen el criterio
        """
        cutoff_date = timezone.now().date() - timezone.timedelta(days=min_years * 365)
        return Employee.objects.filter(
            is_active=True,
            hire_date__lte=cutoff_date
        ).order_by('hire_date')
    
    @staticmethod
    def get_employee_current_contract(employee: Employee) -> Optional[LaborContract]:
        """
        Obtiene el contrato vigente de un empleado.
        
        Args:
            employee: Empleado a consultar
        
        Returns:
            Optional[LaborContract]: Contrato vigente o None
        """
        return employee.contracts.filter(is_active=True).first()
    
    @staticmethod
    def calculate_total_payroll(
        target_date: date,
        source: str = 'BCV'
    ) -> Tuple[Decimal, int]:
        """
        Calcula el total de nómina en moneda local.
        
        Args:
            target_date: Fecha para la conversión de tasas
            source: Fuente de la tasa de cambio
        
        Returns:
            Tuple[Decimal, int]: Total en VES y cantidad de empleados
        """
        total: Decimal = Decimal('0.00')
        employee_count: int = 0
        
        active_contracts = LaborContract.objects.filter(is_active=True)
        
        for contract in active_contracts:
            try:
                salary_ves = SalaryConverter.convert_contract_salary(
                    contract=contract,
                    target_date=target_date,
                    source=source
                )
                total += salary_ves
                employee_count += 1
            except (CurrencyNotFoundError, ExchangeRateNotFoundError):
                # Log error pero continuar con los demás
                continue
        
        return total, employee_count
