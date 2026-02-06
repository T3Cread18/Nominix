import logging
from datetime import date, timedelta
import calendar
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from payroll_core.models import PayrollPeriod, PayrollNovelty, Company

logger = logging.getLogger(__name__)

def count_mondays_in_range(start_date: date, end_date: date) -> int:
    """Calcula cuántos lunes hay en un rango de fechas (inclusivo)."""
    count = 0
    current = start_date
    while current <= end_date:
        if current.weekday() == 0:  # Monday is 0
            count += 1
        current += timedelta(days=1)
    return count

def get_period_dates(target_date: date) -> tuple[date, date]:
    """
    Retorna (start_date, end_date) de la quincena correspondiente a target_date.
    Asume quincenas fijas (1-15 y 16-Fin de Mes).
    """
    year = target_date.year
    month = target_date.month
    day = target_date.day
    
    last_day_of_month = calendar.monthrange(year, month)[1]
    
    if day <= 15:
        return date(year, month, 1), date(year, month, 15)
    else:
        return date(year, month, 16), date(year, month, last_day_of_month)

def get_or_create_period(start_date: date, end_date: date) -> PayrollPeriod:
    """
    Busca o crea un PayrollPeriod para el rango dado.
    """
    # Nombre sugerido
    fortnight = "1ra" if start_date.day == 1 else "2da"
    month_name = calendar.month_name[start_date.month].capitalize() # Locale might apply? Keep simple.
    name = f"{fortnight} Quincena {start_date.strftime('%B')} {start_date.year}"
    
    # Asumimos pago al final del periodo (15 o Fin de Mes)
    payment_date = end_date
    
    # Intenta buscar por fechas exactas
    period, created = PayrollPeriod.objects.get_or_create(
        start_date=start_date,
        end_date=end_date,
        defaults={
            'name': name,
            'payment_date': payment_date,
            'status': PayrollPeriod.Status.OPEN
        }
    )
    return period

def generate_vacation_novelties(contract, start_date: date, end_date: date, return_date: date = None):
    """
    Genera novedades de ANTICIPO_VAC y LUNES_VACACIONES para los periodos afectados.
    
    Args:
        contract: LaborContract del empleado.
        start_date: Fecha inicio vacaciones.
        end_date: Fecha fin vacaciones.
        return_date: Fecha retorno (opcional, para referencia).
    """
    current_date = start_date
    
    # Solo procesar hasta la fecha fin de vacaciones
    final_date = end_date
    
    while current_date <= final_date:
        # 1. Determinar el periodo de nómina donde cae current_date
        p_start, p_end = get_period_dates(current_date)
        
        # 2. Calcular intersección con este periodo
        # La intersección inicia en max(periodo_inicio, vacaciones_inicio)
        # Termina en min(periodo_fin, vacaciones_fin)
        
        # Aseguramos no salir del chunks
        chunk_start = max(current_date, p_start)
        
        # No ir más allá del fin de periodo O fin de vacaciones
        chunk_end = min(p_end, final_date)
        
        # Si chunk_start > chunk_end, algo está mal o ya pasamos
        if chunk_start > chunk_end:
            current_date += timedelta(days=1)
            continue
            
        # Días de anticipo (Calendar days for generic deduction)
        # Ojo: ANTICIPO_VAC formula usa (SALARIO / 30) * CANT. 
        # Si usamos días calendario (incluyendo sáb/dom), descontará correctamente base mensual.
        days_in_chunk = (chunk_end - chunk_start).days + 1
        
        # Lunes en este chunk (para ajuste IVSS)
        mondays = count_mondays_in_range(chunk_start, chunk_end)
        
        # 3. Obtener/Crear Periodo
        period = get_or_create_period(p_start, p_end)
        
        # 4. Crear Novedades (Si el periodo está abierto)
        if period.status == PayrollPeriod.Status.OPEN:
            # ANTICIPO_VAC
            if days_in_chunk > 0:
                PayrollNovelty.objects.update_or_create(
                    employee=contract.employee,
                    period=period,
                    concept_code='ANTICIPO_VAC',
                    defaults={
                        'amount': Decimal(days_in_chunk),
                    }
                )
            
            # LUNES_VACACIONES (Para formulas IVSS)
            # Solo si hay lunes
            if mondays > 0:
                PayrollNovelty.objects.update_or_create(
                    employee=contract.employee,
                    period=period,
                    concept_code='LUNES_VACACIONES',
                    defaults={
                        'amount': Decimal(mondays),
                    }
                )
                
            logger.info("Novedades generadas para período %s: %d días, %d lunes.", period.name, days_in_chunk, mondays)
            
        else:
            logger.warning("Período %s está CERRADO. Omitiendo generación de novedades.", period.name)

        # Avanzar al siguiente chunk (día siguiente al fin de este periodo)
        current_date = p_end + timedelta(days=1)
