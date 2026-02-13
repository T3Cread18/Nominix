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
    
    def __init__(self, ip: str, port: int, username: str, password: str):
        self.base_url = f"http://{ip}:{port}"
        self.auth = HTTPDigestAuth(username, password)
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
                raise HikvisionAuthError(
                    f"Autenticación fallida con el dispositivo en {self.base_url}. "
                    "Verifica usuario y contraseña."
                )
            
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
        major_event: int = 0,  # 0 = Todos los eventos
        minor_event: int = 0,  # 0 = Todos
    ) -> Dict[str, Any]:
        """
        Buscar eventos de acceso en el dispositivo.
        
        POST /ISAPI/AccessControl/AcsEvent?format=json
        
        Args:
            start_time: Fecha/hora de inicio.
            end_time: Fecha/hora de fin.
            page_no: Número de página (0-indexed).
            page_size: Eventos por página.
            major_event: Tipo mayor (0 = todos, 5 = acceso válido).
            minor_event: Tipo menor (0 = todos los subtipos).
        
        Returns:
            dict con claves:
                - total: int, total de eventos encontrados.
                - events: list[dict], lista de eventos parseados.
        """
        # Formato de fecha ISAPI: 2026-02-10T00:00:00+00:00
        start_str = start_time.strftime('%Y-%m-%dT%H:%M:%S+00:00')
        end_str = end_time.strftime('%Y-%m-%dT%H:%M:%S+00:00')
        
        payload = {
            "AcsEventCond": {
                "searchID": f"search_{int(datetime.now().timestamp())}",
                "searchResultPosition": page_no * page_size,
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
    
    def _parse_event(self, raw_event: dict) -> Dict[str, Any]:
        """
        Parsear un evento individual de ISAPI a formato normalizado.
        
        Usa el campo `attendanceStatus` del dispositivo Hikvision para
        determinar el tipo de evento (entrada, salida, descanso).
        
        Mapeo attendanceStatus de Hikvision:
            - "checkIn"    / "0xab"  → entry (Entrada)
            - "checkOut"   / "0xac"  → exit (Salida)
            - "breakOut"   / "0xad"  → break_start (Inicio Descanso)
            - "breakIn"    / "0xae"  → break_end (Fin Descanso)
            - "overtimeIn" / "0xaf"  → entry (Entrada horas extra)
            - "overtimeOut"/ "0xb0"  → exit (Salida horas extra)
        """
        # === Tipo de evento basado en attendanceStatus ===
        attendance_status = raw_event.get('attendanceStatus', '')
        
        attendance_status_map = {
            # Valores textuales
            'checkIn': 'entry',
            'checkOut': 'exit',
            'breakOut': 'break_start',
            'breakIn': 'break_end',
            'overtimeIn': 'entry',
            'overtimeOut': 'exit',
            # Valores hexadecimales (algunos firmwares)
            '0xab': 'entry',
            '0xac': 'exit',
            '0xad': 'break_start',
            '0xae': 'break_end',
            '0xaf': 'entry',
            '0xb0': 'exit',
        }
        
        event_type = attendance_status_map.get(str(attendance_status), 'unknown')
        
        # Fallback: si no hay attendanceStatus, intentar por cardReaderNo
        if event_type == 'unknown' and not attendance_status:
            card_reader_no = raw_event.get('cardReaderNo', 0)
            if card_reader_no == 1:
                event_type = 'entry'
            elif card_reader_no == 2:
                event_type = 'exit'
        
        # === Modo de verificación (basado en campo 'minor' del evento) ===
        # El DS-K1A8503MF-B usa el campo 'minor' para indicar el método,
        # no 'currentVerifyMode'. major=5 es siempre "evento de acceso".
        minor = raw_event.get('minor', 0)
        minor_verification_map = {
            1: 'card',          # Tarjeta válida
            38: 'fingerprint',  # Huella válida (confirmado con dispositivo real)
            75: 'fingerprint',  # Huella válida (variante firmware)
            80: 'face',         # Rostro válido
            26: 'password',     # Contraseña válida
        }
        verification_mode = minor_verification_map.get(minor, 'other')
        
        # Fallback: intentar currentVerifyMode si existe
        if verification_mode == 'other' and 'currentVerifyMode' in raw_event:
            cvm_map = {1: 'card', 4: 'card', 6: 'fingerprint', 15: 'fingerprint',
                       21: 'face', 9: 'combined', 28: 'combined', 29: 'combined'}
            verification_mode = cvm_map.get(raw_event['currentVerifyMode'], 'other')
        
        # === Timestamp del evento ===
        time_str = raw_event.get('time', '')
        try:
            # Hikvision puede devolver timestamps con/sin timezone
            if '+' in time_str or 'Z' in time_str:
                timestamp = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
            else:
                timestamp = datetime.fromisoformat(time_str)
        except (ValueError, AttributeError):
            timestamp = datetime.now()
        
        return {
            'employee_device_id': str(raw_event.get('employeeNoString', 
                                       raw_event.get('cardNo', ''))),
            'employee_name': raw_event.get('name', ''),
            'event_type': event_type,
            'attendance_status_raw': str(attendance_status),
            'verification_mode': verification_mode,
            'timestamp': timestamp,
            'card_reader_no': raw_event.get('cardReaderNo', 0),
            'door_no': raw_event.get('doorNo', 0),
            'raw_data': raw_event,
        }
    
    def search_events_all(
        self,
        start_time: datetime,
        end_time: datetime,
        page_size: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Buscar TODOS los eventos en un rango de fechas (paginación automática).
        
        Args:
            start_time: Fecha/hora de inicio.
            end_time: Fecha/hora de fin.
            page_size: Tamaño de página.
        
        Returns:
            Lista completa de eventos.
        """
        all_events = []
        page_no = 0
        
        while True:
            result = self.search_events(
                start_time=start_time,
                end_time=end_time,
                page_no=page_no,
                page_size=page_size,
            )
            
            events = result['events']
            all_events.extend(events)
            
            # Si recibimos menos de page_size, es la última página
            if len(events) < page_size:
                break
            
            page_no += 1
            
            # Safety limit
            if page_no > 100:
                logger.warning(
                    f"Alcanzado límite de 100 páginas al buscar eventos. "
                    f"Total acumulado: {len(all_events)}"
                )
                break
        
        return all_events
    
    def search_users(self, page_no: int = 0, page_size: int = 50) -> Dict[str, Any]:
        """
        Buscar usuarios registrados en el dispositivo.
        
        POST /ISAPI/AccessControl/UserInfo/Search?format=json
        
        Nota: Algunos modelos (DS-K1A8503MF-B) pueden responder en XML
        aunque se solicite JSON. Se maneja ambos formatos.
        
        Returns:
            dict con claves: total, users (list[dict])
        """
        payload = {
            "UserInfoSearchCond": {
                "searchID": f"search_{int(datetime.now().timestamp())}",
                "searchResultPosition": page_no * page_size,
                "maxResults": page_size,
            }
        }
        
        response = self._request(
            'POST',
            '/ISAPI/AccessControl/UserInfo/Search?format=json',
            json=payload
        )
        
        content_type = response.headers.get('Content-Type', '')
        
        if 'json' in content_type:
            return self._parse_users_json(response.json())
        else:
            return self._parse_users_xml(response.text)
    
    def _parse_users_json(self, data: dict) -> Dict[str, Any]:
        """Parsear respuesta JSON de UserInfo/Search."""
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
    
    def _parse_users_xml(self, xml_text: str) -> Dict[str, Any]:
        """Parsear respuesta XML de UserInfo/Search."""
        import xml.etree.ElementTree as ET
        import re
        
        # Remover namespace
        xml_clean = xml_text
        if 'xmlns' in xml_text:
            xml_clean = re.sub(r'\sxmlns="[^"]+"', '', xml_text)
        
        try:
            root = ET.fromstring(xml_clean)
        except ET.ParseError:
            logger.warning(f"No se pudo parsear XML de users: {xml_text[:200]}")
            return {'total': 0, 'users': []}
        
        def get_text(element, tag):
            el = element.find(tag)
            return el.text if el is not None and el.text else ''
        
        total_el = root.find('totalMatches')
        total = int(total_el.text) if total_el is not None and total_el.text else 0
        
        users = []
        for user_el in root.findall('.//UserInfo'):
            users.append({
                'employee_no': get_text(user_el, 'employeeNo'),
                'name': get_text(user_el, 'name'),
                'user_type': get_text(user_el, 'userType'),
                'valid': {},
            })
        
        return {'total': total, 'users': users}
    
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
