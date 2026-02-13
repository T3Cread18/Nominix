"""
Servicio de sincronización biométrica.

Orquesta la descarga de eventos desde dispositivos biométricos
y su almacenamiento en la base de datos local.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

from django.utils import timezone
from django.db import IntegrityError

from biometrics.models import (
    BiometricDevice, 
    AttendanceEvent, 
    EmployeeDeviceMapping,
)
from biometrics.services.hikvision_client import (
    HikvisionClient,
    HikvisionConnectionError,
    HikvisionAuthError,
)

logger = logging.getLogger(__name__)


class BiometricSyncService:
    """
    Servicio para sincronizar eventos de asistencia.
    
    Maneja la lógica de:
    1. Conectar con un dispositivo biométrico.
    2. Descargar eventos nuevos (desde la última sincronización).
    3. Asociar eventos con empleados del sistema.
    4. Guardar en la base de datos.
    """
    
    @staticmethod
    def get_client(device: BiometricDevice) -> HikvisionClient:
        """
        Crear el cliente adecuado según el tipo de dispositivo.
        
        Actualmente solo soporta Hikvision ISAPI.
        Extensible para ZKTeco, Suprema, etc.
        """
        protocol = device.device_type.protocol
        
        if protocol == 'isapi':
            return HikvisionClient(
                ip=device.ip_address,
                port=device.port,
                username=device.username,
                password=device.password,
            )
        else:
            raise ValueError(
                f"Protocolo '{protocol}' no soportado. "
                f"Protocolos disponibles: isapi"
            )
    
    @classmethod
    def test_device_connection(cls, device: BiometricDevice) -> Dict[str, Any]:
        """
        Probar la conexión con un dispositivo.
        
        Returns:
            dict con status ('ok' o 'error') y device_info o error_message.
        """
        try:
            client = cls.get_client(device)
            device_info = client.test_connection()
            
            # Actualizar estado del dispositivo
            device.mark_online(device_info)
            
            return {
                'status': 'ok',
                'device_info': device_info,
                'message': f"Conexión exitosa con {device.name}",
            }
            
        except HikvisionAuthError as e:
            device.mark_error(str(e))
            return {
                'status': 'error',
                'error_type': 'auth',
                'message': str(e),
            }
            
        except HikvisionConnectionError as e:
            device.mark_offline(str(e))
            return {
                'status': 'error',
                'error_type': 'connection',
                'message': str(e),
            }
            
        except Exception as e:
            device.mark_error(str(e))
            return {
                'status': 'error',
                'error_type': 'unknown',
                'message': f"Error inesperado: {str(e)}",
            }
        
    @classmethod
    def get_device_events(
        cls,
        device: BiometricDevice,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        page_no: int = 0,
        page_size: int = 50,
    ) -> Dict[str, Any]:
        """
        Obtener eventos directamente del dispositivo (sin guardar en BD).
        Useful para visualizar la data cruda.
        """
        if end_time is None:
            end_time = timezone.now()
        
        if start_time is None:
            # Default: última semana
            start_time = end_time - timedelta(days=7)
            
        try:
            client = cls.get_client(device)
            return client.search_events(
                start_time=start_time,
                end_time=end_time,
                page_no=page_no,
                page_size=page_size
            )
        except Exception as e:
            logger.error(f"Error getting device events: {e}")
            raise
    
    @classmethod
    def sync_device_events(
        cls, 
        device: BiometricDevice,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Sincronizar eventos de un dispositivo.
        
        Descarga todos los eventos nuevos desde la última sincronización
        (o desde `start_time` si se especifica) y los guarda en la BD.
        
        Args:
            device: Dispositivo a sincronizar.
            start_time: Fecha inicio (default: last_event_time o hace 7 días).
            end_time: Fecha fin (default: ahora).
        
        Returns:
            dict con estadísticas de sincronización.
        """
        # Determinar rango de fechas
        if end_time is None:
            end_time = timezone.now()
        
        if start_time is None:
            if device.last_event_time:
                # Desde el último evento + 1 segundo para evitar duplicados
                start_time = device.last_event_time + timedelta(seconds=1)
            else:
                # Primera sincronización: últimos 7 días
                start_time = end_time - timedelta(days=7)
        
        logger.info(
            f"Sincronizando {device.name}: "
            f"{start_time.isoformat()} → {end_time.isoformat()}"
        )
        
        stats = {
            'device': device.name,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'total_downloaded': 0,
            'new_events': 0,
            'duplicates': 0,
            'mapped_to_employees': 0,
            'unmapped': 0,
            'errors': [],
        }
        
        try:
            client = cls.get_client(device)
            events = client.search_events_all(
                start_time=start_time,
                end_time=end_time,
            )
            
            stats['total_downloaded'] = len(events)
            
            if not events:
                device.last_sync = timezone.now()
                device.save(update_fields=['last_sync', 'updated_at'])
                device.mark_online()
                return stats
            
            # Obtener mapeos de empleados para este dispositivo
            mappings = {
                m.device_employee_id: m.employee
                for m in EmployeeDeviceMapping.objects.filter(
                    device=device
                ).select_related('employee')
            }
            
            latest_event_time = None
            
            for event_data in events:
                try:
                    employee_device_id = event_data['employee_device_id']
                    
                    # Buscar empleado mapeado
                    employee = mappings.get(employee_device_id)
                    
                    event, created = AttendanceEvent.objects.get_or_create(
                        device=device,
                        employee_device_id=employee_device_id,
                        timestamp=event_data['timestamp'],
                        defaults={
                            'employee': employee,
                            'employee_name_device': event_data.get('employee_name', ''),
                            'event_type': event_data['event_type'],
                            'verification_mode': event_data['verification_mode'],
                            'raw_data': event_data.get('raw_data', {}),
                        }
                    )
                    
                    if created:
                        stats['new_events'] += 1
                        if employee:
                            stats['mapped_to_employees'] += 1
                        else:
                            stats['unmapped'] += 1
                        
                        # Rastrear el evento más reciente
                        if latest_event_time is None or event_data['timestamp'] > latest_event_time:
                            latest_event_time = event_data['timestamp']
                    else:
                        stats['duplicates'] += 1
                        
                except IntegrityError:
                    stats['duplicates'] += 1
                except Exception as e:
                    stats['errors'].append(str(e))
                    logger.warning(f"Error procesando evento: {e}")
            
            # Actualizar estado del dispositivo
            device.last_sync = timezone.now()
            if latest_event_time:
                device.last_event_time = latest_event_time
            device.save(update_fields=['last_sync', 'last_event_time', 'updated_at'])
            device.mark_online()
            
            logger.info(
                f"Sincronización completada para {device.name}: "
                f"{stats['new_events']} nuevos, {stats['duplicates']} duplicados"
            )
            
        except (HikvisionConnectionError, HikvisionAuthError) as e:
            stats['errors'].append(str(e))
            device.mark_error(str(e))
            
        except Exception as e:
            stats['errors'].append(f"Error inesperado: {str(e)}")
            device.mark_error(str(e))
            logger.exception(f"Error sincronizando {device.name}")
        
        return stats
    
    @classmethod
    def sync_all_devices(cls) -> List[Dict[str, Any]]:
        """
        Sincronizar todos los dispositivos activos.
        
        Returns:
            Lista de estadísticas de sincronización por dispositivo.
        """
        devices = BiometricDevice.objects.filter(is_active=True)
        results = []
        
        for device in devices:
            result = cls.sync_device_events(device)
            results.append(result)
        
        return results
