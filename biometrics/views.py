"""
Views para el módulo de biometría.

Endpoints:
- /api/biometric/device-types/         → CRUD tipos de dispositivo
- /api/biometric/devices/              → CRUD dispositivos
- /api/biometric/devices/{id}/test/    → Probar conexión
- /api/biometric/devices/{id}/sync/    → Sincronizar eventos
- /api/biometric/events/               → Listar eventos de asistencia
- /api/biometric/mappings/             → Mapear empleados ↔ dispositivos
"""
from datetime import datetime, timedelta
from rest_framework.pagination import PageNumberPagination

from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    BiometricDeviceType,
    BiometricDevice,
    AttendanceEvent,
    EmployeeDeviceMapping,
)
from .serializers import (
    BiometricDeviceTypeSerializer,
    BiometricDeviceSerializer,
    BiometricDeviceListSerializer,
    AttendanceEventSerializer,
    EmployeeDeviceMappingSerializer,
    SyncResultSerializer,
    DeviceTestResultSerializer,
)
from .services.sync_service import BiometricSyncService
from .services.daily_attendance import DailyAttendanceService

import logging

logger = logging.getLogger(__name__)


class BiometricDeviceTypeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de tipos de dispositivos biométricos.
    
    GET    /api/biometric/device-types/     → Listar tipos
    POST   /api/biometric/device-types/     → Crear tipo
    PUT    /api/biometric/device-types/{id}/ → Actualizar tipo
    DELETE /api/biometric/device-types/{id}/ → Eliminar tipo
    """
    queryset = BiometricDeviceType.objects.all()
    serializer_class = BiometricDeviceTypeSerializer
    permission_classes = [permissions.IsAuthenticated]


class BiometricDeviceViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de dispositivos biométricos.
    
    CRUD completo + acciones especiales:
    - test_connection: Probar conexión con el dispositivo.
    - sync_events: Sincronizar eventos del dispositivo.
    - sync_all: Sincronizar todos los dispositivos activos.
    - device_users: Consultar usuarios registrados en el dispositivo.
    """
    queryset = BiometricDevice.objects.select_related('device_type').all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'ip_address', 'location', 'serial_number']
    ordering_fields = ['name', 'status', 'last_sync', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return BiometricDeviceListSerializer
        return BiometricDeviceSerializer
    
    @action(detail=True, methods=['post'])
    def test_connection(self, request, pk=None):
        """
        Probar la conexión con un dispositivo biométrico.
        
        POST /api/biometric/devices/{id}/test/
        """
        device = self.get_object()
        result = BiometricSyncService.test_device_connection(device)
        serializer = DeviceTestResultSerializer(result)
        
        if result['status'] == 'ok':
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.data, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    @action(detail=True, methods=['post'])
    def sync_events(self, request, pk=None):
        """
        Sincronizar eventos de un dispositivo.
        
        POST /api/biometric/devices/{id}/sync/
        
        Body (opcional):
        {
            "start_time": "2026-02-01T00:00:00",
            "end_time": "2026-02-10T23:59:59"
        }
        """
        device = self.get_object()
        
        start_time = None
        end_time = None
        
        if request.data.get('start_time'):
            try:
                start_time = datetime.fromisoformat(request.data['start_time'])
            except ValueError:
                return Response(
                    {'error': 'Formato de start_time inválido. Use ISO 8601.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if request.data.get('end_time'):
            try:
                end_time = datetime.fromisoformat(request.data['end_time'])
            except ValueError:
                return Response(
                    {'error': 'Formato de end_time inválido. Use ISO 8601.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        result = BiometricSyncService.sync_device_events(
            device=device,
            start_time=start_time,
            end_time=end_time,
        )
        
        serializer = SyncResultSerializer(result)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def sync_all(self, request):
        """
        Sincronizar todos los dispositivos activos.
        
        POST /api/biometric/devices/sync_all/
        """
        results = BiometricSyncService.sync_all_devices()
        serializer = SyncResultSerializer(results, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def get_events(self, request, pk=None):
        """
        Obtener eventos de asistencia directamente del dispositivo (sin guardar).
        Útil para visualizar data cruda y debugging.
        
        GET /api/biometric/devices/{id}/get_events/?page=1&page_size=50&start_time=X&end_time=Y
        """
        device = self.get_object()
        
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 50))
        except ValueError:
            return Response(
                {'error': 'Parámetros de paginación inválidos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        start_time = None
        end_time = None
        
        if request.query_params.get('start_time'):
            try:
                start_time = datetime.fromisoformat(request.query_params.get('start_time'))
            except ValueError:
                pass
                
        if request.query_params.get('end_time'):
            try:
                end_time = datetime.fromisoformat(request.query_params.get('end_time'))
            except ValueError:
                pass
                
        # page is 1-indexed for frontend, but 0-indexed for ISAPI
        page_no = max(0, page - 1)
            
        try:
            result = BiometricSyncService.get_device_events(
                device=device,
                start_time=start_time,
                end_time=end_time,
                page_no=page_no,
                page_size=page_size
            )
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    @action(detail=True, methods=['get'])
    def device_users(self, request, pk=None):
        """
        Consultar los usuarios registrados directamente en el dispositivo.
        
        GET /api/biometric/devices/{id}/device_users/
        """
        device = self.get_object()
        
        try:
            client = BiometricSyncService.get_client(device)
            result = client.search_users_all()
            return Response(result)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class EventPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class AttendanceEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para consultar eventos de asistencia (solo lectura).
    
    GET /api/biometric/events/                    → Listar eventos
    GET /api/biometric/events/?employee={id}      → Filtrar por empleado
    GET /api/biometric/events/?device={id}        → Filtrar por dispositivo
    GET /api/biometric/events/?date_from=X&date_to=Y → Filtrar por fecha
    GET /api/biometric/events/?page=N&page_size=M → Paginación
    """
    serializer_class = AttendanceEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = EventPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['timestamp', 'employee', 'event_type']
    ordering = ['-timestamp']

    
    def get_queryset(self):
        queryset = AttendanceEvent.objects.select_related(
            'device', 'employee'
        ).all()
        
        # Filtros por query params
        employee_id = self.request.query_params.get('employee')
        device_id = self.request.query_params.get('device')
        event_type = self.request.query_params.get('event_type')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        if device_id:
            queryset = queryset.filter(device_id=device_id)
        
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        
        if date_from:
            try:
                if len(date_from) == 10:
                    queryset = queryset.filter(timestamp__date__gte=date_from)
                else:
                    date_from_parsed = datetime.fromisoformat(date_from)
                    queryset = queryset.filter(timestamp__gte=date_from_parsed)
            except (ValueError, TypeError):
                pass
        
        if date_to:
            try:
                if len(date_to) == 10:
                    queryset = queryset.filter(timestamp__date__lte=date_to)
                else:
                    date_to_parsed = datetime.fromisoformat(date_to)
                    queryset = queryset.filter(timestamp__lte=date_to_parsed)
            except (ValueError, TypeError):
                pass
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Resumen de asistencia por fecha.
        
        GET /api/biometric/events/summary/?date=2026-02-10
        """
        date_str = request.query_params.get('date')
        
        if not date_str:
            date_str = timezone.now().date().isoformat()
        
        try:
            target_date = datetime.fromisoformat(date_str).date()
        except ValueError:
            return Response(
                {'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        events = AttendanceEvent.objects.filter(
            timestamp__date=target_date
        ).select_related('employee', 'device')
        
        summary = {
            'date': date_str,
            'total_events': events.count(),
            'entries': events.filter(event_type='entry').count(),
            'exits': events.filter(event_type='exit').count(),
            'unique_employees': events.values('employee').distinct().count(),
        }
        
        return Response(summary)


class EmployeeDeviceMappingViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de mapeos empleado-dispositivo.
    
    CRUD para asociar empleados del sistema con sus IDs en los huelleros.
    """
    queryset = EmployeeDeviceMapping.objects.select_related(
        'employee', 'device'
    ).all()
    serializer_class = EmployeeDeviceMappingSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['employee__first_name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        device_id = self.request.query_params.get('device')
        employee_id = self.request.query_params.get('employee')
        
        if device_id:
            queryset = queryset.filter(device_id=device_id)
        
        
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        return queryset


class DailyAttendanceViewSet(viewsets.ViewSet):
    """
    ViewSet para consultar la asistencia diaria agregada.
    
    GET /api/biometric/daily-attendance/?date=YYYY-MM-DD
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def list(self, request):
        date_str = request.query_params.get('date')
        
        if not date_str:
            target_date = timezone.now().date()
        else:
            try:
                target_date = datetime.fromisoformat(date_str).date()
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha inválido. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        branch_id = request.query_params.get('branch')
        search_query = request.query_params.get('search')
        tz_name = request.query_params.get('tz')
        
        try:
            summary = DailyAttendanceService.get_daily_summary(
                target_date, 
                branch_id=branch_id, 
                search_query=search_query,
                tz_name=tz_name
            )
            return Response(summary)
        except Exception as e:
            logger.exception("Error generating daily attendance summary")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
