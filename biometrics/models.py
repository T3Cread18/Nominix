"""
Modelos para el módulo de integración biométrica.

Gestiona dispositivos biométricos (huelleros), eventos de asistencia,
y el mapeo entre empleados del sistema y sus IDs en los dispositivos.
"""
from django.db import models
from django.utils import timezone


class BiometricDeviceType(models.Model):
    """
    Tipo/marca de dispositivo biométrico.
    
    Ejemplos: Hikvision, ZKTeco, Suprema, etc.
    Define qué protocolo de comunicación usar.
    """
    PROTOCOL_CHOICES = [
        ('isapi', 'Hikvision ISAPI (HTTP/REST)'),
        ('pull_sdk', 'ZKTeco Pull SDK'),
        ('push', 'Push Event (Webhook)'),
    ]

    name = models.CharField(
        max_length=50, 
        unique=True,
        verbose_name='Identificador',
        help_text='Clave interna: hikvision, zkteco, etc.'
    )
    display_name = models.CharField(
        max_length=100,
        verbose_name='Nombre para mostrar',
        help_text='Nombre legible: Hikvision ISAPI'
    )
    protocol = models.CharField(
        max_length=20, 
        choices=PROTOCOL_CHOICES,
        verbose_name='Protocolo'
    )
    is_active = models.BooleanField(default=True, verbose_name='Activo')

    class Meta:
        verbose_name = 'Tipo de Dispositivo Biométrico'
        verbose_name_plural = 'Tipos de Dispositivos Biométricos'
        ordering = ['display_name']

    def __str__(self):
        return self.display_name


class BiometricDevice(models.Model):
    """
    Dispositivo biométrico físico registrado en el sistema.
    
    Almacena la configuración de conexión (IP, credenciales)
    y el estado actual del dispositivo.
    """
    STATUS_CHOICES = [
        ('online', 'En línea'),
        ('offline', 'Fuera de línea'),
        ('error', 'Error'),
        ('unknown', 'Desconocido'),
    ]

    name = models.CharField(
        max_length=100,
        verbose_name='Nombre del dispositivo',
        help_text='Ej: Huellero Entrada Principal'
    )
    device_type = models.ForeignKey(
        BiometricDeviceType,
        on_delete=models.PROTECT,
        related_name='devices',
        verbose_name='Tipo de dispositivo'
    )
    ip_address = models.GenericIPAddressField(verbose_name='Dirección IP')
    port = models.IntegerField(default=80, verbose_name='Puerto')
    username = models.CharField(
        max_length=50, 
        default='admin',
        verbose_name='Usuario del dispositivo'
    )
    password = models.CharField(
        max_length=255,
        verbose_name='Contraseña',
        help_text='Contraseña del dispositivo biométrico'
    )
    serial_number = models.CharField(
        max_length=100, 
        blank=True, 
        default='',
        verbose_name='Número de serie'
    )
    firmware_version = models.CharField(
        max_length=50, 
        blank=True, 
        default='',
        verbose_name='Versión de firmware'
    )
    model_name = models.CharField(
        max_length=100, 
        blank=True, 
        default='',
        verbose_name='Modelo'
    )
    location = models.CharField(
        max_length=200, 
        blank=True, 
        default='',
        verbose_name='Ubicación',
        help_text='Ej: Puerta principal, Piso 2'
    )
    timezone = models.CharField(
        max_length=50,
        default='America/Caracas',
        verbose_name='Zona Horaria',
        help_text='Zona horaria del dispositivo (ej: UTC, America/Caracas)'
    )
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    last_sync = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name='Última sincronización'
    )
    last_event_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Último evento registrado',
        help_text='Timestamp del último evento descargado (para sincronización incremental)'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES,
        default='unknown',
        verbose_name='Estado'
    )
    status_detail = models.TextField(
        blank=True, 
        default='',
        verbose_name='Detalle del estado',
        help_text='Mensaje de error o información adicional'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Dispositivo Biométrico'
        verbose_name_plural = 'Dispositivos Biométricos'
        ordering = ['name']
        unique_together = ['ip_address', 'port']

    def __str__(self):
        return f"{self.name} ({self.ip_address})"

    def mark_online(self, device_info=None):
        """Marcar dispositivo como en línea y actualizar info."""
        self.status = 'online'
        self.status_detail = ''
        if device_info:
            self.serial_number = device_info.get('serial_number', self.serial_number)
            self.firmware_version = device_info.get('firmware_version', self.firmware_version)
            self.model_name = device_info.get('model_name', self.model_name)
        self.save(update_fields=['status', 'status_detail', 'serial_number', 
                                  'firmware_version', 'model_name', 'updated_at'])

    def mark_offline(self, error_message=''):
        """Marcar dispositivo como fuera de línea."""
        self.status = 'offline'
        self.status_detail = error_message
        self.save(update_fields=['status', 'status_detail', 'updated_at'])

    def mark_error(self, error_message):
        """Marcar dispositivo con error."""
        self.status = 'error'
        self.status_detail = error_message
        self.save(update_fields=['status', 'status_detail', 'updated_at'])


class AttendanceEvent(models.Model):
    """
    Evento de asistencia capturado de un dispositivo biométrico.
    
    Registra cada interacción de un empleado con el huellero
    (entrada, salida, marcaje desconocido).
    """
    EVENT_TYPES = [
        ('entry', 'Entrada'),
        ('exit', 'Salida'),
        ('break_start', 'Inicio Descanso'),
        ('break_end', 'Fin Descanso'),
        ('unknown', 'Desconocido'),
    ]
    VERIFICATION_MODES = [
        ('fingerprint', 'Huella Dactilar'),
        ('card', 'Tarjeta'),
        ('face', 'Reconocimiento Facial'),
        ('password', 'Contraseña'),
        ('combined', 'Combinado'),
        ('other', 'Otro'),
    ]

    device = models.ForeignKey(
        BiometricDevice,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='events',
        verbose_name='Dispositivo'
    )
    employee = models.ForeignKey(
        'payroll_core.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_events',
        verbose_name='Empleado',
        help_text='Se asocia automáticamente vía EmployeeDeviceMapping'
    )
    employee_device_id = models.CharField(
        max_length=50,
        verbose_name='ID en dispositivo',
        help_text='Número de empleado registrado en el huellero'
    )
    employee_name_device = models.CharField(
        max_length=100,
        blank=True,
        default='',
        verbose_name='Nombre en dispositivo',
        help_text='Nombre registrado en el huellero (para referencia)'
    )
    event_type = models.CharField(
        max_length=15, 
        choices=EVENT_TYPES,
        default='unknown',
        verbose_name='Tipo de evento'
    )
    verification_mode = models.CharField(
        max_length=20,
        choices=VERIFICATION_MODES,
        default='other',
        verbose_name='Modo de verificación'
    )
    timestamp = models.DateTimeField(
        verbose_name='Fecha y hora del evento',
        help_text='Timestamp del evento en el dispositivo'
    )
    raw_data = models.JSONField(
        default=dict, 
        blank=True,
        verbose_name='Datos crudos',
        help_text='Respuesta original del dispositivo (para debug)'
    )
    synced_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Sincronizado el'
    )

    class Meta:
        verbose_name = 'Evento de Asistencia'
        verbose_name_plural = 'Eventos de Asistencia'
        ordering = ['-timestamp']
        unique_together = ['device', 'employee_device_id', 'timestamp']
        indexes = [
            models.Index(fields=['timestamp']),
            models.Index(fields=['employee', 'timestamp']),
            models.Index(fields=['employee_device_id']),
        ]

    def __str__(self):
        emp = self.employee or self.employee_device_id
        return f"{emp} - {self.get_event_type_display()} @ {self.timestamp}"


class EmployeeDeviceMapping(models.Model):
    """
    Mapeo entre un empleado del sistema y su ID en un dispositivo biométrico.
    
    Cada empleado puede estar registrado en múltiples dispositivos,
    cada uno con un ID diferente.
    """
    employee = models.ForeignKey(
        'payroll_core.Employee',
        on_delete=models.CASCADE,
        related_name='device_mappings',
        verbose_name='Empleado'
    )
    device = models.ForeignKey(
        BiometricDevice,
        on_delete=models.CASCADE,
        related_name='employee_mappings',
        verbose_name='Dispositivo'
    )
    device_employee_id = models.CharField(
        max_length=50,
        verbose_name='ID del empleado en el dispositivo',
        help_text='Número asignado al empleado en el huellero'
    )
    is_enrolled = models.BooleanField(
        default=False,
        verbose_name='Huella registrada',
        help_text='¿El empleado tiene su huella capturada en este dispositivo?'
    )
    enrolled_at = models.DateTimeField(
        null=True, 
        blank=True,
        verbose_name='Fecha de registro de huella'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Mapeo Empleado-Dispositivo'
        verbose_name_plural = 'Mapeos Empleado-Dispositivo'
        unique_together = ['employee', 'device']
        ordering = ['employee', 'device']

    def __str__(self):
        return f"{self.employee} → {self.device.name} (ID: {self.device_employee_id})"
