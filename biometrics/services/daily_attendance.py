from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any, Optional
from django.utils import timezone
from django.conf import settings
from payroll_core.models import Employee, WorkSchedule
from biometrics.models import AttendanceEvent

class DailyAttendanceService:
    """
    Servicio para agregar eventos de asistencia en una vista diaria.
    """
    
    @staticmethod
    def get_daily_summary(target_date: date, branch_id: Optional[int] = None, search_query: Optional[str] = None, tz_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Genera el resumen diario de asistencia para todos los empleados activos.
        
        Args:
            target_date: Fecha a consultar.
            branch_id: Opcional ID de sede para filtrar.
            search_query: Opcional texto de búsqueda (nombre o cédula).
            tz_name: Opcional nombre de zona horaria para pruebas (ej: 'UTC', 'America/Caracas').
            
        Returns:
            Lista de objetos con informacion de empleado y sus bloques de tiempo.
        """
        # 1. Definir zona horaria de cálculo
        import pytz
        try:
            calc_tz = pytz.timezone(tz_name) if tz_name else timezone.get_current_timezone()
        except Exception:
            calc_tz = timezone.get_current_timezone()

        # 2. Obtener empleados activos
        queryset = Employee.objects.filter(is_active=True).select_related('work_schedule', 'department', 'branch')
        
        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)
            
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) | 
                Q(last_name__icontains=search_query) | 
                Q(national_id__icontains=search_query)
            )
            
        employees = queryset.all()
        
        # 3. Obtener eventos del día en la zona horaria seleccionada
        day_start = timezone.make_aware(datetime.combine(target_date, time.min), calc_tz)
        day_end = timezone.make_aware(datetime.combine(target_date, time.max), calc_tz)
        
        events = AttendanceEvent.objects.filter(
            timestamp__range=(day_start, day_end)
        ).select_related('device').order_by('timestamp')
        
        # 3. Agrupar eventos por empleado (usando employee_id o employee_device_id mapeado)
        events_by_employee = {}
        for evt in events:
            if evt.employee_id:
                if evt.employee_id not in events_by_employee:
                    events_by_employee[evt.employee_id] = []
                events_by_employee[evt.employee_id].append(evt)
        
        # 4. Procesar cada empleado
        summary = []
        for emp in employees:
            emp_events = events_by_employee.get(emp.id, [])
            schedule = emp.work_schedule
            
            # Si no tiene horario, usar uno por defecto virtual
            if not schedule:
                # Default 8-5 fallback logic handled in UI or here?
                # Create a dummy schedule for calculation
                schedule = WorkSchedule(
                    name="Default",
                    check_in_time=time(8, 0),
                    lunch_start_time=time(12, 0),
                    lunch_end_time=time(13, 0),
                    check_out_time=time(17, 0),
                    tolerance_minutes=15
                )

            summary.append(DailyAttendanceService._process_employee_day(emp, schedule, emp_events, target_date))
            
        return summary

    @staticmethod
    def _process_employee_day(employee: Employee, schedule: WorkSchedule, events: List[AttendanceEvent], target_date: date) -> Dict[str, Any]:
        """Procesa los eventos de un empleado para generar sus bloques."""
        
        # Estructura de bloques
        # 1. Entrada (Check-In)
        # 2. Salida Almuerzo (Break-Start)
        # 3. Retorno Almuerzo (Break-End)
        # 4. Salida (Check-Out)
        
        # Identificar eventos más cercanos a los hitos esperados
        # Nota: Esto es una simplificación. Un algoritmo real debe considerar el TIPO de evento.
        
        # Helpers
        def get_dt(t: time):
            return timezone.make_aware(datetime.combine(target_date, t))
            
        expected_in = get_dt(schedule.check_in_time)
        expected_lunch_out = get_dt(schedule.lunch_start_time)
        expected_lunch_in = get_dt(schedule.lunch_end_time)
        expected_out = get_dt(schedule.check_out_time)
        
        # Tolerancia
        tolerance = timedelta(minutes=schedule.tolerance_minutes)
        
        # --- BUSQUEDA DE EVENTOS ---
        # Buscamos por tipo si existe, o por proximidad temporal
        
        entry_evt = DailyAttendanceService._find_best_event(events, 'entry', expected_in)
        lunch_out_evt = DailyAttendanceService._find_best_event(events, 'break_start', expected_lunch_out)
        lunch_in_evt = DailyAttendanceService._find_best_event(events, 'break_end', expected_lunch_in)
        exit_evt = DailyAttendanceService._find_best_event(events, 'exit', expected_out)
        
        # Si no hay tipos definidos (ej: solo 'other'), usar proximidad
        # TODO: Implementar lógica de proximidad si event_type es 'unknown'/'other'
        # Por ahora, confiamos en que los eventos tengan tipo (entry/exit). 
        # Si no, el sistema requeriría heurística compleja fuera del alcance actual.
        
        # Calcular Status de Bloques
        blocks = {
            'entry': DailyAttendanceService._build_block(entry_evt, expected_in, tolerance, is_entry=True),
            'lunch_out': DailyAttendanceService._build_block(lunch_out_evt, expected_lunch_out, tolerance, is_entry=False), # Salir antes es malo? Salir a tiempo
            'lunch_in': DailyAttendanceService._build_block(lunch_in_evt, expected_lunch_in, tolerance, is_entry=True),
            'exit': DailyAttendanceService._build_block(exit_evt, expected_out, tolerance, is_entry=False), # Salir antes es malo
        }
        
        # Calcular Tiempo Efectivo
        effective_hours = 0
        if entry_evt and exit_evt:
            # (Salida - Entrada)
            total = (exit_evt.timestamp - entry_evt.timestamp).total_seconds()
            
            # Restar almuerzo
            lunch_duration = 0
            if lunch_out_evt and lunch_in_evt:
                lunch_duration = (lunch_in_evt.timestamp - lunch_out_evt.timestamp).total_seconds()
            else:
                 # Si no marcó almuerzo, asumimos la hora legal? O 0?
                 # Por ahora 0, castigando al empleado o beneficiandolo? 
                 # Restamos el almuerzo TEÓRICO si no hay marcas? 
                 # Mejor: solo sumar tiempo real. 
                 pass
            
            effective_seconds = total - lunch_duration
            effective_hours = max(0, effective_seconds / 3600)
            
        return {
            'employee': {
                'id': employee.id,
                'name': f'{employee.first_name} {employee.last_name}'.strip(),
                'photo_url': employee.photo.url if employee.photo and hasattr(employee.photo, 'url') else None,
                'department': employee.department.name if employee.department_id else '',
            },
            'blocks': blocks,
            'effective_hours': round(effective_hours, 2),
            'schedule_name': schedule.name,
            'is_synced': any(e.event_type != 'manual' for e in [entry_evt, exit_evt] if e) # Ejemplo
        }

    @staticmethod
    def _find_best_event(events: List[AttendanceEvent], type_hint: str, expected_time: datetime) -> Optional[AttendanceEvent]:
        """Encuentra el evento que mejor calza con el tipo y hora."""
        candidates = [e for e in events if e.event_type == type_hint]
        
        # Si no hay candidatos por tipo, buscar en 'unknown' o 'other' cercanos?
        # Por simplicidad, solo tipos explícitos.
        if not candidates:
            # Fallback a 'checkIn'/'checkOut' del texto raw? O proximity?
            # Busquemos eventos 'unknown' dentro de +/- 30 mins
            window = timedelta(minutes=60)
            candidates = [e for e in events if (e.event_type in ['unknown', 'other']) and abs(e.timestamp - expected_time) <= window]
        
        if not candidates:
            return None
            
        # Retornar el más cercano
        return min(candidates, key=lambda e: abs(e.timestamp - expected_time))

    @staticmethod
    def _build_block(event: Optional[AttendanceEvent], expected: datetime, tolerance: timedelta, is_entry: bool) -> Dict[str, Any]:
        """Construye la data para un bloque de tiempo."""
        if not event:
            return {'status': 'missing', 'time': None, 'diff_minutes': 0}
            
        actual = event.timestamp
        diff = (actual - expected).total_seconds() / 60 # Minutos. Positivo = Tarde surante entrada.
        
        tolerance_min = tolerance.total_seconds() / 60
        
        status = 'success' # Verde
        
        if is_entry:
            # Entrada: Tarde es malo (> tolerance)
            # Temprano es bueno o neutro
            if diff > tolerance_min:
                status = 'danger' if diff > 15 else 'warning'
        else:
            # Salida: Temprano es malo (< -tolerance)
            # Tarde es extra
            if diff < -tolerance_min:
                status = 'danger' if diff < -15 else 'warning'
                
        return {
            'status': status,
            'time': actual.isoformat(),
            'diff_minutes': round(diff),
            'event_id': event.id
        }
