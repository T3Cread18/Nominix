"""
Management command para inicializar conceptos estándar de nómina Venezuela.
Uso: python manage.py seed_venezuela_concepts
"""
from django.core.management.base import BaseCommand
from payroll_core.models import PayrollConcept, Currency


def create_venezuela_concepts(company=None):
    """
    Crea o actualiza los conceptos estándar de nómina para Venezuela.
    
    Args:
        company: Instancia de Company (opcional, para futuras extensiones multi-tenant).
    
    Returns:
        dict: Resumen de conceptos creados/actualizados.
    """
    # Obtener moneda VES (crear si no existe)
    ves_currency, _ = Currency.objects.get_or_create(
        code='VES',
        defaults={'name': 'Bolívar Venezolano', 'symbol': 'Bs.'}
    )

    # Definición de conceptos estándar Venezuela
    VENEZUELA_CONCEPTS = [
        # === ASIGNACIONES ===
        {
            'code': 'SUELDO_BASE',
            'name': 'Sueldo Base',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'value': 0,  # Se define por contrato
            'currency': ves_currency,
            'is_salary_incidence': True,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.SALARY_BASE,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'ISLR_BASE', 'PRESTACIONES_BASE'],
            'system_params': {},
            'receipt_order': 10,
            'appears_on_receipt': True,
            'show_even_if_zero': False,
        },
        {
            'code': 'DIAS_DESCANSO',
            'name': 'Días de Descanso',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': 0,
            'currency': ves_currency,
            'is_salary_incidence': True,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.FIXED,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'system_params': {},
            'receipt_order': 11,
            'appears_on_receipt': True,
            'show_even_if_zero': False,
        },
        {
            'code': 'DIAS_DOMINGO',
            'name': 'Días Domingo',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': 0,
            'currency': ves_currency,
            'is_salary_incidence': True,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.FIXED,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'system_params': {},
            'receipt_order': 12,
            'appears_on_receipt': True,
            'show_even_if_zero': False,
        },
        {
            'code': 'DIAS_FERIADO',
            'name': 'Días Feriados',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': 0,
            'currency': ves_currency,
            'is_salary_incidence': True,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.FIXED,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'system_params': {},
            'receipt_order': 13,
            'appears_on_receipt': True,
            'show_even_if_zero': False,
        },
        {
            'code': 'CESTATICKET',
            'name': 'Cestaticket',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'value': 0,  # Se define por contrato
            'currency': ves_currency,
            'is_salary_incidence': False,  # No salarial
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.CESTATICKET,
            'incidences': [],
            'system_params': {},
            'receipt_order': 50,
            'appears_on_receipt': True,
            'show_even_if_zero': False,
        },
        {
            'code': 'COMPLEMENTO',
            'name': 'Complemento Salarial',
            'kind': PayrollConcept.ConceptKind.EARNING,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'value': 0,
            'currency': ves_currency,
            'is_salary_incidence': True,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.COMPLEMENT,
            'incidences': ['FAOV_BASE', 'IVSS_BASE', 'RPE_BASE', 'PRESTACIONES_BASE'],
            'system_params': {},
            'receipt_order': 40,
            'appears_on_receipt': True,
            'show_even_if_zero': False,
        },
        
        # === DEDUCCIONES DE LEY ===
        {
            'code': 'IVSS',
            'name': 'Seguro Social Obligatorio (IVSS)',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': 4.00,  # 4%
            'currency': ves_currency,
            'is_salary_incidence': False,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.LAW_DEDUCTION,
            'incidences': [],
            'system_params': {
                'rate': 0.04,
                'base_source': 'ACCUMULATOR',
                'base_label': 'IVSS_BASE',
                'cap_multiplier': 5,  # Tope: 5 SM
                'multiplier_var': 'LUNES',
                'is_weekly': True,
            },
            'receipt_order': 100,
            'appears_on_receipt': True,
            'show_even_if_zero': True,
        },
        {
            'code': 'RPE',
            'name': 'Régimen Prestacional de Empleo (Paro Forzoso)',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': 0.50,  # 0.5%
            'currency': ves_currency,
            'is_salary_incidence': False,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.LAW_DEDUCTION,
            'incidences': [],
            'system_params': {
                'rate': 0.005,
                'base_source': 'ACCUMULATOR',
                'base_label': 'RPE_BASE',
                'cap_multiplier': 10,  # Tope: 10 SM
                'multiplier_var': 'LUNES',
                'is_weekly': True,
            },
            'receipt_order': 101,
            'appears_on_receipt': True,
            'show_even_if_zero': True,
        },
        {
            'code': 'FAOV',
            'name': 'Fondo de Ahorro Obligatorio para Vivienda (FAOV)',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': 1.00,  # 1%
            'currency': ves_currency,
            'is_salary_incidence': False,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.LAW_DEDUCTION,
            'incidences': [],
            'system_params': {
                'rate': 0.01,
                'base_source': 'ACCUMULATOR',
                'base_label': 'FAOV_BASE',
                'cap_multiplier': None,  # Sin tope
                'multiplier_var': None,
                'is_weekly': False,  # Mensual
            },
            'receipt_order': 102,
            'appears_on_receipt': True,
            'show_even_if_zero': True,
        },
        {
            'code': 'PRESTAMO',
            'name': 'Préstamo / Anticipo',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.FIXED_AMOUNT,
            'value': 0,
            'currency': ves_currency,
            'is_salary_incidence': False,
            'is_system': True,
            'behavior': PayrollConcept.ConceptBehavior.LOAN,
            'incidences': [],
            'system_params': {},
            'receipt_order': 110,
            'appears_on_receipt': True,
            'show_even_if_zero': False,
        },
    ]

    created_count = 0
    updated_count = 0

    for concept_data in VENEZUELA_CONCEPTS:
        code = concept_data.pop('code')
        obj, created = PayrollConcept.objects.update_or_create(
            code=code,
            defaults=concept_data
        )
        if created:
            created_count += 1
        else:
            updated_count += 1

    return {
        'created': created_count,
        'updated': updated_count,
        'total': len(VENEZUELA_CONCEPTS)
    }


class Command(BaseCommand):
    help = 'Inicializa los conceptos estándar de nómina para Venezuela (LOTTT)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--schema',
            type=str,
            help='Nombre del esquema (tenant) específico. Si no se especifica, se aplica a todos.',
        )

    def handle(self, *args, **options):
        from django_tenants.utils import get_tenant_model, tenant_context
        from django.db import connection
        
        TenantModel = get_tenant_model()
        schema_name = options.get('schema')
        
        if schema_name:
            # Ejecutar solo para un tenant específico
            try:
                tenant = TenantModel.objects.get(schema_name=schema_name)
                self._seed_for_tenant(tenant)
            except TenantModel.DoesNotExist:
                self.stderr.write(
                    self.style.ERROR(f"❌ Tenant con esquema '{schema_name}' no encontrado.")
                )
        else:
            # Ejecutar para todos los tenants (excluyendo public)
            tenants = TenantModel.objects.exclude(schema_name='public')
            
            if not tenants.exists():
                self.stdout.write(
                    self.style.WARNING("⚠️ No hay tenants configurados. Cree un tenant primero.")
                )
                return
            
            for tenant in tenants:
                self._seed_for_tenant(tenant)

    def _seed_for_tenant(self, tenant):
        from django_tenants.utils import tenant_context
        
        self.stdout.write(f"🏢 Procesando tenant: {tenant.name} ({tenant.schema_name})...")
        
        with tenant_context(tenant):
            result = create_venezuela_concepts()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"   ✅ Conceptos: {result['created']} creados, "
                    f"{result['updated']} actualizados. Total: {result['total']}"
                )
            )

