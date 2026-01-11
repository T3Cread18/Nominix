"""
Configuración del Admin para la app Payroll Core.

Proporciona interfaces de administración para gestionar
monedas, tasas de cambio, empleados y contratos laborales.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import Currency, ExchangeRate, Employee, LaborContract, Branch, PayrollConcept, EmployeeConcept, Loan, LoanPayment
from typing import Tuple, List, Optional


@admin.register(Currency)
class CurrencyAdmin(admin.ModelAdmin):
    """
    Administrador del modelo Currency.
    """
    
    list_display: Tuple[str, ...] = (
        'code',
        'name',
        'symbol',
        'is_base_currency',
        'is_active',
    )
    
    list_filter: Tuple[str, ...] = (
        'is_base_currency',
        'is_active',
    )
    
    search_fields: Tuple[str, ...] = (
        'code',
        'name',
    )
    
    ordering: Tuple[str, ...] = ('code',)


@admin.register(ExchangeRate)
class ExchangeRateAdmin(admin.ModelAdmin):
    """
    Administrador del modelo ExchangeRate.
    
    Permite gestionar las tasas de cambio del BCV y otras fuentes.
    """
    
    list_display: Tuple[str, ...] = (
        'currency',
        'formatted_rate',
        'date_valid',
        'source',
        'created_at',
    )
    
    list_filter: Tuple[str, ...] = (
        'source',
        'currency',
        'date_valid',
    )
    
    search_fields: Tuple[str, ...] = (
        'currency__code',
        'currency__name',
    )
    
    ordering: Tuple[str, ...] = ('-date_valid',)
    
    date_hierarchy: str = 'date_valid'
    
    readonly_fields: Tuple[str, ...] = ('created_at',)
    
    fieldsets = (
        ('Información de Tasa', {
            'fields': ('currency', 'rate', 'date_valid', 'source')
        }),
        ('Información Adicional', {
            'fields': ('notes', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    def formatted_rate(self, obj: ExchangeRate) -> str:
        """Formatea la tasa con separadores de miles."""
        return f"Bs. {obj.rate:,.6f}"
    formatted_rate.short_description = 'Tasa (VES)'
@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    """
    Administrador del modelo Branch.
    """
    list_display = ('name', 'code', 'is_active', 'created_at')
    search_fields = ('name', 'code')
    list_filter = ('is_active',)
    ordering = ('name',)


@admin.register(PayrollConcept)
class PayrollConceptAdmin(admin.ModelAdmin):
    """
    Administrador de Conceptos de Nómina.
    Permite definir bonos, deducciones y reglas de cálculo.
    """
    list_display = (
        'code', 
        'name', 
        'kind_display', 
        'method_display', 
        'formatted_value', 
        'active'
    )
    list_filter = ('kind', 'computation_method', 'active', 'currency')
    search_fields = ('code', 'name')
    ordering = ('kind', 'code')
    
    fieldsets = (
        ('Identificación', {
            'fields': ('code', 'name', 'kind', 'active')
        }),
        ('Reglas de Cálculo', {
            'fields': (
                ('computation_method', 'value'),
                'currency',
            ),
            'description': 'Si es porcentaje, el valor 4.00 significa 4%.'
        }),
        ('Configuración', {
            'fields': ('is_salary_incidence',)
        }),
    )

    def kind_display(self, obj):
        return format_html(
            '<span style="color: {};">{}</span>',
            'green' if obj.kind == 'EARNING' else 'red',
            obj.get_kind_display()
        )
    kind_display.short_description = 'Tipo'

    def method_display(self, obj):
        return obj.get_computation_method_display()
    method_display.short_description = 'Método'

    def formatted_value(self, obj):
        if obj.computation_method == 'PERCENTAGE_OF_BASIC':
            return f"{obj.value:.2f}%"
        return f"{obj.currency.symbol} {obj.value:,.2f}"
    formatted_value.short_description = 'Valor'


class EmployeeConceptInline(admin.TabularInline):
    """
    Inline para asignar conceptos directamente al empleado.
    """
    model = EmployeeConcept
    extra = 1
    classes = ('collapse',)
    fields = ('concept', 'override_value', 'active', 'notes')
    autocomplete_fields = ['concept']


class LaborContractInline(admin.TabularInline):
    """
    Inline para ver contratos desde el admin del Empleado.
    """
    model = LaborContract
    extra: int = 0
    max_num: int = 10
    show_change_link: bool = True
    fields = (
        'branch',
        'position',
        'salary_amount',
        'salary_currency',
        'payment_frequency',
        'start_date',
        'is_active',
    )
    readonly_fields: Tuple[str, ...] = ()
    
    def has_delete_permission(self, request, obj=None) -> bool:
        """No permitir eliminar contratos desde inline."""
        return False


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    """
    Administrador del modelo Employee.
    
    Organiza los campos en secciones lógicas para facilitar
    la gestión de empleados con datos venezolanos.
    """
    
    list_display: Tuple[str, ...] = (
        'full_name_display',
        'national_id',
        'branch',
        'position',
        'department',
        'hire_date',
        'seniority_display',
        'is_active_display',
    )
    
    list_filter: Tuple[str, ...] = (
        'is_active',
        'branch',
        'department',
        'gender',
        'marital_status',
    )
    
    search_fields: Tuple[str, ...] = (
        'first_name',
        'last_name',
        'national_id',
        'email',
        'employee_code',
    )
    
    ordering: Tuple[str, ...] = ('last_name', 'first_name')
    
    date_hierarchy: str = 'hire_date'
    
    readonly_fields: Tuple[str, ...] = (
        'created_at',
        'updated_at',
        'seniority_years',
        'seniority_days',
    )
    
    inlines: List = [LaborContractInline, EmployeeConceptInline]
    
    fieldsets = (
        ('Información Personal', {
            'fields': (
                ('first_name', 'last_name'),
                ('email', 'phone'),
                ('date_of_birth', 'gender', 'marital_status'),
                'address',
            )
        }),
        ('Documentos Venezuela', {
            'fields': (
                ('national_id', 'rif'),
                ('ivss_code', 'faov_code'),
            ),
            'description': 'Documentos requeridos por la legislación venezolana'
        }),
        ('Información Laboral', {
            'fields': (
                ('branch', 'employee_code'),
                ('position', 'department'),
                ('hire_date', 'termination_date'),
                'is_active',
            )
        }),
        ('Datos Bancarios', {
            'fields': (
                'bank_name',
                ('bank_account_number', 'bank_account_type'),
            ),
            'classes': ('collapse',)
        }),
        ('Antigüedad', {
            'fields': (
                ('seniority_years', 'seniority_days'),
            ),
            'classes': ('collapse',),
            'description': 'Calculado automáticamente desde la fecha de ingreso'
        }),
        ('Información del Sistema', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def full_name_display(self, obj: Employee) -> str:
        """Muestra el nombre completo."""
        return obj.full_name
    full_name_display.short_description = 'Nombre Completo'
    full_name_display.admin_order_field = 'last_name'
    
    def seniority_display(self, obj: Employee) -> str:
        """Muestra la antigüedad formateada."""
        years = obj.seniority_years
        if years == 0:
            days = obj.seniority_days
            return f"{days} días"
        elif years == 1:
            return "1 año"
        else:
            return f"{years} años"
    seniority_display.short_description = 'Antigüedad'
    
    def is_active_display(self, obj: Employee) -> str:
        """Muestra el estado con colores."""
        if obj.is_active:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">● Activo</span>'
            )
        return format_html(
            '<span style="color: #dc3545; font-weight: bold;">● Inactivo</span>'
        )
    is_active_display.short_description = 'Estado'
    is_active_display.admin_order_field = 'is_active'


@admin.register(LaborContract)
class LaborContractAdmin(admin.ModelAdmin):
    """
    Administrador del modelo LaborContract.
    
    Permite gestionar los contratos laborales con información salarial.
    """
    
    list_display: Tuple[str, ...] = (
        'employee',
        'branch',
        'position',
        'formatted_salary',
        'payment_frequency',
        'contract_type',
        'start_date',
        'is_active_display',
    )
    
    list_filter: Tuple[str, ...] = (
        'is_active',
        'branch',
        'payment_frequency',
        'contract_type',
        'salary_currency',
    )
    
    search_fields: Tuple[str, ...] = (
        'employee__first_name',
        'employee__last_name',
        'employee__national_id',
        'position',
        'department',
    )
    
    ordering: Tuple[str, ...] = ('-start_date',)
    
    date_hierarchy: str = 'start_date'
    
    readonly_fields: Tuple[str, ...] = ('created_at', 'updated_at')
    
    raw_id_fields: Tuple[str, ...] = ('employee',)
    
    fieldsets = (
        ('Empleado y Ubicación', {
            'fields': (
                'employee',
                'branch'
            )
        }),
        ('Tipo de Contrato', {
            'fields': (
                'contract_type',
                ('start_date', 'end_date'),
            )
        }),
        ('Información Salarial', {
            'fields': (
                ('salary_amount', 'salary_currency'),
                'payment_frequency',
            )
        }),
        ('Cargo y Detalles', {
            'fields': (
                ('position', 'department'),
                'work_schedule',
            )
        }),
        ('Estado', {
            'fields': ('is_active', 'notes'),
        }),
        ('Información del Sistema', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def formatted_salary(self, obj: LaborContract) -> str:
        """Formatea el salario con moneda."""
        return f"{obj.salary_currency.symbol} {obj.salary_amount:,.2f}"
    formatted_salary.short_description = 'Salario'
    formatted_salary.admin_order_field = 'salary_amount'
    
    def is_active_display(self, obj: LaborContract) -> str:
        """Muestra el estado con colores."""
        if obj.is_active:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">● Vigente</span>'
            )
        return format_html(
            '<span style="color: #6c757d;">○ Inactivo</span>'
        )
    is_active_display.short_description = 'Estado'
    is_active_display.admin_order_field = 'is_active'
