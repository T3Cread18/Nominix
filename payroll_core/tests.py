from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import get_tenant_model, get_tenant_domain_model
from decimal import Decimal
from datetime import date
from .models import Employee, LaborContract, Currency, ExchangeRate, PayrollConcept
from .engine import PayrollEngine

class VenezuelaPayrollTest(TenantTestCase):
    
    @staticmethod
    def setup_tenant(tenant):
        """Hook para configurar datos extra del tenant antes de guardar"""
        tenant.rif = "J-12345678-9" # Requerido por nuestro validador
        return tenant

    def setUp(self):
        super().setUp()
        # En este punto, TenantTestCase ya creó un tenant y activó su esquema.
        # Las tablas de payroll_core existen en este esquema aislado.

        # 1. Configurar Monedas
        self.usd = Currency.objects.create(code='USD', name='Dolar', is_base_currency=False)
        self.ves = Currency.objects.create(code='VES', name='Bolivar', is_base_currency=True)
        
        # 2. Configurar Tasa BCV (Ej: 45.50 Bs/$)
        self.rate = ExchangeRate.objects.create(
            currency=self.usd,
            rate=Decimal('45.5000'),
            date_valid=date.today(),
            source='BCV'
        )

        # 3. Crear Empleado y Contrato ($100 USD Mensual)
        self.employee = Employee.objects.create(
            first_name="Juan", last_name="Perez", 
            national_id="V-12345678",
            is_active=True,
            hire_date=date.today()
        )
        self.contract = LaborContract.objects.create(
            employee=self.employee,
            salary_amount=Decimal('100.00'),
            salary_currency=self.usd,
            payment_frequency='MONTHLY',
            is_active=True,
            start_date=date.today() # Requerido
        )

    def test_basic_salary_conversion(self):
        """Prueba que $100 se conviertan correctamente a Bs segun tasa"""
        engine = PayrollEngine(self.contract, date.today(), self.rate)
        
        # Simular concepto de Sueldo Base
        # Nota: No pasamos tenant_id porque estamos dentro del esquema
        concept_salary = PayrollConcept.objects.create(
            code='SUE01', name='Sueldo Base', 
            kind='EARNING', computation_method='FIXED_AMOUNT',
            value=Decimal('100.00'), currency=self.usd
        )

        amount_ves = engine.calculate_concept_amount(concept_salary)
        
        # Esperado: 100 * 45.50 = 4550.00
        print(f"\n🧪 Test Conversión: USD 100 * 45.50 = {amount_ves}")
        self.assertEqual(amount_ves, Decimal('4550.00'))

    def test_ivss_deduction(self):
        """Prueba deducción del 4% sobre el sueldo convertido"""
        engine = PayrollEngine(self.contract, date.today(), self.rate)
        
        # Concepto IVSS: 4% del Salario Base
        concept_ivss = PayrollConcept.objects.create(
            code='IVSS', name='Seguro Social',
            kind='DEDUCTION', computation_method='PERCENTAGE_OF_BASIC',
            value=Decimal('4.00'), currency=self.ves
        )
        
        deduction_ves = engine.calculate_concept_amount(concept_ivss)
        
        # Cálculo manual: ($100 * 45.50) = 4550 Bs base.
        # 4% de 4550 = 182.00 Bs.
        print(f"🧪 Test IVSS: 4% de 4550 = {deduction_ves}")
        self.assertEqual(deduction_ves, Decimal('182.00'))
