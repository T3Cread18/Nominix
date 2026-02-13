"""
Serializers para el módulo de biometría.
"""
from rest_framework import serializers
from .models import (
    BiometricDeviceType,
    BiometricDevice,
    AttendanceEvent,
    EmployeeDeviceMapping,
)


class BiometricDeviceTypeSerializer(serializers.ModelSerializer):
    """Serializer para tipos de dispositivos biométricos."""
    
    class Meta:
        model = BiometricDeviceType
        fields = ['id', 'name', 'display_name', 'protocol', 'is_active']
        read_only_fields = ['id']


class BiometricDeviceSerializer(serializers.ModelSerializer):
    """Serializer para dispositivos biométricos."""
    device_type_name = serializers.CharField(
        source='device_type.display_name', 
        read_only=True
    )
    protocol = serializers.CharField(
        source='device_type.protocol', 
        read_only=True
    )
    total_events = serializers.SerializerMethodField()
    mapped_employees = serializers.SerializerMethodField()
    
    class Meta:
        model = BiometricDevice
        fields = [
            'id', 'name', 'device_type', 'device_type_name', 'protocol',
            'ip_address', 'port', 'username', 'password',
            'serial_number', 'firmware_version', 'model_name', 'location',
            'is_active', 'last_sync', 'last_event_time', 'status', 'status_detail',
            'total_events', 'mapped_employees',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'serial_number', 'firmware_version', 'model_name',
            'last_sync', 'last_event_time', 'status', 'status_detail',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'password': {'write_only': True},
        }
    
    def get_total_events(self, obj):
        return obj.events.count()
    
    def get_mapped_employees(self, obj):
        return obj.employee_mappings.count()


class BiometricDeviceListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listar dispositivos."""
    device_type_name = serializers.CharField(
        source='device_type.display_name', 
        read_only=True
    )
    
    class Meta:
        model = BiometricDevice
        fields = [
            'id', 'name', 'device_type_name', 'ip_address', 
            'location', 'is_active', 'status', 'last_sync',
        ]


class AttendanceEventSerializer(serializers.ModelSerializer):
    """Serializer para eventos de asistencia."""
    device_name = serializers.CharField(
        source='device.name', 
        read_only=True
    )
    employee_name = serializers.SerializerMethodField()
    employee_cedula = serializers.SerializerMethodField()
    event_type_display = serializers.CharField(
        source='get_event_type_display', 
        read_only=True
    )
    verification_mode_display = serializers.CharField(
        source='get_verification_mode_display', 
        read_only=True
    )
    
    class Meta:
        model = AttendanceEvent
        fields = [
            'id', 'device', 'device_name',
            'employee', 'employee_name', 'employee_cedula',
            'employee_device_id', 'employee_name_device',
            'event_type', 'event_type_display',
            'verification_mode', 'verification_mode_display',
            'timestamp', 'synced_at',
        ]
        read_only_fields = ['id', 'synced_at']
    
    def get_employee_name(self, obj):
        if obj.employee:
            return f"{obj.employee.first_name} {obj.employee.last_name}"
        return obj.employee_name_device or f"ID: {obj.employee_device_id}"
    
    def get_employee_cedula(self, obj):
        if obj.employee:
            return obj.employee.national_id
        return None


class EmployeeDeviceMappingSerializer(serializers.ModelSerializer):
    """Serializer para mapeo empleado-dispositivo."""
    employee_name = serializers.SerializerMethodField()
    employee_cedula = serializers.SerializerMethodField()
    device_name = serializers.CharField(
        source='device.name', 
        read_only=True
    )
    
    class Meta:
        model = EmployeeDeviceMapping
        fields = [
            'id', 'employee', 'employee_name', 'employee_cedula',
            'device', 'device_name',
            'device_employee_id', 'is_enrolled', 'enrolled_at',
            'created_at',
        ]
        read_only_fields = ['id', 'enrolled_at', 'created_at']
    
    def get_employee_name(self, obj):
        return f"{obj.employee.first_name} {obj.employee.last_name}"
    
    def get_employee_cedula(self, obj):
        return obj.employee.national_id


class SyncResultSerializer(serializers.Serializer):
    """Serializer para resultados de sincronización."""
    device = serializers.CharField()
    start_time = serializers.CharField()
    end_time = serializers.CharField()
    total_downloaded = serializers.IntegerField()
    new_events = serializers.IntegerField()
    duplicates = serializers.IntegerField()
    mapped_to_employees = serializers.IntegerField()
    unmapped = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.CharField())


class DeviceTestResultSerializer(serializers.Serializer):
    """Serializer para resultado de test de conexión."""
    status = serializers.CharField()
    device_info = serializers.DictField(required=False)
    error_type = serializers.CharField(required=False)
    message = serializers.CharField()
