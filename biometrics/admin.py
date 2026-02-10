"""
Admin para el módulo de biometría.
"""
from django.contrib import admin
from .models import (
    BiometricDeviceType,
    BiometricDevice,
    AttendanceEvent,
    EmployeeDeviceMapping,
)


@admin.register(BiometricDeviceType)
class BiometricDeviceTypeAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'protocol', 'is_active']
    list_filter = ['is_active', 'protocol']
    search_fields = ['name', 'display_name']


@admin.register(BiometricDevice)
class BiometricDeviceAdmin(admin.ModelAdmin):
    list_display = [
        'name', 'device_type', 'ip_address', 'port', 
        'location', 'status', 'is_active', 'last_sync'
    ]
    list_filter = ['status', 'is_active', 'device_type']
    search_fields = ['name', 'ip_address', 'location', 'serial_number']
    readonly_fields = [
        'serial_number', 'firmware_version', 'model_name', 
        'status', 'status_detail', 'last_sync', 'last_event_time',
        'created_at', 'updated_at'
    ]


@admin.register(AttendanceEvent)
class AttendanceEventAdmin(admin.ModelAdmin):
    list_display = [
        'employee_device_id', 'employee', 'event_type', 
        'verification_mode', 'timestamp', 'device'
    ]
    list_filter = ['event_type', 'verification_mode', 'device', 'timestamp']
    search_fields = ['employee_device_id', 'employee_name_device']
    readonly_fields = ['synced_at', 'raw_data']
    date_hierarchy = 'timestamp'


@admin.register(EmployeeDeviceMapping)
class EmployeeDeviceMappingAdmin(admin.ModelAdmin):
    list_display = [
        'employee', 'device', 'device_employee_id', 
        'is_enrolled', 'enrolled_at'
    ]
    list_filter = ['is_enrolled', 'device']
    search_fields = ['device_employee_id', 'employee__first_name', 'employee__last_name']
