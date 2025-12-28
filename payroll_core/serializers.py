from rest_framework import serializers
from .models import (
    Employee, LaborContract, Branch, PayrollConcept, 
    EmployeeConcept, Currency, PayrollPeriod, Payslip, PayslipDetail,
    PayrollNovelty
)

class PayrollNoveltySerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollNovelty
        fields = ['id', 'employee', 'period', 'concept_code', 'amount']

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'code', 'is_active']

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
            'value', 'currency', 'currency_data', 'is_salary_incidence', 'active'
        ]

class EmployeeConceptSerializer(serializers.ModelSerializer):
    concept_data = PayrollConceptSerializer(source='concept', read_only=True)
    class Meta:
        model = EmployeeConcept
        fields = ['id', 'employee', 'concept', 'concept_data', 'override_value', 'active', 'notes']

class LaborContractSerializer(serializers.ModelSerializer):
    currency_data = CurrencySerializer(source='salary_currency', read_only=True)
    class Meta:
        model = LaborContract
        fields = [
            'id', 'employee', 'branch', 'contract_type', 'salary_amount', 
            'salary_currency', 'currency_data', 'payment_frequency', 'start_date', 
            'end_date', 'is_active', 'position', 'department', 'work_schedule'
        ]

class EmployeeSerializer(serializers.ModelSerializer):
    contracts = LaborContractSerializer(many=True, read_only=True)
    concepts = EmployeeConceptSerializer(many=True, read_only=True)
    branch = BranchSerializer(read_only=True)
    branch_id = serializers.PrimaryKeyRelatedField(
        queryset=Branch.objects.all(), source='branch', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Employee
        fields = [
            'id', 'first_name', 'last_name', 'national_id', 'email', 
            'phone', 'department', 'position', 'branch', 'branch_id',
            'hire_date', 'is_active', 'full_name', 'contracts', 'concepts'
        ]
        read_only_fields = ['full_name']


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
    
    class Meta:
        model = Payslip
        fields = [
            'id', 'period', 'employee', 'employee_name', 'contract_snapshot',
            'total_earnings', 'total_deductions', 'net_pay',
            'exchange_rate_applied', 'currency_code', 'details', 'created_at'
        ]

