# -*- coding: utf-8 -*-
"""
Serializadores para el módulo de Vacaciones.
"""
from rest_framework import serializers
from decimal import Decimal

from .models import VacationRequest, VacationBalance, Holiday


class HolidaySerializer(serializers.ModelSerializer):
    """
    Serializador para feriados.
    """
    
    class Meta:
        model = Holiday
        fields = ['id', 'date', 'name', 'is_national', 'is_recurring']


class VacationRequestSerializer(serializers.ModelSerializer):
    """
    Serializador para solicitudes de vacaciones.
    
    Campos de solo lectura calculados:
    - employee_name: Nombre completo del empleado
    - status_display: Etiqueta del estado
    - type_display: Etiqueta del tipo
    """
    
    employee_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    type_display = serializers.SerializerMethodField()
    
    class Meta:
        model = VacationRequest
        fields = [
            'id',
            'employee',
            'employee_name',
            'contract',
            'start_date',
            'end_date',
            'days_requested',
            'return_date',
            'status',
            'status_display',
            'vacation_type',
            'type_display',
            'notes',
            'approved_by',
            'approved_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'return_date',
            'approved_by',
            'approved_at',
            'created_at',
            'updated_at',
        ]
    
    def get_employee_name(self, obj) -> str:
        """Retorna el nombre completo del empleado."""
        return obj.employee.full_name if obj.employee else ''
    
    def get_status_display(self, obj) -> str:
        """Retorna la etiqueta del estado."""
        return obj.get_status_display()
    
    def get_type_display(self, obj) -> str:
        """Retorna la etiqueta del tipo de vacación."""
        return obj.get_vacation_type_display()


class VacationBalanceSerializer(serializers.ModelSerializer):
    """
    Serializador para movimientos del kardex de vacaciones.
    """
    
    employee_name = serializers.SerializerMethodField()
    transaction_type_display = serializers.SerializerMethodField()
    
    class Meta:
        model = VacationBalance
        fields = [
            'id',
            'employee',
            'employee_name',
            'related_request',
            'period_year',
            'transaction_type',
            'transaction_type_display',
            'days',
            'transaction_date',
            'description',
            'created_by',
            'created_at',
        ]
        read_only_fields = ['created_at']
    
    def get_employee_name(self, obj) -> str:
        """Retorna el nombre completo del empleado."""
        return obj.employee.full_name if obj.employee else ''
    
    def get_transaction_type_display(self, obj) -> str:
        """Retorna la etiqueta del tipo de transacción."""
        return obj.get_transaction_type_display()


class VacationSimulateSerializer(serializers.Serializer):
    """
    Serializador para la simulación de cálculo de vacaciones.
    Usado en el endpoint simulate para recibir parámetros.
    """
    
    days_to_enjoy = serializers.IntegerField(
        required=False,
        default=None,
        help_text='Días a disfrutar. Si no se especifica, usa los días de la solicitud.'
    )


class BulkUploadResultSerializer(serializers.Serializer):
    """
    Serializador para el resultado de la carga masiva.
    """
    
    processed = serializers.IntegerField(help_text='Registros procesados exitosamente')
    errors = serializers.ListField(
        child=serializers.DictField(),
        help_text='Lista de errores encontrados'
    )
    created_ids = serializers.ListField(
        child=serializers.IntegerField(),
        help_text='IDs de las solicitudes creadas'
    )


class VacationSummarySerializer(serializers.Serializer):
    """
    Serializador para el resumen vacacional de un empleado.
    """
    
    employee_id = serializers.IntegerField()
    employee_name = serializers.CharField()
    years_of_service = serializers.IntegerField(required=False)
    entitled_days = serializers.IntegerField()
    balance = serializers.IntegerField()
    used_days = serializers.IntegerField()
    available_days = serializers.IntegerField(required=False)
    error = serializers.CharField(required=False, allow_blank=True)


class VacationPaymentLineSerializer(serializers.ModelSerializer):
    """
    Serializador para líneas de detalle del pago de vacaciones.
    """
    kind_display = serializers.SerializerMethodField()

    class Meta:
        from vacations.models import VacationPaymentLine
        model = VacationPaymentLine
        fields = [
            'id',
            'concept_code',
            'concept_name',
            'kind',
            'kind_display',
            'days',
            'daily_rate',
            'amount_ves',
            'amount_usd_ref',
            'percentage',
        ]
        read_only_fields = fields

    def get_kind_display(self, obj):
        return obj.get_kind_display()


class VacationPaymentSerializer(serializers.ModelSerializer):
    """
    Serializador para VacationPayment.
    
    Todos los campos son de solo lectura ya que VacationPayment es inmutable.
    Incluye líneas de detalle (receipt lines) como nested serializer.
    """
    
    # Campos computados
    employee_name = serializers.SerializerMethodField()
    employee_document = serializers.SerializerMethodField()
    request_start_date = serializers.SerializerMethodField()
    request_end_date = serializers.SerializerMethodField()
    lines = VacationPaymentLineSerializer(many=True, read_only=True)
    
    class Meta:
        from vacations.models import VacationPayment
        model = VacationPayment
        fields = [
            'id',
            'vacation_request',
            'employee_name',
            'employee_document',
            'request_start_date',
            'request_end_date',
            'payment_date',
            'daily_salary',
            # Días
            'vacation_days',
            'rest_days',
            'holiday_days',
            'bonus_days',
            # Montos devengados (moneda original)
            'vacation_amount',
            'rest_amount',
            'holiday_amount',
            'bonus_amount',
            'gross_amount',
            # Deducciones
            'ivss_deduction',
            'faov_deduction',
            'rpe_deduction',
            'total_deductions',
            # Neto
            'net_amount',
            # Moneda y totales VES inmutables
            'currency',
            'exchange_rate',
            'gross_amount_ves',
            'total_deductions_ves',
            'net_amount_ves',
            # Líneas de detalle (receipt lines)
            'lines',
            # Auditoría
            'calculation_trace',
            'created_at',
            'created_by',
        ]
        read_only_fields = fields
    
    def get_employee_name(self, obj):
        return obj.vacation_request.employee.full_name
    
    def get_employee_document(self, obj):
        return obj.vacation_request.employee.national_id
    
    def get_request_start_date(self, obj):
        return obj.vacation_request.start_date
    
    def get_request_end_date(self, obj):
        return obj.vacation_request.end_date
