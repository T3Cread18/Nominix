from datetime import datetime, date, time, timedelta
from typing import List, Dict, Any, Optional
from django.utils import timezone
from django.conf import settings
from payroll_core.models import Employee, WorkSchedule, EmployeeDailyShift
from biometrics.models import AttendanceEvent

class DailyAttendanceService:
    """
    Servicio para agregar eventos de asistencia en una vista diaria.
    """
    
    @staticmethod
    def get_daily_summary(target_date: date, branch_id: Optional[int] = None, search_query: Optional[str] = None, tz_name: Optional[str] = None, page: int = 1, page_size: int = 50) -> Dict[str, Any]:
        """
        Genera el resumen diario de asistencia para todos los empleados activos.
        
        Args:
            target_date: Fecha a consultar.
            branch_id: Opcional ID de sede para filtrar.
            search_query: Opcional texto de búsqueda (nombre o cédula).
            tz_name: Opcional nombre de zona horaria para pruebas (ej: 'UTC', 'America/Caracas').
            page: Número de página (1-based).
            page_size: Tamaño de página.
            
        Returns:
            Dict con 'count' (total) y 'results' (lista de objetos).
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
            
        # Ensure deterministic ordering for stable pagination
        queryset = queryset.order_by('last_name', 'first_name', 'id')
            
        total_count = queryset.count()
        
        # Paginación
        start = (page - 1) * page_size
        end = start + page_size
        employees = list(queryset[start:end])
        
        # 2.1 Obtener turnos dinámicos para este día (solo para los empleados de la página)
        # Mapa: employee_id -> work_schedule
        daily_shifts = {
            ds.employee_id: ds.work_schedule
            for ds in EmployeeDailyShift.objects.filter(
                date=target_date,
                employee__in=employees
            ).select_related('work_schedule')
        }
        
        # 3. Obtener eventos del día + madrugada siguiente (para turnos nocturnos)
        day_start = timezone.make_aware(datetime.combine(target_date, time.min), calc_tz)
        
        # [MODIFICADO] Límite de búsqueda: Hasta las 05:00 AM del día siguiente
        # El usuario solicitó un límite explícito (ej: 5:00 AM) para "tomar prestado" el evento.
        next_day_limit = timezone.make_aware(datetime.combine(target_date + timedelta(days=1), time(5, 0)), calc_tz)
        
        # Para el "Lookback" (evitar duplicados en el día actual), necesitamos saber si el día ANTERIOR
        # reclamó algún evento de la madrugada de HOY.
        # Estrategia: Consultar eventos del día anterior (ventana normal + extendida) para ver si quedó abierto.
        # Esto es costoso (n+1), pero necesario para la deduplicación estricta sin estado persistente.
        # Optimizacion: Solo hacerlo si encontramos eventos "tempraneros" (antes de las 5 AM) hoy.
        
        from django.db.models import Q
        all_events = AttendanceEvent.objects.filter(
            timestamp__range=(day_start, next_day_limit)
        ).filter(
            Q(employee__in=employees) | Q(employee__isnull=True)
        ).select_related('device').order_by('timestamp')
        
        # Separar eventos del día objetivo y del día siguiente
        day_end_strict = timezone.make_aware(datetime.combine(target_date, time.max), calc_tz)
        
        events_today = []
        events_next_day = []
        
        for evt in all_events:
            if evt.timestamp <= day_end_strict:
                events_today.append(evt)
            else:
                events_next_day.append(evt)

        # 3.1 Agrupar eventos de HOY por empleado
        events_by_employee = {}
        unmapped_events = []
        
        for evt in events_today:
            if evt.employee_id:
                if evt.employee_id not in events_by_employee:
                    events_by_employee[evt.employee_id] = []
                events_by_employee[evt.employee_id].append(evt)
            else:
                unmapped_events.append(evt)

        # 3.2 Agrupar eventos de MAÑANA por empleado (para lookahead)
        next_day_by_employee = {}
        for evt in events_next_day:
            if evt.employee_id:
                if evt.employee_id not in next_day_by_employee:
                    next_day_by_employee[evt.employee_id] = []
                next_day_by_employee[evt.employee_id].append(evt)
        
        # Fallback: intentar vincular eventos sin mapear por cédula (solo para HOY)
        if unmapped_events:
            # Construir índice: parte numérica de national_id -> employee.id
            cedula_to_emp_id = {}
            for emp in employees:
                raw_ni = ''.join(c for c in (emp.national_id or '') if c.isdigit())
                if raw_ni:
                    cedula_to_emp_id[raw_ni] = emp.id
            
            for evt in unmapped_events:
                raw_dev = ''.join(c for c in (evt.employee_device_id or '') if c.isdigit())
                emp_id = cedula_to_emp_id.get(raw_dev)
                if emp_id:
                    if emp_id not in events_by_employee:
                        events_by_employee[emp_id] = []
                    events_by_employee[emp_id].append(evt)
        
        # 4. Procesar cada empleado
        summary = []
        for emp in employees:
            emp_events = events_by_employee.get(emp.id, [])
            
            # --- PRE-PROCESAMIENTO: DEDUPLICACIÓN (LOOKBACK) ---
            # Si el PRIMER evento de hoy es de madrugada (antes de las 5:00 AM),
            # verificar si el día anterior tenía un turno abierto que lo pudiera reclamar.
            if emp_events:
                first_evt = emp_events[0]
                local_first = timezone.localtime(first_evt.timestamp, calc_tz)
                
                # Si es antes de las 5 AM
                if local_first.time() < time(5, 0):
                    # Chequear el día anterior
                    prev_date = target_date - timedelta(days=1)
                    
                    # Consultamos conteo simple de eventos del día anterior (optimizado)
                    # Si es IMPAR -> Quedó abierto -> Reclama este evento -> Lo quitamos de hoy.
                    # Rango del día anterior estricto (00:00 - 23:59)
                    prev_start = timezone.make_aware(datetime.combine(prev_date, time.min), calc_tz)
                    prev_end = timezone.make_aware(datetime.combine(prev_date, time.max), calc_tz)
                    
                    prev_count = AttendanceEvent.objects.filter(
                        employee=emp,
                        timestamp__range=(prev_start, prev_end)
                    ).count()
                    
                    if prev_count % 2 != 0:
                        # El día anterior quedó abierto. Asumimos que reclamó este evento.
                        # Lo removemos de la lista de hoy para no duplicar.
                        emp_events.pop(0)

            # --- LOGICA DE TURNO NOCTURNO (DAYBREAKER - LOOKAHEAD) ---
            # Si el empleado tiene un número impar de marcajes hoy (ej: Entrada, Salida, Entrada...)
            # significa que quedó con un turno abierto. Buscamos el primer marcaje del día siguiente
            # para cerrarlo, asumiendo que es la salida del turno nocturno.
            if len(emp_events) % 2 != 0:
                next_events = next_day_by_employee.get(emp.id, [])
                if next_events:
                    # Tomamos el primer evento de la madrugada siguiente y lo añadimos a "hoy"
                    # para que el cálculo de horas lo tome en cuenta.
                    # OJO: Solo tomamos el primero.
                    orphan_exit = next_events[0]
                    emp_events.append(orphan_exit)

            # Determinar horario a usar: Prioridad Dinámico > Fijo
            schedule = daily_shifts.get(emp.id)
            
            # Si no hay turno asignado explícitamente, intentar "Best Fit" basado en marcajes
            if not schedule and emp_events:
                # Buscar primer marcaje del día
                first_event = emp_events[0] # Ya están ordenados
                
                # Convertir a datetime naive en la zona horaria de cálculo para comparar con horarios simples
                local_dt = timezone.localtime(first_event.timestamp, calc_tz)
                check_in_time = local_dt.time()
                
                # Obtener candidatos (cachear esto sería ideal para performance)
                candidates = WorkSchedule.objects.filter(is_active=True)
                
                best_fit = None
                min_delta = float('inf')
                
                for cand in candidates:
                    # Calcular diferencia en minutos entre check_in real y teórico
                    # Convertir a minutos desde medianoche para facilitar resta
                    real_minutes = check_in_time.hour * 60 + check_in_time.minute
                    expected_minutes = cand.check_in_time.hour * 60 + cand.check_in_time.minute
                    
                    delta = abs(real_minutes - expected_minutes)
                    
                    # Umbral de "enganche": ej. +/- 3 horas (180 min)
                    if delta < 180 and delta < min_delta:
                        min_delta = delta
                        best_fit = cand
                
                if best_fit:
                    schedule = best_fit
            
            # Fallback final: horario por defecto del empleado
            if not schedule:
                schedule = emp.work_schedule
            
            # Si aún no tiene horario, usar uno por defecto virtual
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
            
        return {
            'count': total_count,
            'results': summary
        }

    @staticmethod
    def _process_employee_day(employee: Employee, schedule: WorkSchedule, events: List[AttendanceEvent], target_date: date) -> Dict[str, Any]:
        """Procesa los eventos de un empleado para generar sus bloques."""
        
        # Helpers
        def get_dt(t: time):
            return timezone.make_aware(datetime.combine(target_date, t))
            
        expected_in = get_dt(schedule.check_in_time)
        expected_lunch_out = get_dt(schedule.lunch_start_time)
        expected_lunch_in = get_dt(schedule.lunch_end_time)
        expected_out = get_dt(schedule.check_out_time)
        
        # Tolerancia
        tolerance = timedelta(minutes=schedule.tolerance_minutes)
        
        # --- CLASIFICACIÓN DINÁMICA POR SECUENCIA ---
        # Ignora el event_type del dispositivo. Asigna roles basándose
        # en el orden cronológico de las marcaciones del día.
        assigned = DailyAttendanceService._assign_events_by_sequence(
            events, schedule, target_date
        )
        
        entry_evt = assigned.get('entry')
        lunch_out_evt = assigned.get('lunch_out')
        lunch_in_evt = assigned.get('lunch_in')
        exit_evt = assigned.get('exit')
        
        # Calcular Status de Bloques
        blocks = {
            'entry': DailyAttendanceService._build_block(entry_evt, expected_in, tolerance, is_entry=True),
            'lunch_out': DailyAttendanceService._build_block(lunch_out_evt, expected_lunch_out, tolerance, is_entry=False),
            'lunch_in': DailyAttendanceService._build_block(lunch_in_evt, expected_lunch_in, tolerance, is_entry=True),
            'exit': DailyAttendanceService._build_block(exit_evt, expected_out, tolerance, is_entry=False),
        }
        
        # Calcular Tiempo Efectivo
        effective_hours = 0
        if entry_evt and exit_evt:
            total = (exit_evt.timestamp - entry_evt.timestamp).total_seconds()
            
            lunch_duration = 0
            if lunch_out_evt and lunch_in_evt:
                lunch_duration = (lunch_in_evt.timestamp - lunch_out_evt.timestamp).total_seconds()
            
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
            'is_synced': len(events) > 0,
        }

    @staticmethod
    def _assign_events_by_sequence(
        events: List[AttendanceEvent],
        schedule: WorkSchedule,
        target_date: date,
    ) -> Dict[str, Optional[AttendanceEvent]]:
        """
        Clasifica las marcaciones del día por secuencia cronológica,
        ignorando el event_type reportado por el dispositivo.
        
        Reglas:
          1 marcación  → entry
          2 marcaciones → entry + exit
          3 marcaciones → entry + lunch_out + exit
          4+ marcaciones → se eligen las 4 mejores por proximidad al horario
        """
        result: Dict[str, Optional[AttendanceEvent]] = {
            'entry': None, 'lunch_out': None, 'lunch_in': None, 'exit': None,
        }
        
        if not events:
            return result
        
        # Los eventos ya vienen ordenados por timestamp (ORDER BY timestamp)
        sorted_events = sorted(events, key=lambda e: e.timestamp)
        n = len(sorted_events)
        
        if n == 1:
            result['entry'] = sorted_events[0]
        
        elif n == 2:
            result['entry'] = sorted_events[0]
            result['exit'] = sorted_events[1]
        
        elif n == 3:
            result['entry'] = sorted_events[0]
            result['lunch_out'] = sorted_events[1]
            result['exit'] = sorted_events[2]
        
        else:
            # 4+ marcaciones: elegir las 4 mejores por proximidad al horario teórico.
            # Esto descarta marcaciones espurias (doble marcaje accidental).
            
            def get_dt(t: time):
                return timezone.make_aware(datetime.combine(target_date, t))
            
            expected_times = [
                ('entry', get_dt(schedule.check_in_time)),
                ('lunch_out', get_dt(schedule.lunch_start_time)),
                ('lunch_in', get_dt(schedule.lunch_end_time)),
                ('exit', get_dt(schedule.check_out_time)),
            ]
            
            # Asignación voraz preservando orden cronológico:
            # Para cada rol (en orden), encontrar el evento aún no usado
            # más cercano a la hora esperada, pero respetando que la
            # asignación mantiene el orden temporal.
            available = list(sorted_events)
            
            for role, expected_dt in expected_times:
                if not available:
                    break
                
                best_idx = 0
                best_delta = abs((available[0].timestamp - expected_dt).total_seconds())
                
                for i, evt in enumerate(available):
                    delta = abs((evt.timestamp - expected_dt).total_seconds())
                    if delta < best_delta:
                        best_delta = delta
                        best_idx = i
                
                result[role] = available.pop(best_idx)
            
            # Validar que el orden cronológico se mantiene.
            # Si la asignación voraz rompió el orden, corregir con asignación simple.
            assigned_list = [result[r] for r in ['entry', 'lunch_out', 'lunch_in', 'exit'] if result[r]]
            timestamps = [e.timestamp for e in assigned_list]
            
            if timestamps != sorted(timestamps):
                # Fallback: asignación directa por posición cronológica
                result['entry'] = sorted_events[0]
                result['lunch_out'] = sorted_events[1]
                result['lunch_in'] = sorted_events[2]
                result['exit'] = sorted_events[3]
        
        return result

    @staticmethod
    def _build_block(event: Optional[AttendanceEvent], expected: datetime, tolerance: timedelta, is_entry: bool) -> Dict[str, Any]:
        """Construye la data para un bloque de tiempo."""
        if not event:
            return {
                'status': 'missing',
                'time': None,
                'diff_minutes': 0,
                'expected_time': expected.strftime('%H:%M')
            }
            
        actual = event.timestamp
        diff = (actual - expected).total_seconds() / 60
        
        tolerance_min = tolerance.total_seconds() / 60
        
        status = 'success'
        
        if is_entry:
            if diff > tolerance_min:
                status = 'danger' if diff > 15 else 'warning'
        else:
            if diff < -tolerance_min:
                status = 'danger' if diff < -15 else 'warning'
                
        return {
            'status': status,
            'time': actual.isoformat(),
            'diff_minutes': round(diff),
            'event_id': event.id,
            'expected_time': expected.strftime('%H:%M')
        }
