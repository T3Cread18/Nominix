from rest_framework import serializers
from .models import (
    Employee, LaborContract, Branch, PayrollConcept, 
    EmployeeConcept, Currency, PayrollPeriod, PayrollReceipt, PayrollReceiptLine,
    PayrollNovelty, Company, Department, Loan, LoanPayment, JobPosition, ExchangeRate,
    PayrollPolicy,
    # Social Benefits
    SocialBenefitsLedger, SocialBenefitsSettlement, InterestRateBCV
)

# ============================================================================
# CONSTANTES PARA VALIDACIÓN Y UI (Concept Builder)
# ============================================================================

# Etiquetas de acumuladores disponibles para incidencias
ACCUMULATOR_LABELS = {
    'FAOV_BASE': 'Base FAOV (Ahorro Vivienda)',
    'IVSS_BASE': 'Base IVSS (Seguro Social)',
    'RPE_BASE': 'Base RPE (Paro Forzoso)',
    'ISLR_BASE': 'Base ISLR (Impuesto)',
    'PRESTACIONES_BASE': 'Base Prestaciones Sociales',
}

# Parámetros requeridos según behavior
BEHAVIOR_REQUIRED_PARAMS = {
    'LAW_DEDUCTION': ['rate', 'base_source'],
    'SALARY_BASE': [],
    'CESTATICKET': [],
    'COMPLEMENT': [],
    'LOAN': [],
    'DYNAMIC': [],
    'FIXED': [],
}



class PayrollNoveltySerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollNovelty
        fields = ['id', 'employee', 'period', 'concept_code', 'amount']

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'address', 'phone', 'rif', 'is_active']

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['code', 'name', 'symbol']
class ExchangeRateSerializer(serializers.ModelSerializer):
    currency_data = CurrencySerializer(source='currency', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    
    class Meta:
        model = ExchangeRate
        fields = [
            'id', 'currency', 'currency_data', 'rate', 
            'date_valid', 'source', 'source_display', 
            'notes', 'created_at'
        ]
        read_only_fields = ['created_at']
class PayrollConceptSerializer(serializers.ModelSerializer):
    """
    Serializer para Conceptos de Nómina con validación de comportamiento y parámetros.
    """
    currency_data = CurrencySerializer(source='currency', read_only=True)
    behavior_display = serializers.CharField(source='get_behavior_display', read_only=True)
    
    class Meta:
        model = PayrollConcept
        fields = [
            'id', 'code', 'name', 'kind', 'computation_method', 
            'value', 'currency', 'currency_data', 'is_salary_incidence', 
            'active', 'formula', 'show_on_payslip', 'appears_on_receipt',
            'show_even_if_zero', 'receipt_order', 'is_system', 
            'incidences', 'behavior', 'behavior_display', 'system_params',
            'calculation_base', 'deducts_from_base_salary', 'adds_to_complement'
        ]
        read_only_fields = ['is_system']

    def validate_incidences(self, value):
        """Valida que las incidencias sean etiquetas conocidas."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Incidences debe ser una lista.")
        
        for tag in value:
            if tag not in ACCUMULATOR_LABELS:
                raise serializers.ValidationError(
                    f"Etiqueta de incidencia desconocida: '{tag}'. "
                    f"Opciones válidas: {list(ACCUMULATOR_LABELS.keys())}"
                )
        return value

    def validate_system_params(self, value):
        """Valida que system_params sea un diccionario válido."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("system_params debe ser un objeto JSON.")
        return value

    def validate(self, attrs):
        print(f"DEBUG VALIDATE: {attrs}")
        # 1. Recuperar datos (Merge de lo que envían + lo que ya existe en DB)
        instance = self.instance
        behavior = attrs.get('behavior') or (instance.behavior if instance else None)
        # Nota: system_params es un dict, usamos .get() o {}
        system_params = attrs.get('system_params') 
        if system_params is None and instance:
            system_params = instance.system_params
        
        # FIX: Si viene system_params pero está incompleto, hacemos merge con lo que había
        # Esto evita que se borren claves importantes (rate, etc) si el frontend no las envía todas
        if instance and isinstance(system_params, dict) and isinstance(instance.system_params, dict):
            # Usamos los valores actuales como base
            merged_params = instance.system_params.copy()
            # Sobrescribimos con lo nuevo
            merged_params.update(system_params)
            system_params = merged_params
            # IMPORANTE: Actualizar attrs para que se guarde el merge completo
            attrs['system_params'] = system_params
            
        if system_params is None:
            system_params = {}

        # 2. Validación Genérica (Tu lógica actual)
        # Verifica que existan las claves mínimas requeridas por el tipo de comportamiento
        if behavior and behavior in BEHAVIOR_REQUIRED_PARAMS:
            required = BEHAVIOR_REQUIRED_PARAMS[behavior]
            for param in required:
                if param not in system_params:
                    raise serializers.ValidationError({
                        'system_params': f"El comportamiento '{behavior}' requiere el parámetro '{param}'."
                    })

        # 3. Validación Condicional Avanzada (Lógica ISLR vs IVSS)
        if behavior == 'LAW_DEDUCTION':
            # Por defecto asumimos FIXED si no se especifica
            rate_source = system_params.get('rate_source', 'FIXED') 

            # CASO A: Tasa Fija (Ej: IVSS, FAOV)
            if rate_source == 'FIXED':
                if 'rate' not in system_params:
                    raise serializers.ValidationError({
                        "system_params": "Para deducciones de tasa fija (IVSS/FAOV), debe incluir el parámetro 'rate' (tasa)."
                    })

            # CASO B: Tasa desde Contrato (Ej: ISLR)
            elif rate_source == 'CONTRACT':
                if 'contract_field' not in system_params:
                    raise serializers.ValidationError({
                        "system_params": "Si la tasa viene del contrato (rate_source='CONTRACT'), debe especificar 'contract_field'."
                    })
                
                # --- Validación de Seguridad (Opcional pero recomendada) ---
                # Verifica que el nombre del campo realmente exista en el modelo LaborContract
                # para evitar errores 500 en el motor de cálculo.
                try:
                    from ..models import LaborContract 
                    field_name = system_params.get('contract_field')
                    # Obtenemos la lista de campos válidos del modelo
                    valid_fields = [f.name for f in LaborContract._meta.get_fields()]
                    
                    if field_name not in valid_fields:
                         raise serializers.ValidationError({
                            "system_params": f"El campo '{field_name}' no existe en el modelo LaborContract."
                        })
                except ImportError:
                    pass # Si no puedes importar el modelo aquí, omite esta validación extra

        return attrs



class EmployeeConceptSerializer(serializers.ModelSerializer):
    concept_data = PayrollConceptSerializer(source='concept', read_only=True)
    class Meta:
        model = EmployeeConcept
        fields = ['id', 'employee', 'concept', 'concept_data', 'override_value', 'active', 'notes']

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class JobPositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source='department.name', read_only=True)
    currency_data = CurrencySerializer(source='currency', read_only=True)
    split_fixed_currency_data = CurrencySerializer(source='split_fixed_currency', read_only=True)
    
    class Meta:
        model = JobPosition
        fields = ['id', 'name', 'code', 'department', 'department_name', 'default_total_salary', 'currency', 'currency_data', 'split_fixed_amount', 'split_fixed_currency', 'split_fixed_currency_data']

class LaborContractSerializer(serializers.ModelSerializer):
    currency_data = CurrencySerializer(source='salary_currency', read_only=True)

    class Meta:
        model = LaborContract
        fields = [
            'id', 'employee', 'branch', 'contract_type', 'salary_amount', 
            'base_salary_bs', 'includes_cestaticket', 
            'salary_currency', 'currency_data', 'payment_frequency', 'start_date', 
            'end_date', 'is_active', 'position', 'job_position', 'department', 'work_schedule',
            'total_salary_override', 'islr_retention_percentage'
        ]
        extra_kwargs = {
            'islr_retention_percentage': {
                'required': False, 
                'min_value': 0, 
                'max_value': 100,
                'help_text': 'Porcentaje de retención ISLR (0 a 100)'
            }
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.department:
            representation['department'] = DepartmentSerializer(instance.department).data
        if instance.job_position:
            representation['job_position'] = JobPositionSerializer(instance.job_position).data
        return representation

class EmployeeSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(use_url=True, required=False, allow_null=True)
    
    class Meta:
        model = Employee
        fields = '__all__'
        extra_kwargs = {
            'branch': {'required': False, 'allow_null': True},
            'department': {'required': False, 'allow_null': True},
            'rif': {'required': False, 'allow_null': True, 'allow_blank': True},
            'ivss_code': {'required': False, 'allow_null': True, 'allow_blank': True},
            'faov_code': {'required': False, 'allow_null': True, 'allow_blank': True},
            'bank_account_number': {'required': False, 'allow_null': True, 'allow_blank': True},
            'bank_name': {'required': False, 'allow_null': True, 'allow_blank': True},
            'employee_code': {'required': False, 'allow_null': True, 'allow_blank': True},
            'position': {'required': False, 'allow_blank': True},
            'job_position': {'required': False, 'allow_null': True},
            'address': {'required': False, 'allow_blank': True},
            'phone': {'required': False, 'allow_blank': True},
            'termination_date': {'required': False, 'allow_null': True},
            'date_of_birth': {'required': False, 'allow_null': True},
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.branch:
            representation['branch'] = BranchSerializer(instance.branch).data
        if instance.department:
            representation['department'] = DepartmentSerializer(instance.department).data
        if instance.job_position:
            representation['job_position'] = JobPositionSerializer(instance.job_position).data
        return representation

class PayrollPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollPeriod
        fields = '__all__'

class PayrollReceiptLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollReceiptLine
        fields = '__all__'

class PayrollReceiptSerializer(serializers.ModelSerializer):
    lines = PayrollReceiptLineSerializer(many=True, read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    # Mapeo de campos del modelo a nombres esperados por el frontend
    total_earnings = serializers.DecimalField(source='total_income_ves', max_digits=18, decimal_places=2, read_only=True)
    total_deductions = serializers.DecimalField(source='total_deductions_ves', max_digits=18, decimal_places=2, read_only=True)
    net_pay = serializers.DecimalField(source='net_pay_ves', max_digits=18, decimal_places=2, read_only=True)
    
    class Meta:
        model = PayrollReceipt
        fields = [
            'id', 'period', 'employee', 'employee_name', 'contract_snapshot',
            'salary_base_snapshot', 'total_earnings', 'total_deductions', 'net_pay',
            'exchange_rate_snapshot', 'currency_code', 'lines', 'status', 'created_at'
        ]

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'


class PayrollPolicySerializer(serializers.ModelSerializer):
    """
    Serializer para Políticas de Nómina (factores de recargo).
    """
    company_name = serializers.CharField(source='company.name', read_only=True)
    
    class Meta:
        model = PayrollPolicy
        fields = [
            'id', 'company', 'company_name',
            'holiday_payout_factor', 'rest_day_payout_factor',
            'overtime_day_factor', 'overtime_night_factor',
            'night_bonus_rate', 'updated_at'
        ]
        read_only_fields = ['company', 'updated_at']


class LoanPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanPayment
        fields = '__all__'

class LoanSerializer(serializers.ModelSerializer):
    payments = LoanPaymentSerializer(many=True, read_only=True)
    employee_data = EmployeeSerializer(source='employee', read_only=True)
    currency_data = CurrencySerializer(source='currency', read_only=True)
    
    class Meta:
        model = Loan
        fields = [
            'id', 'employee', 'employee_data', 'description', 
            'amount', 'interest_rate', 'balance', 'currency', 'currency_data',
            'num_installments', 'installment_amount', 'frequency', 
            'status', 'start_date', 'payments', 'created_at'
        ]
        read_only_fields = ['balance', 'created_at', 'updated_at']


# =============================================================================
# SOCIAL BENEFITS SERIALIZERS (Prestaciones Sociales)
# =============================================================================

class InterestRateBCVSerializer(serializers.ModelSerializer):
    """Serializer para tasas de interés del BCV."""
    
    class Meta:
        model = InterestRateBCV
        fields = ['id', 'year', 'month', 'rate', 'source_url', 'created_at', 'created_by']
        read_only_fields = ['created_at']


class SocialBenefitsLedgerSerializer(serializers.ModelSerializer):
    """
    Serializer para el Libro Mayor de Prestaciones Sociales.
    
    Incluye transaction_type_display para que el frontend muestre textos legibles.
    """
    # Campo de solo lectura para mostrar el texto legible del tipo de transacción
    transaction_type_display = serializers.CharField(
        source='get_transaction_type_display', 
        read_only=True
    )
    
    # Datos relacionados para visualización
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employee_national_id = serializers.CharField(source='employee.national_id', read_only=True)
    
    class Meta:
        model = SocialBenefitsLedger
        fields = [
            'id', 
            # Relaciones
            'employee', 'employee_name', 'employee_national_id', 'contract',
            # Clasificación
            'transaction_type', 'transaction_type_display', 
            'transaction_date', 'period_description',
            # Snapshot de auditoría
            'basis_days', 'daily_salary_used', 'interest_rate_used', 'previous_balance',
            # Campos financieros
            'amount', 'balance',
            # Trazabilidad
            'calculation_formula', 'calculation_trace',
            # Auditoría
            'reference', 'notes', 'created_at', 'created_by', 'ip_address',
        ]
        read_only_fields = [
            'id', 'balance', 'created_at', 'transaction_type_display',
            'employee_name', 'employee_national_id'
        ]


class SocialBenefitsSettlementSerializer(serializers.ModelSerializer):
    """
    Serializer para Liquidaciones de Prestaciones Sociales.
    
    Incluye chosen_method_display para mostrar el método elegido en texto legible.
    """
    # Campos de solo lectura para textos legibles
    chosen_method_display = serializers.CharField(
        source='get_chosen_method_display', 
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    
    class Meta:
        model = SocialBenefitsSettlement
        fields = [
            'id', 'contract',
            # Snapshot del empleado
            'employee_national_id', 'employee_full_name', 'hire_date', 'termination_date',
            # Método Garantía
            'total_garantia', 'total_dias_adicionales', 'total_intereses', 
            'total_anticipos', 'net_garantia',
            # Método Retroactivo
            'years_of_service', 'retroactive_days', 'final_daily_salary', 'retroactive_amount',
            # Resultado
            'chosen_method', 'chosen_method_display', 'settlement_amount',
            # Trazabilidad
            'calculation_summary',
            # Estado
            'settlement_date', 'status', 'status_display',
            # Auditoría
            'created_at', 'created_by', 'approved_at', 'approved_by', 
            'paid_at', 'paid_by', 'payment_reference',
            'voided_at', 'voided_by', 'void_reason',
            'notes',
        ]
        read_only_fields = [
            'id', 'chosen_method_display', 'status_display', 
            'created_at', 'approved_at', 'paid_at', 'voided_at'
        ]


class AdvanceRequestSerializer(serializers.Serializer):
    """
    Serializer para validar solicitudes de anticipo de prestaciones.
    """
    contract_id = serializers.IntegerField(
        help_text='ID del contrato del empleado'
    )
    amount = serializers.DecimalField(
        max_digits=14, 
        decimal_places=2,
        help_text='Monto del anticipo solicitado'
    )
    notes = serializers.CharField(
        required=False, 
        allow_blank=True,
        help_text='Observaciones opcionales'
    )


class QuarterlyGuaranteeSerializer(serializers.Serializer):
    """
    Serializer para procesar abono de garantía trimestral.
    """
    contract_id = serializers.IntegerField(
        help_text='ID del contrato del empleado'
    )
    period_description = serializers.CharField(
        max_length=50,
        help_text='Descripción del periodo (ej: Q1-2026)'
    )
    transaction_date = serializers.DateField(
        required=False,
        help_text='Fecha del abono (default: hoy)'
    )
