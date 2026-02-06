# -*- coding: utf-8 -*-
"""
Admin del módulo de Vacaciones.
"""
from django.contrib import admin
from .models import VacationRequest, VacationBalance


@admin.register(VacationRequest)
class VacationRequestAdmin(admin.ModelAdmin):
    """Admin para solicitudes de vacaciones."""
    
    list_display = [
        'id',
        'employee',
        'start_date',
        'end_date',
        'days_requested',
        'status',
        'vacation_type',
        'created_at',
    ]
    list_filter = ['status', 'vacation_type', 'start_date']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__national_id']
    date_hierarchy = 'start_date'
    readonly_fields = ['return_date', 'approved_at', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Información del Empleado', {
            'fields': ('employee', 'contract')
        }),
        ('Período de Vacaciones', {
            'fields': ('start_date', 'end_date', 'days_requested', 'return_date')
        }),
        ('Estado y Clasificación', {
            'fields': ('status', 'vacation_type')
        }),
        ('Aprobación', {
            'fields': ('approved_by', 'approved_at', 'notes'),
            'classes': ('collapse',)
        }),
        ('Auditoría', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(VacationBalance)
class VacationBalanceAdmin(admin.ModelAdmin):
    """Admin para kardex de vacaciones."""
    
    list_display = [
        'id',
        'employee',
        'period_year',
        'transaction_type',
        'days',
        'transaction_date',
        'created_by',
    ]
    list_filter = ['transaction_type', 'period_year', 'transaction_date']
    search_fields = ['employee__first_name', 'employee__last_name', 'employee__national_id']
    date_hierarchy = 'transaction_date'
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Empleado', {
            'fields': ('employee', 'related_request')
        }),
        ('Movimiento', {
            'fields': ('period_year', 'transaction_type', 'days', 'transaction_date', 'description')
        }),
        ('Auditoría', {
            'fields': ('created_by', 'created_at'),
            'classes': ('collapse',)
        }),
    )


from .models import Holiday


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    """Admin para feriados."""
    
    list_display = ['id', 'date', 'name', 'is_national', 'is_recurring']
    list_filter = ['is_national', 'is_recurring', 'date']
    search_fields = ['name']
    date_hierarchy = 'date'
    ordering = ['date']
