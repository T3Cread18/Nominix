"""
Servicio de Cálculo INCES — Contribución Patronal 2%.

INCES (Instituto Nacional de Capacitación y Educación Socialista):
- Patronal: 2% sobre nómina total del trimestre
- Empleado: 0.5% sobre utilidades (se calcula de forma separada)
- Declaración trimestral
"""
from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction

from payroll_core.models import PayrollPolicy, PayrollReceipt
from payroll_core.models.government_filings import INCESDeclaration
from payroll_core.services.currency import get_usd_exchange_rate


class INCESCalculator:
    """
    Calcula la contribución patronal INCES del trimestre.
    """
    
    # Mapping de trimestre a meses
    QUARTER_MONTHS = {
        1: (1, 2, 3),
        2: (4, 5, 6),
        3: (7, 8, 9),
        4: (10, 11, 12),
    }
    
    @staticmethod
    def calculate_for_quarter(year: int, quarter: int, created_by: str = 'system') -> INCESDeclaration:
        """
        Calcula la declaración INCES para un trimestre.
        
        Algoritmo:
            1. Sumar todos los NetPay de recibos del trimestre (en VES)
            2. Aplicar tasa patronal (2%)
        
        Args:
            year: Año fiscal
            quarter: Trimestre (1-4)
        
        Returns:
            INCESDeclaration con totales
        """
        if quarter not in INCESCalculator.QUARTER_MONTHS:
            raise ValueError(f"Trimestre inválido: {quarter}. Debe ser 1-4.")
        
        policy = PayrollPolicy.objects.first()
        if not policy:
            raise ValueError("No existe PayrollPolicy configurada")
        
        employer_rate = policy.inces_employer_rate / Decimal('100')
        months = INCESCalculator.QUARTER_MONTHS[quarter]
        
        # Sumar nómina total del trimestre
        # Usar PayrollReceipt.net_pay como base
        receipts = PayrollReceipt.objects.filter(
            period__start_date__year=year,
            period__start_date__month__in=months,
        )
        
        exchange_rate = get_usd_exchange_rate()
        
        total_payroll_ves = Decimal('0')
        for receipt in receipts:
            # El receipt tiene net_pay y exchange_rate_applied
            if hasattr(receipt, 'exchange_rate_applied') and receipt.exchange_rate_applied:
                rate = receipt.exchange_rate_applied
            else:
                rate = exchange_rate
            
            # net_pay es el neto a pagar (ya en VES si la nómina es en VES)
            net_pay = receipt.net_pay or Decimal('0')
            total_payroll_ves += net_pay
        
        # Calcular contribución patronal
        employer_contribution = (total_payroll_ves * employer_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        with transaction.atomic():
            declaration, _ = INCESDeclaration.objects.update_or_create(
                year=year,
                quarter=quarter,
                defaults={
                    'total_payroll_ves': total_payroll_ves,
                    'employer_rate': policy.inces_employer_rate,
                    'employer_contribution_ves': employer_contribution,
                    'status': INCESDeclaration.DeclarationStatus.CALCULATED,
                }
            )
        
        return declaration
