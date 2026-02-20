"""
Cliente Python para dispositivos Hikvision vía protocolo ISAPI.

Usa HTTP con Digest Authentication para comunicarse con terminales
biométricos de control de acceso (huelleros, lectores faciales).

Endpoints ISAPI documentados:
- /ISAPI/System/deviceInfo              → Info del dispositivo
- /ISAPI/AccessControl/AcsEvent         → Eventos de acceso
- /ISAPI/AccessControl/UserInfo/Search  → Buscar usuarios registrados
- /ISAPI/AccessControl/UserInfo/Record  → Registrar usuario
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import requests
from requests.auth import HTTPDigestAuth

logger = logging.getLogger(__name__)


class HikvisionConnectionError(Exception):
    """Error de conexión con dispositivo Hikvision."""
    pass


class HikvisionAuthError(Exception):
    """Error de autenticación con dispositivo Hikvision."""
    pass


class HikvisionClient:
    """
    Cliente para comunicación con dispositivos Hikvision vía ISAPI.
    
    Ejemplo de uso:
        client = HikvisionClient('192.168.1.100', 80, 'admin', 'password123')
        info = client.get_device_info()
        events = client.search_events(start_time, end_time)
    """
    
    TIMEOUT = 30  # Timeout en segundos para requests (alto para dispositivos remotos)
    
    def __init__(self, ip: str, port: int, username: str, password: str, device_timezone: str = 'UTC'):
        self._ip = ip
        self._port = port
        self._username = username
        self._password = password
        self.base_url = f"http://{ip}:{port}"
        self.auth = HTTPDigestAuth(username, password)
        self.device_timezone = device_timezone
        self.session = requests.Session()
        self.session.auth = self.auth
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        })
    
    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        """Ejecutar un request HTTP al dispositivo."""
        url = f"{self.base_url}{path}"
        kwargs.setdefault('timeout', self.TIMEOUT)
        
        try:
            response = self.session.request(method, url, **kwargs)
            
            if response.status_code == 401:
                # Detectar bloqueo por intentos fallidos
                if '<lockStatus>lock</lockStatus>' in response.text:
                    retry_time = "desconocido"
                    if '<unlockTime>' in response.text:
                        try:
                            retry_time = response.text.split('<unlockTime>')[1].split('</unlockTime>')[0]
                        except IndexError:
                            pass
                    
                    raise HikvisionAuthError(
                        f"¡DISPOSITIVO BLOQUEADO! Demasiados intentos fallidos. "
                        f"Tiempo de espera: {retry_time} segundos."
                    )
                
                # Para depurar porqué Hikvision rechaza el query
                raise HikvisionAuthError(
                    f"401 Unauthorized en {path}. "
                    "Puede que el dispositivo rechace fechas muy antiguas o la sesión expiró."
                )
            
            # Algunos endpoints retornan 200 OK pero con error en el cuerpo (JSON)
            if 'json' in response.headers.get('Content-Type', ''):
                try:
                    data = response.json()
                    if data.get('statusCode') != 1 and data.get('statusCode') is not None:
                         # 1 = OK en Hikvision ISAPI JSON
                         logger.warning(f"Hikvision JSON error: {data}")
                except ValueError:
                    pass

            response.raise_for_status()
            return response
            
        except requests.exceptions.ConnectionError as e:
            raise HikvisionConnectionError(
                f"No se pudo conectar al dispositivo en {self.base_url}. "
                f"Verifica IP, puerto y que el dispositivo esté encendido. Error: {e}"
            )
        except requests.exceptions.Timeout:
            raise HikvisionConnectionError(
                f"Timeout al conectar con {self.base_url}. "
                "El dispositivo no respondió a tiempo."
            )
        except HikvisionAuthError:
            raise
        except requests.exceptions.HTTPError as e:
            raise HikvisionConnectionError(
                f"Error HTTP {response.status_code} del dispositivo: {e}"
            )

    def test_connection(self) -> Dict[str, Any]:
        """
        Probar la conexión con el dispositivo.
        
        Returns:
            dict con info del dispositivo si la conexión es exitosa.
        
        Raises:
            HikvisionConnectionError: Si no se puede conectar.
            HikvisionAuthError: Si las credenciales son incorrectas.
        """
        return self.get_device_info()
    
    def get_device_info(self) -> Dict[str, Any]:
        """
        Obtener información del dispositivo.
        
        GET /ISAPI/System/deviceInfo
        
        Returns:
            dict con claves: device_name, serial_number, firmware_version,
                             model_name, mac_address
        """
        response = self._request('GET', '/ISAPI/System/deviceInfo')
        
        # ISAPI puede responder en XML o JSON según el dispositivo
        content_type = response.headers.get('Content-Type', '')
        
        if 'json' in content_type:
            data = response.json()
            return self._parse_device_info_json(data)
        else:
            # Parsear XML
            return self._parse_device_info_xml(response.text)
    
    def _parse_device_info_json(self, data: dict) -> Dict[str, Any]:
        """Parsear respuesta JSON de deviceInfo."""
        device_info = data.get('DeviceInfo', data)
        return {
            'device_name': device_info.get('deviceName', ''),
            'serial_number': device_info.get('serialNumber', ''),
            'firmware_version': device_info.get('firmwareVersion', ''),
            'model_name': device_info.get('model', ''),
            'mac_address': device_info.get('macAddress', ''),
        }
    
    def _parse_device_info_xml(self, xml_text: str) -> Dict[str, Any]:
        """Parsear respuesta XML de deviceInfo."""
        import xml.etree.ElementTree as ET
        
        # Remover namespace si existe
        xml_clean = xml_text
        if 'xmlns' in xml_text:
            import re
            xml_clean = re.sub(r'\sxmlns="[^"]+"', '', xml_text, count=1)
        
        root = ET.fromstring(xml_clean)
        
        def get_text(tag):
            el = root.find(tag)
            return el.text if el is not None and el.text else ''
        
        return {
            'device_name': get_text('deviceName'),
            'serial_number': get_text('serialNumber'),
            'firmware_version': get_text('firmwareVersion'),
            'model_name': get_text('model'),
            'mac_address': get_text('macAddress'),
        }

    def search_events(
        self, 
        start_time: datetime, 
        end_time: datetime,
        page_no: int = 0,
        page_size: int = 50,
        start_position: Optional[int] = None,
        major_event: int = 0,  # 0 = Todos los eventos
        minor_event: int = 0,  # 0 = Todos
        search_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Buscar eventos de acceso en el dispositivo.
        
        POST /ISAPI/AccessControl/AcsEvent?format=json
        
        Args:
            start_time: Fecha/hora de inicio.
            end_time: Fecha/hora de fin.
            page_no: Número de página (0-indexed). Usado si start_position es None.
            page_size: Eventos por página.
            start_position: Posición de inicio absoluta (override page_no).
            major_event: Tipo mayor (0 = todos, 5 = acceso válido).
            minor_event: Tipo menor (0 = todos los subtipos).
        
        Returns:
            dict con claves:
                - total: int, total de eventos encontrados.
                - events: list[dict], lista de eventos parseados.
        """
        # Formato de fecha ISAPI: 2026-02-10T00:00:00-04:00
        # Convertimos timezone de Django a formato ISO con offset
        def format_isapi_time(dt):
            import pytz
            
            if dt.tzinfo is None:
                # Si es naive, lo hacemos aware usando la timezone del dispositivo
                try:
                    tz = pytz.timezone(self.device_timezone)
                    dt = tz.localize(dt)
                except pytz.UnknownTimeZoneError:
                    dt = pytz.UTC.localize(dt)
            elif dt.tzinfo != pytz.timezone(self.device_timezone):
                # Si viene en otra zona (ej UTC), convertirlo a la del dispositivo
                try:
                    tz = pytz.timezone(self.device_timezone)
                    dt = dt.astimezone(tz)
                except pytz.UnknownTimeZoneError:
                    pass
            
            # strftime('%z') da "+0000" pero ISAPI quiere "+00:00"
            offset = dt.strftime('%z')
            if offset:
                offset_fmt = f"{offset[:3]}:{offset[3:]}"
            else:
                offset_fmt = "+00:00"
                
            return dt.strftime('%Y-%m-%dT%H:%M:%S') + offset_fmt
        
        start_str = format_isapi_time(start_time)
        end_str = format_isapi_time(end_time)
        
        # Calculate position
        position = start_position if start_position is not None else (page_no * page_size)
        
        # Consistent searchID is required for pagination across the same historical query
        final_search_id = search_id if search_id else f"s_{int(datetime.now().timestamp())}"

        payload = {
            "AcsEventCond": {
                "searchID": final_search_id,
                "searchResultPosition": position,
                "maxResults": page_size,
                "major": major_event,
                "minor": minor_event,
                "startTime": start_str,
                "endTime": end_str,
            }
        }
        
        response = self._request(
            'POST', 
            '/ISAPI/AccessControl/AcsEvent?format=json',
            json=payload
        )
        
        data = response.json()
        acs_event = data.get('AcsEvent', {})
        
        total = acs_event.get('totalMatches', 0)
        info_list = acs_event.get('InfoList', [])
        
        events = []
        for info in info_list:
            events.append(self._parse_event(info))
        
        return {
            'total': total,
            'events': events,
        }

    def search_events_all(
        self,
        start_time: datetime,
        end_time: datetime,
        page_size: int = 100,
        max_requests: int = 5000,  # 5000 requests * 100 events = 500k events max
    ) -> List[Dict[str, Any]]:
        """
        Buscar TODOS los eventos de acceso paginando automáticamente.
        
        ESTRATEGIA: Crear un HikvisionClient NUEVO por cada página.
        Esto imita exactamente el comportamiento del endpoint de 'raw events'
        que funciona perfectamente. Cada petición obtiene una sesión HTTP fresca
        con un nonce counter limpio, evitando el overflow de Digest Auth de Hikvision.
        
        Args:
            start_time: Fecha/hora de inicio.
            end_time: Fecha/hora de fin.
            page_size: Eventos por página.
            max_requests: Límite de seguridad para evitar loops infinitos.
        
        Returns:
            Lista plana de todos los eventos encontrados.
        """
        import time
        all_events = []
        position = 0
        
        # ID de búsqueda corto (max 16 chars para evitar bugs de Hikvision firmware)
        search_id = f"s_{int(time.time())}"
        
        for i in range(max_requests):
            try:
                # Crear un cliente FRESCO para cada página.
                # Esto es la clave: cada cliente crea su propia requests.Session,
                # lo que resetea el Nonce Count de Digest Auth a 0.
                fresh_client = HikvisionClient(
                    ip=self._ip,
                    port=self._port,
                    username=self._username,
                    password=self._password,
                    device_timezone=self.device_timezone,
                )
                
                result = fresh_client.search_events(
                    start_time=start_time,
                    end_time=end_time,
                    start_position=position,
                    page_size=page_size,
                    search_id=search_id,
                )
            except HikvisionAuthError as e:
                if i > 0:
                    logger.warning(
                        f"401 en página {i} (pos {position}): {e}. "
                        f"Retornando {len(all_events)} eventos extraídos."
                    )
                    break
                else:
                    raise HikvisionAuthError(
                        f"Falló al iniciar la extracción (Fecha: {start_time}): {e}"
                    )
            
            events = result.get('events', [])
            total = result.get('total', 0)
            
            if not events:
                break
                
            all_events.extend(events)
            position += len(events)
            
            # Si hemos recuperado el total declarado (o más), terminamos.
            if total > 0 and len(all_events) >= total:
                break
            
            # Anti-Hammering: Pausa entre páginas para no sobrecargar el dispositivo
            time.sleep(0.3)
        
        logger.info(
            f"search_events_all: {len(all_events)} eventos descargados "
            f"(Total reportado: {total if 'total' in locals() else '?'})"
        )
        return all_events

    def _parse_event(self, raw_event: dict) -> Dict[str, Any]:
        """
        Parsear un evento individual de ISAPI a formato normalizado.
        """
        # === Tipo de evento basado en attendanceStatus ===
        attendance_status = raw_event.get('attendanceStatus', '')
        
        attendance_status_map = {
            'checkIn': 'entry', 'checkOut': 'exit',
            'breakOut': 'break_start', 'breakIn': 'break_end',
            'overtimeIn': 'entry', 'overtimeOut': 'exit',
            '0xab': 'entry', '0xac': 'exit',
            '0xad': 'break_start', '0xae': 'break_end',
            '0xaf': 'entry', '0xb0': 'exit',
        }
        
        event_type = attendance_status_map.get(str(attendance_status), 'unknown')
        
        if event_type == 'unknown' and not attendance_status:
            card_reader_no = raw_event.get('cardReaderNo', 0)
            if card_reader_no == 1: event_type = 'entry'
            elif card_reader_no == 2: event_type = 'exit'
        
        minor = raw_event.get('minor', 0)
        minor_verification_map = {
            1: 'card', 38: 'fingerprint', 75: 'fingerprint',
            80: 'face', 26: 'password',
        }
        verification_mode = minor_verification_map.get(minor, 'other')
        
        if verification_mode == 'other' and 'currentVerifyMode' in raw_event:
            cvm_map = {1: 'card', 4: 'card', 6: 'fingerprint', 15: 'fingerprint',
                       21: 'face', 9: 'combined', 28: 'combined', 29: 'combined'}
            verification_mode = cvm_map.get(raw_event['currentVerifyMode'], 'other')
        
        time_str = raw_event.get('time', '')
        try:
            if '+' in time_str or 'Z' in time_str:
                # El dispositivo envía timestamps con offset (ej: -04:30) → ya es aware
                timestamp = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
            else:
                # Si el timestamp es 'naive', lo localizamos en la zona horaria del dispositivo
                timestamp = datetime.fromisoformat(time_str)
                if self.device_timezone and timestamp.tzinfo is None:
                    try:
                        import pytz
                        tz = pytz.timezone(self.device_timezone)
                        timestamp = tz.localize(timestamp)
                    except Exception as e:
                        logger.warning(f"Error localizing timestamp {time_str} with {self.device_timezone}: {e}")

            # [FIX VENEZUELA] 
            # Algunos dispositivos viejos o mal configurados envían -04:30 (VET antiguo).
            # Django usa America/Caracas (-04:00).
            # Si llega -04:30, Python lo convierte a UTC sumando 4:30.
            # Al mostrar en -04:00, se restan 4:00. Resultado: +30 minutos extra.
            # SOLUCIÓN: Si detectamos -04:30, forzamos -04:00 manteniendo la "hora reloj" (Wall Time).
            if timestamp.tzinfo:
                offset = timestamp.tzinfo.utcoffset(timestamp)
                # -04:30 = -16200 segundos
                if offset and int(offset.total_seconds()) == -16200:
                    from datetime import timezone as dt_tz
                    vet_tz = dt_tz(timedelta(hours=-4))
                    timestamp = timestamp.replace(tzinfo=vet_tz)

        except (ValueError, AttributeError):
            timestamp = datetime.now()
        
        return {
            'employee_device_id': str(raw_event.get('employeeNoString', raw_event.get('cardNo', ''))),
            'employee_name': raw_event.get('name', ''),
            'event_type': event_type,
            'attendance_status_raw': str(attendance_status),
            'verification_mode': verification_mode,
            'timestamp': timestamp,
            'card_reader_no': raw_event.get('cardReaderNo', 0),
            'door_no': raw_event.get('doorNo', 0),
            'raw_data': raw_event,
        }

    def search_users(self, page_no: int = 0, page_size: int = 50, start_position: Optional[int] = None) -> Dict[str, Any]:
        """
        Buscar usuarios registrados en el dispositivo.
        
        POST /ISAPI/AccessControl/UserInfo/Search?format=json
        
        Usa payload JSON para evitar bloqueos en modelos DS-K1A8503MF-B.
        
        Args:
            page_no: Número de página (0-indexed). Usado si start_position es None.
            page_size: Cantidad de resultados por request.
            start_position: Posición de inicio absoluta (override page_no).
        
        Returns:
            dict con claves: total, users (list[dict])
        """
        
        # Calculate position: explicit start_pos OR page_no * page_size
        position = start_position if start_position is not None else (page_no * page_size)
        
        payload = {
            "UserInfoSearchCond": {
                "searchID": f"search_{int(datetime.now().timestamp())}",
                "searchResultPosition": position,
                "maxResults": page_size,
            }
        }
        
        # Forzar JSON usage
        response = self._request(
            'POST',
            '/ISAPI/AccessControl/UserInfo/Search?format=json',
            json=payload
        )
        
        try:
            return self._parse_users_json(response.json())
        except ValueError:
            logger.error(f"Error parseando respuesta JSON de usuarios: {response.text[:200]}")
            return {'total': 0, 'users': []}
    
    def _parse_users_json(self, data: dict) -> Dict[str, Any]:
        """Parsear respuesta JSON de UserInfo/Search."""
        # Estructura típica:
        # { "UserInfoSearch": { "totalMatches": 22, "UserInfo": [ ... ] } }
        
        user_info_search = data.get('UserInfoSearch', {})
        total = user_info_search.get('totalMatches', 0)
        user_list = user_info_search.get('UserInfo', [])
        
        users = []
        for u in user_list:
            users.append({
                'employee_no': u.get('employeeNo', ''),
                'name': u.get('name', ''),
                'user_type': u.get('userType', ''),
                'valid': u.get('Valid', {}),
            })
        
        return {'total': total, 'users': users}
    

    def search_users_all(self) -> List[Dict[str, Any]]:
        """
        Buscar TODOS los usuarios registrados paginando automáticamente.
        
        Maneja paginación dinámica incrementando 'start_position' basado en
        la cantidad real de registros recibidos, para evitar saltos si el
        dispositivo fuerza un page_size menor al solicitado.
        
        Returns:
            Lista plana de todos los usuarios.
        """
        all_users = []
        position = 0
        page_size = 50
        max_requests = 200  # Avoid infinite loops
        
        for _ in range(max_requests):
            result = self.search_users(page_size=page_size, start_position=position)
            users = result.get('users', [])
            total = result.get('total', 0)
            
            if not users:
                break
                
            all_users.extend(users)
            position += len(users)
            
            # Si hemos recuperado el total declarado, terminamos.
            if total > 0 and position >= total:
                break
                
        logger.info(f"search_users_all: {len(all_users)} usuarios descargados")
        return all_users


    
    def add_user(self, employee_no: str, name: str) -> bool:
        """
        Registrar un nuevo usuario en el dispositivo.
        
        PUT /ISAPI/AccessControl/UserInfo/Record?format=json
        
        Args:
            employee_no: ID del empleado a asignar.
            name: Nombre del empleado.
        
        Returns:
            True si el registro fue exitoso.
        """
        payload = {
            "UserInfo": {
                "employeeNo": employee_no,
                "name": name,
                "userType": "normal",
                "Valid": {
                    "enable": True,
                    "beginTime": "2020-01-01T00:00:00",
                    "endTime": "2037-12-31T23:59:59",
                },
                "doorRight": "1",
                "RightPlan": [
                    {
                        "doorNo": 1,
                        "planTemplateNo": "1"
                    }
                ],
            }
        }
        
        response = self._request(
            'PUT',
            '/ISAPI/AccessControl/UserInfo/Record?format=json',
            json=payload
        )
        
        return response.status_code in (200, 201)
    
    def delete_user(self, employee_no: str) -> bool:
        """
        Eliminar un usuario del dispositivo.
        
        PUT /ISAPI/AccessControl/UserInfo/Delete?format=json
        
        Args:
            employee_no: ID del empleado a eliminar.
        
        Returns:
            True si la eliminación fue exitosa.
        """
        payload = {
            "UserInfoDetail": {
                "mode": "byEmployeeNo",
                "EmployeeNoList": [
                    {"employeeNo": employee_no}
                ]
            }
        }
        
        response = self._request(
            'PUT',
            '/ISAPI/AccessControl/UserInfo/Delete?format=json',
            json=payload
        )
        
        return response.status_code in (200, 201)
    
    def get_event_capabilities(self) -> Dict[str, Any]:
        """
        Obtener capacidades de eventos del dispositivo.
        
        GET /ISAPI/AccessControl/AcsEvent/capabilities?format=json
        """
        response = self._request(
            'GET',
            '/ISAPI/AccessControl/AcsEvent/capabilities?format=json'
        )
        return response.json()
    
    def close(self):
        """Cerrar la sesión HTTP."""
        self.session.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
