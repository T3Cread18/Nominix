
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from .models import (
    Employee, LaborContract, Currency, PayrollPeriod, 
    Loan, LoanPayment, Company, Branch, Department
)
from .services import PayrollProcessor
from .engine import PayrollEngine

class LoanModuleTests(TestCase):
    def setUp(self):
        # 1. Setup básico
        self.company = Company.objects.create(name="Test Co", rif="J-123456")
        self.currency_ves = Currency.objects.create(code='VES', name='Bolívar', symbol='Bs.')
        self.currency_usd = Currency.objects.create(code='USD', name='Dólar', symbol='$')
        
        self.employee = Employee.objects.create(
            first_name="Juan", last_name="Perez", 
            national_id="V-12345678", is_active=True
        )
        
        # 2. Contrato
        self.contract = LaborContract.objects.create(
            employee=self.employee,
            salary_amount=Decimal('100.00'), # $100
            salary_currency=self.currency_usd,
            is_active=True,
            start_date=date(2025, 1, 1)
        )
        
        # 3. Periodo
        self.period = PayrollPeriod.objects.create(
            name="Enero 2025 - Q1",
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 15),
            payment_date=date(2025, 1, 15)
        )

    def test_loan_auto_calc(self):
        """Prueba cálculo automático de intereses y cuotas"""
        # Crear Préstamo: $200 Principal, 10% Interés, 10 cuotas
        # Total deuda debería ser 220
        # Cuota debería ser 22
        loan = Loan.objects.create(
            employee=self.employee,
            amount=Decimal('200.00'),
            interest_rate=Decimal('10.00'), # 10%
            num_installments=10,
            currency=self.currency_usd,
            status=Loan.LoanStatus.Active,
            description="Loan with interest"
        )
        
        self.assertEqual(loan.balance, Decimal('220.00'))
        self.assertEqual(loan.installment_amount, Decimal('22.00'))

    def test_loan_deduction_calculation(self):
        """Prueba que el Engine calcule la deducción correctamente"""
        # Crear Préstamo: $200 Total, $20 Cuota
        loan = Loan.objects.create(
            employee=self.employee,
            amount=Decimal('200.00'),
            balance=Decimal('200.00'),
            installment_amount=Decimal('20.00'),
            currency=self.currency_usd,
            status=Loan.LoanStatus.Active,
            description="Personal Loan"
        )
        
        engine = PayrollEngine(self.contract, self.period)
        # Mockear tasa de cambio a 50 Bs/$
        engine._get_exchange_rate_value = lambda curr: Decimal('50.00') if curr.code == 'USD' else Decimal('1.00')
        
        result = engine.calculate_payroll()
        
        # Verificar que existe la línea de préstamo
        loan_lines = [l for l in result['lines'] if l.get('code') == 'PRESTAMO']
        self.assertEqual(len(loan_lines), 1)
        
        # Monto en VES esperado: $20 * 50 = 1000 Bs
        self.assertEqual(loan_lines[0]['amount_ves'], Decimal('1000.00'))
        self.assertEqual(loan_lines[0]['loan_id'], loan.id)

    def test_loan_amortization_on_close(self):
        """Prueba que el Processor cree el pago y reduzca el saldo"""
        loan = Loan.objects.create(
            employee=self.employee,
            amount=Decimal('200.00'),
            balance=Decimal('200.00'),
            installment_amount=Decimal('20.00'),
            currency=self.currency_usd,
            status=Loan.LoanStatus.Active
        )
        
        # Ejecutar cierre con tasa manual 50
        result = PayrollProcessor.process_period(self.period.id, manual_rate=Decimal('50.00'))
        
        # 1. Verificar Paylip
        self.assertEqual(result['processed_employees'], 1)
        
        # 2. Verificar LoanPayment
        payment = LoanPayment.objects.first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.loan, loan)
        self.assertEqual(payment.amount, Decimal('20.00')) # $20 amortizados
        
        # 3. Verificar Saldo Actualizado
        loan.refresh_from_db()
        self.assertEqual(loan.balance, Decimal('180.00')) # 200 - 20
        self.assertEqual(loan.status, Loan.LoanStatus.Active)

    def test_loan_full_payment(self):
        """Prueba que el préstamo cambie a PAID cuando el saldo llega a 0"""
        loan = Loan.objects.create(
            employee=self.employee,
            amount=Decimal('200.00'),
            balance=Decimal('10.00'), # Saldo menor que la cuota ($20)
            installment_amount=Decimal('20.00'),
            currency=self.currency_usd,
            status=Loan.LoanStatus.Active
        )
        
        PayrollProcessor.process_period(self.period.id, manual_rate=Decimal('50.00'))
        
        loan.refresh_from_db()
        self.assertEqual(loan.balance, Decimal('0.00'))
        self.assertEqual(loan.status, Loan.LoanStatus.Paid)
        
        # El pago debe ser por el saldo restante ($10), no la cuota completa ($20)
        payment = LoanPayment.objects.first()
        self.assertEqual(payment.amount, Decimal('10.00'))

