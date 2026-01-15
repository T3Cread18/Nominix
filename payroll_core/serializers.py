from rest_framework import serializers
from .models import (
    Employee, LaborContract, Branch, PayrollConcept, 
    EmployeeConcept, Currency, PayrollPeriod, PayrollReceipt, PayrollReceiptLine,
    PayrollNovelty, Company, Department, Loan, LoanPayment, JobPosition, ExchangeRate,
    PayrollPolicy
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
            'incidences', 'behavior', 'behavior_display', 'system_params'
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
        # Bloquear modificación de conceptos de sistema
        # if self.instance and self.instance.is_system:
        #     raise serializers.ValidationError(
        #         "Este es un concepto de sistema y no puede ser modificado."
        #     )

        
        # Validar parámetros requeridos según behavior
        behavior = attrs.get('behavior') or (self.instance.behavior if self.instance else None)
        system_params = attrs.get('system_params', {})
        
        if behavior and behavior in BEHAVIOR_REQUIRED_PARAMS:
            required = BEHAVIOR_REQUIRED_PARAMS[behavior]
            for param in required:
                if param not in system_params:
                    raise serializers.ValidationError({
                        'system_params': f"El comportamiento '{behavior}' requiere el parámetro '{param}'."
                    })
        
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
    
    class Meta:
        model = JobPosition
        fields = ['id', 'name', 'code', 'department', 'department_name', 'default_total_salary', 'currency', 'currency_data']

class LaborContractSerializer(serializers.ModelSerializer):
    currency_data = CurrencySerializer(source='salary_currency', read_only=True)

    class Meta:
        model = LaborContract
        fields = [
            'id', 'employee', 'branch', 'contract_type', 'salary_amount', 
            'base_salary_bs', 'includes_cestaticket', 
            'salary_currency', 'currency_data', 'payment_frequency', 'start_date', 
            'end_date', 'is_active', 'position', 'job_position', 'department', 'work_schedule',
            'total_salary_override'
        ]

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