from rest_framework import serializers
from .models import (
    Employee, LaborContract, Branch, PayrollConcept, 
    EmployeeConcept, Currency, PayrollPeriod, Payslip, PayslipDetail,
    PayrollNovelty, Company, Department, Loan, LoanPayment, JobPosition
)

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
    currency_data = CurrencySerializer(source='currency', read_only=True)
    class Meta:
        model = PayrollConcept
        fields = [
            'id', 'code', 'name', 'kind', 'computation_method', 
            'value', 'currency', 'currency_data', 'is_salary_incidence', 
            'active', 'formula', 'show_on_payslip', 'appears_on_receipt',
            'show_even_if_zero', 'receipt_order', 'is_system'
        ]
        read_only_fields = ['is_system']

    def validate(self, attrs):
        if self.instance and self.instance.is_system:
            # Solo permitir cambiar ciertos campos estéticos si es sistema? 
            # El usuario dice "que no se puedan modificar"
            raise serializers.ValidationError(
                "Este es un concepto de sistema y no puede ser modificado."
            )
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
            'base_salary_bs', 'includes_cestaticket',  # Campos para conceptos
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
    # Ya no definimos branch/department como campos de clase para que hereden 
    # el comportamiento por defecto de ModelSerializer (writable PKs).
    # Pero sobrecargamos to_representation para inyectar los datos completos en el GET.
    
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
            'employee_code': {'required': False, 'allow_null': True, 'allow_blank': True},
            'position': {'required': False, 'allow_blank': True},
            'job_position': {'required': False, 'allow_null': True},
            'address': {'required': False, 'allow_blank': True},
            'address': {'required': False, 'allow_blank': True},
            'phone': {'required': False, 'allow_blank': True},
            'termination_date': {'required': False, 'allow_null': True},
            'date_of_birth': {'required': False, 'allow_null': True},
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Inyectar datos completos para branch y department en la respuesta
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


class PayslipDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayslipDetail
        fields = '__all__'


class PayslipSerializer(serializers.ModelSerializer):
    details = PayslipDetailSerializer(many=True, read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    # Mapeo de campos del modelo a nombres esperados por el frontend
    total_earnings = serializers.DecimalField(source='total_income_ves', max_digits=18, decimal_places=2, read_only=True)
    total_deductions = serializers.DecimalField(source='total_deductions_ves', max_digits=18, decimal_places=2, read_only=True)
    net_pay = serializers.DecimalField(source='net_pay_ves', max_digits=18, decimal_places=2, read_only=True)
    
    class Meta:
        model = Payslip
        fields = [
            'id', 'period', 'employee', 'employee_name', 'contract_snapshot',
            'total_earnings', 'total_deductions', 'net_pay',
            'exchange_rate_applied', 'currency_code', 'details', 'created_at'
        ]

class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'

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