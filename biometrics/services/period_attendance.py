"""
Servicio para calcular resúmenes de asistencia por periodo de nómina.

Agrega las marcaciones biométricas del rango del periodo,
calcula horas totales, extras, nocturnas, domingos, etc.
"""
from datetime import date, time, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any

from django.utils import timezone
from django.db import transaction
from django.db.models import Q

from payroll_core.models import Employee, PayrollPeriod, PayrollNovelty, WorkSchedule, EmployeeDailyShift
from biometrics.models import AttendanceEvent, AttendancePeriodSummary

# ── Constantes LOTTT ──
DAY_START = time(5, 0)    # Jornada diurna: 5:00 AM
DAY_END = time(19, 0)     # Jornada diurna termina: 7:00 PM
MAX_DAY_HOURS = 8         # Máximo horas diurnas antes de extras
MAX_NIGHT_HOURS = 7       # Máximo horas nocturnas antes de extras
ROUNDING_THRESHOLD = Decimal('0.85')  # Si la fracción >= 0.85, redondea hacia arriba

# Códigos de concepto para PayrollNovelty
CONCEPT_CODES = {
    'overtime_day': 'H_EXTRA_DIURNA',
    'overtime_night': 'H_EXTRA_NOCTURNA',
    'night_bonus': 'BONO_NOCTURNO',
    'sundays': 'DIAS_DOMINGO',
}


class PeriodAttendanceService:
    """Servicio para calcular y gestionar resúmenes de asistencia por periodo."""

    @staticmethod
    def generate_summaries(period_id: int, auto_approve: bool = False, user=None) -> Dict[str, Any]:
        """
        Genera (o recalcula) los resúmenes de asistencia para todos los
        empleados activos en el rango del periodo dado.

        Args:
            period_id: ID del PayrollPeriod.
            auto_approve: Si True, auto-aprueba los resúmenes generados.
            user: Usuario que ejecuta la acción (para auditoría).

        Returns:
            Dict con 'created', 'updated', 'total' conteos.
        """
        period = PayrollPeriod.objects.get(id=period_id)
        employees = Employee.objects.filter(is_active=True).select_related(
            'work_schedule', 'department', 'branch'
        )

        import pytz
        calc_tz = timezone.get_current_timezone()

        created_count = 0
        updated_count = 0

        for emp in employees:
            summary_data = PeriodAttendanceService._calculate_employee_period(
                emp, period, calc_tz
            )

            # Crear o actualizar el resumen
            obj, created = AttendancePeriodSummary.objects.update_or_create(
                employee=emp,
                period=period,
                defaults={
                    'total_hours': summary_data['total_hours'],
                    'regular_day_hours': summary_data['regular_day_hours'],
                    'night_hours': summary_data['night_hours'],
                    'overtime_day_hours': summary_data['overtime_day_hours'],
                    'overtime_night_hours': summary_data['overtime_night_hours'],
                    'sunday_hours': summary_data['sunday_hours'],
                    'sunday_count': summary_data['sunday_count'],
                    'absences': summary_data['absences'],
                    'days_worked': summary_data['days_worked'],
                    'detail_json': summary_data['detail'],
                    'status': AttendancePeriodSummary.Status.APPROVED if auto_approve else AttendancePeriodSummary.Status.PENDING,
                    'approved_by': user if auto_approve else None,
                    'approved_at': timezone.now() if auto_approve else None,
                }
            )

            if created:
                created_count += 1
            else:
                updated_count += 1

        # Si auto-approve, también generar las novedades
        if auto_approve:
            summaries = AttendancePeriodSummary.objects.filter(
                period=period,
                status=AttendancePeriodSummary.Status.APPROVED
            )
            for s in summaries:
                PeriodAttendanceService._push_novelties(s)

        return {
            'created': created_count,
            'updated': updated_count,
            'total': created_count + updated_count,
        }

    @staticmethod
    def _calculate_employee_period(employee: Employee, period: PayrollPeriod, calc_tz) -> Dict[str, Any]:
        """
        Calcula los totales de asistencia para un empleado en un periodo.
        Itera día por día en el rango del periodo.
        """
        current_date = period.start_date
        end_date = period.end_date

        total_hours = Decimal('0.00')
        regular_day_hours = Decimal('0.00')
        night_hours = Decimal('0.00')
        overtime_day_hours = Decimal('0.00')
        overtime_night_hours = Decimal('0.00')
        sunday_hours = Decimal('0.00')
        sunday_count = 0
        absences = 0
        days_worked = 0
        daily_detail = []

        # Pre-fetch daily shifts for this employee in the period
        daily_shifts = {
            ds.date: ds.work_schedule
            for ds in EmployeeDailyShift.objects.filter(
                employee=employee,
                date__range=(period.start_date, period.end_date)
            ).select_related('work_schedule')
        }

        while current_date <= end_date:
            day_data = PeriodAttendanceService._process_single_day(
                employee, current_date, calc_tz, daily_shifts
            )

            total_hours += day_data['effective_hours']
            regular_day_hours += day_data['day_hours']
            night_hours += day_data['night_hours']
            overtime_day_hours += day_data['overtime_day']
            overtime_night_hours += day_data['overtime_night']

            if day_data['is_sunday'] and day_data['effective_hours'] > 0:
                sunday_hours += day_data['effective_hours']
                sunday_count += 1

            if day_data['has_marks']:
                days_worked += 1
            elif current_date.weekday() < 5:  # Lun-Vie sin marcaje = ausencia (excluyendo fines de semana)
                absences += 1

            daily_detail.append({
                'date': current_date.isoformat(),
                'weekday': current_date.strftime('%A'),
                'is_sunday': day_data['is_sunday'],
                'effective_hours': float(day_data['effective_hours']),
                'day_hours': float(day_data['day_hours']),
                'night_hours': float(day_data['night_hours']),
                'overtime_day': float(day_data['overtime_day']),
                'overtime_night': float(day_data['overtime_night']),
                'has_marks': day_data['has_marks'],
                'entry': day_data.get('entry_time'),
                'exit': day_data.get('exit_time'),
            })

            current_date += timedelta(days=1)

        # Redondear totales a enteros con umbral de sensibilidad
        total_hours = PeriodAttendanceService._round_hours(total_hours)
        regular_day_hours = PeriodAttendanceService._round_hours(regular_day_hours)
        night_hours = PeriodAttendanceService._round_hours(night_hours)
        overtime_day_hours = PeriodAttendanceService._round_hours(overtime_day_hours)
        overtime_night_hours = PeriodAttendanceService._round_hours(overtime_night_hours)
        sunday_hours = PeriodAttendanceService._round_hours(sunday_hours)

        return {
            'total_hours': total_hours,
            'regular_day_hours': regular_day_hours,
            'night_hours': night_hours,
            'overtime_day_hours': overtime_day_hours,
            'overtime_night_hours': overtime_night_hours,
            'sunday_hours': sunday_hours,
            'sunday_count': sunday_count,
            'absences': absences,
            'days_worked': days_worked,
            'detail': daily_detail,
        }

    @staticmethod
    def _process_single_day(employee: Employee, target_date: date, calc_tz, daily_shifts: dict) -> Dict[str, Any]:
        """
        Procesa un solo día para un empleado: busca marcajes, calcula horas
        y clasifica en diurnas/nocturnas/extras.
        """
        result = {
            'effective_hours': Decimal('0.00'),
            'day_hours': Decimal('0.00'),
            'night_hours': Decimal('0.00'),
            'overtime_day': Decimal('0.00'),
            'overtime_night': Decimal('0.00'),
            'is_sunday': target_date.weekday() == 6,
            'has_marks': False,
            'entry_time': None,
            'exit_time': None,
        }

        # Get events for this day
        day_start = timezone.make_aware(datetime.combine(target_date, time.min), calc_tz)
        next_day_limit = timezone.make_aware(
            datetime.combine(target_date + timedelta(days=1), time(5, 0)), calc_tz
        )

        events = list(
            AttendanceEvent.objects.filter(
                employee=employee,
                timestamp__range=(day_start, next_day_limit)
            ).order_by('timestamp')
        )

        if not events:
            return result

        result['has_marks'] = True

        # Determine schedule
        schedule = daily_shifts.get(target_date) or employee.work_schedule
        if not schedule:
            schedule = WorkSchedule(
                name="Default",
                check_in_time=time(8, 0),
                lunch_start_time=time(12, 0),
                lunch_end_time=time(13, 0),
                check_out_time=time(17, 0),
                tolerance_minutes=15
            )

        # Assign events by sequence (reuse same logic as daily service)
        assigned = PeriodAttendanceService._assign_events_simple(events)
        entry_evt = assigned.get('entry')
        exit_evt = assigned.get('exit')
        lunch_out = assigned.get('lunch_out')
        lunch_in = assigned.get('lunch_in')

        if not entry_evt or not exit_evt:
            # Only entry without exit — count partial hours if possible
            if entry_evt and not exit_evt:
                result['entry_time'] = entry_evt.timestamp.isoformat()
            return result

        result['entry_time'] = entry_evt.timestamp.isoformat()
        result['exit_time'] = exit_evt.timestamp.isoformat()

        # Calculate total seconds worked
        total_seconds = (exit_evt.timestamp - entry_evt.timestamp).total_seconds()

        # Subtract lunch
        lunch_seconds = 0
        if lunch_out and lunch_in:
            lunch_seconds = (lunch_in.timestamp - lunch_out.timestamp).total_seconds()

        effective_seconds = max(0, total_seconds - lunch_seconds)
        effective_hours = Decimal(str(round(effective_seconds / 3600, 2)))
        result['effective_hours'] = effective_hours

        # Classify hours into day/night
        entry_local = timezone.localtime(entry_evt.timestamp, calc_tz)
        exit_local = timezone.localtime(exit_evt.timestamp, calc_tz)

        day_hrs, night_hrs = PeriodAttendanceService._split_day_night(
            entry_local, exit_local, lunch_seconds
        )
        
        result['day_hours'] = day_hrs
        result['night_hours'] = night_hrs

        # Calculate overtime
        if day_hrs > MAX_DAY_HOURS:
            result['overtime_day'] = day_hrs - MAX_DAY_HOURS
            result['day_hours'] = Decimal(str(MAX_DAY_HOURS))

        if night_hrs > MAX_NIGHT_HOURS:
            result['overtime_night'] = night_hrs - MAX_NIGHT_HOURS
            result['night_hours'] = Decimal(str(MAX_NIGHT_HOURS))

        return result

    @staticmethod
    def _split_day_night(entry_dt: datetime, exit_dt: datetime, lunch_seconds: float = 0) -> tuple:
        """
        Divide las horas trabajadas entre diurnas (5:00-19:00) y nocturnas (19:00-5:00).
        Returns: (day_hours: Decimal, night_hours: Decimal)
        """
        day_seconds = 0
        night_seconds = 0

        current = entry_dt
        while current < exit_dt:
            local_time = current.time()
            # Check if current moment is in day range (5:00 - 19:00)
            if DAY_START <= local_time < DAY_END:
                day_seconds += 60
            else:
                night_seconds += 60
            current += timedelta(minutes=1)

        # Proportionally subtract lunch from the larger bucket
        total = day_seconds + night_seconds
        if total > 0 and lunch_seconds > 0:
            day_ratio = day_seconds / total
            day_seconds -= lunch_seconds * day_ratio
            night_seconds -= lunch_seconds * (1 - day_ratio)

        day_hours = Decimal(str(max(0, round(day_seconds / 3600, 2))))
        night_hours = Decimal(str(max(0, round(night_seconds / 3600, 2))))

        return day_hours, night_hours

    @staticmethod
    def _assign_events_simple(events: list) -> Dict[str, Optional[AttendanceEvent]]:
        """Simple chronological assignment of events to roles."""
        result = {'entry': None, 'lunch_out': None, 'lunch_in': None, 'exit': None}
        sorted_events = sorted(events, key=lambda e: e.timestamp)
        n = len(sorted_events)

        if n >= 1:
            result['entry'] = sorted_events[0]
        if n >= 2:
            result['exit'] = sorted_events[-1]
        if n >= 3:
            result['lunch_out'] = sorted_events[1]
        if n >= 4:
            result['lunch_in'] = sorted_events[2]

        return result

    @staticmethod
    def _round_hours(value: Decimal) -> Decimal:
        """
        Redondea horas a enteros con umbral de sensibilidad.
        Si la parte decimal >= ROUNDING_THRESHOLD (0.85), redondea hacia arriba.
        Si no, redondea hacia abajo (trunca).
        Ej: 7.85 → 8, 7.84 → 7, 8.90 → 9, 3.20 → 3
        """
        import math
        fval = float(value)
        integer_part = math.floor(fval)
        fractional = Decimal(str(fval)) - Decimal(str(integer_part))
        if fractional >= ROUNDING_THRESHOLD:
            return Decimal(str(integer_part + 1))
        return Decimal(str(integer_part))

    @staticmethod
    @transaction.atomic
    def approve_summary(summary_id: int, user) -> AttendancePeriodSummary:
        """
        Aprueba un resumen de asistencia y genera las novedades de nómina.
        """
        summary = AttendancePeriodSummary.objects.select_for_update().get(id=summary_id)
        summary.status = AttendancePeriodSummary.Status.APPROVED
        summary.approved_by = user
        summary.approved_at = timezone.now()
        summary.save()

        PeriodAttendanceService._push_novelties(summary)
        return summary

    @staticmethod
    @transaction.atomic
    def approve_all(period_id: int, user) -> int:
        """Aprueba todos los resúmenes pendientes de un periodo."""
        summaries = AttendancePeriodSummary.objects.filter(
            period_id=period_id,
            status=AttendancePeriodSummary.Status.PENDING
        ).select_for_update()

        count = 0
        for summary in summaries:
            summary.status = AttendancePeriodSummary.Status.APPROVED
            summary.approved_by = user
            summary.approved_at = timezone.now()
            summary.save()
            PeriodAttendanceService._push_novelties(summary)
            count += 1

        return count

    @staticmethod
    def _push_novelties(summary: AttendancePeriodSummary):
        """
        Crea o actualiza las PayrollNovelty para el empleado/periodo
        basándose en los totales del resumen aprobado.
        """
        novelty_map = {
            CONCEPT_CODES['overtime_day']: summary.overtime_day_hours,
            CONCEPT_CODES['overtime_night']: summary.overtime_night_hours,
            CONCEPT_CODES['night_bonus']: summary.night_hours,
            CONCEPT_CODES['sundays']: summary.sunday_count,
        }

        for code, amount in novelty_map.items():
            if amount > 0:
                PayrollNovelty.objects.update_or_create(
                    employee=summary.employee,
                    period=summary.period,
                    concept_code=code,
                    defaults={'amount': amount}
                )
