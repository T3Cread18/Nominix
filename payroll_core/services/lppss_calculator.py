"""
Servicio de Cálculo LPPSS — Contribución Especial de Pensiones (9%).

Ley de Protección de Pensiones (G.O. Ext. 6.806, mayo 2024):
- 9% sobre salarios + bonificaciones no salariales de cada empleado
- Piso por trabajador: IMII (Ingreso Mínimo Integral Indexado) en VES
- Declaración mensual ante SENIAT
"""
from decimal import Decimal, ROUND_HALF_UP
from datetime import date
from typing import Optional

from django.db import transaction

from payroll_core.models import (
    Employee, LaborContract, PayrollPolicy, Company,
    PayrollReceipt, PayrollReceiptLine,
)
from payroll_core.models.government_filings import LPPSSDeclaration, LPPSSDeclarationLine
from payroll_core.services.currency import get_usd_exchange_rate


class LPPSSCalculator:
    """
    Calcula y persiste la contribución LPPSS mensual.
    """
    
    @staticmethod
    def calculate_for_month(year: int, month: int, created_by: str = 'system') -> LPPSSDeclaration:
        """
        Calcula la declaración LPPSS para un mes dado.
        
        Algoritmo:
            1. Obtener todos los empleados activos
            2. Para cada empleado:
               a. Sumar salario + bonificaciones no salariales del mes
               b. Obtener piso IMII en VES = IMII_USD × tasa_BCV
               c. base = max(salario + bonos, piso_IMII)
               d. contribución = base × tasa%
            3. Totales
        
        Returns:
            LPPSSDeclaration con líneas detalladas
        """
        # Obtener configuración
        policy = PayrollPolicy.objects.select_related('company').first()
        if not policy:
            raise ValueError("No existe PayrollPolicy configurada")
        
        lppss_rate = policy.lppss_rate / Decimal('100')
        imii_usd = policy.imii_usd
        
        # Tasa BCV vigente
        exchange_rate = get_usd_exchange_rate()
        imii_ves = (imii_usd * exchange_rate).quantize(Decimal('0.01'))
        
        # Empleados activos
        employees = Employee.objects.filter(is_active=True).select_related()
        
        with transaction.atomic():
            # Crear o actualizar declaración
            declaration, created = LPPSSDeclaration.objects.update_or_create(
                year=year,
                month=month,
                defaults={
                    'imii_usd_used': imii_usd,
                    'exchange_rate_used': exchange_rate,
                    'contribution_rate': policy.lppss_rate,
                    'status': LPPSSDeclaration.DeclarationStatus.CALCULATED,
                    'created_by': created_by,
                }
            )
            
            # Limpiar líneas anteriores si existían
            declaration.lines.all().delete()
            
            total_base = Decimal('0')
            total_contribution = Decimal('0')
            line_objects = []
            
            for employee in employees:
                # Obtener salario mensual en VES
                contract = employee.contracts.filter(is_active=True).first()
                if not contract:
                    continue
                
                salary_amount = contract.monthly_salary
                currency_code = contract.salary_currency.code if contract.salary_currency else 'VES'
                
                # Convertir a VES si es USD
                if currency_code in ('USD', 'EUR'):
                    salary_ves = (salary_amount * exchange_rate).quantize(Decimal('0.01'))
                else:
                    salary_ves = salary_amount
                
                # Buscar bonificaciones no salariales del mes (cestaticket, etc.)
                bonuses_ves = LPPSSCalculator._get_non_salary_bonuses(employee, year, month, exchange_rate)
                
                # Aplicar piso IMII
                total_payment = salary_ves + bonuses_ves
                base_applied = max(total_payment, imii_ves)
                
                # Contribución
                contribution = (base_applied * lppss_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                
                line_objects.append(LPPSSDeclarationLine(
                    declaration=declaration,
                    employee=employee,
                    salary_ves=salary_ves,
                    bonuses_ves=bonuses_ves,
                    imii_floor_ves=imii_ves,
                    base_applied_ves=base_applied,
                    contribution_ves=contribution,
                ))
                
                total_base += base_applied
                total_contribution += contribution
            
            # Bulk create líneas
            LPPSSDeclarationLine.objects.bulk_create(line_objects)
            
            # Actualizar totales
            declaration.total_employees = len(line_objects)
            declaration.total_payroll_base_ves = total_base
            declaration.contribution_amount_ves = total_contribution
            declaration.save()
        
        return declaration
    
    @staticmethod
    def _get_non_salary_bonuses(employee, year: int, month: int, exchange_rate: Decimal) -> Decimal:
        """
        Obtiene bonificaciones no salariales pagadas en el mes.
        Busca en PayrollReceiptLine los conceptos tipo CESTATICKET u otros bonos.
        """
        from payroll_core.models import PayrollReceiptLine
        
        bonuses = PayrollReceiptLine.objects.filter(
            receipt__employee=employee,
            receipt__period__start_date__year=year,
            receipt__period__start_date__month=month,
            concept_behavior__in=['CESTATICKET'],
        ).values_list('amount_ves', flat=True)
        
        total = sum(b for b in bonuses if b)
        return Decimal(str(total)) if total else Decimal('0')
