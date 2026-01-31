from datetime import date, timedelta
from typing import List, Set, Tuple
from django.db.models import Q
from ..models.calendars import Holiday

class BusinessCalendarService:
    """
    Servicio para cálculo de días hábiles y fechas de vencimiento.
    Considera fines de semana (Sáb/Dom) y feriados (Fijos y Recurrentes).
    """

    WEEKEND_DAYS = [5, 6] # 5=Saturday, 6=Sunday

    @classmethod
    def get_holidays_in_range(cls, start_date: date, end_date: date) -> Set[date]:
        """
        Retorna un set de objetos date que son feriados en el rango dado.
        Maneja feriados fijos (año específico) y recurrentes (todos los años).
        """
        holidays_set = set()
        
        # 1. Consultar todos los feriados activos
        # Nota: Django-tenants filtra automáticamente por schema
        holidays = Holiday.objects.filter(active=True)
        
        # Optimizacion: Si hay muchos feriados, podriamos filtrar mas,
        # pero para recurrentes necesitamos ver todos.
        
        years_in_range = range(start_date.year, end_date.year + 1)
        
        for holiday in holidays:
            if holiday.is_recurring:
                # Proyectar feriado en cada año del rango
                for year in years_in_range:
                    try:
                        # Manejo seguro de fechas (ej: 29 feb)
                        current_date = holiday.date.replace(year=year)
                        if start_date <= current_date <= end_date:
                            holidays_set.add(current_date)
                    except ValueError:
                        continue # Skip invalid dates (e.g. Feb 29 on non-leap years)
            else:
                # Feriado fijo con año específico
                if start_date <= holiday.date <= end_date:
                    holidays_set.add(holiday.date)
                    
        return holidays_set

    @classmethod
    def count_business_days(cls, start_date: date, end_date: date) -> int:
        """
        Cuenta el número de días hábiles entre dos fechas (inclusive).
        """
        if start_date > end_date:
            return 0
            
        holidays = cls.get_holidays_in_range(start_date, end_date)
        business_days = 0
        
        curr = start_date
        while curr <= end_date:
            # Chequear fin de semana
            if curr.weekday() in cls.WEEKEND_DAYS:
                curr += timedelta(days=1)
                continue
                
            # Chequear feriado
            if curr in holidays:
                curr += timedelta(days=1)
                continue
                
            business_days += 1
            curr += timedelta(days=1)
            
        return business_days

    @classmethod
    def add_business_days(cls, start_date: date, days: int) -> date:
        """
        Suma N días hábiles a una fecha de inicio.
        Retorna la fecha final del periodo.
        
        Ejemplo: Si start=Lunes, days=1 -> Retorna Lunes (1 día de disfrute es el mismo día).
                 Si start=Lunes, days=5 -> Retorna Viernes.
        """
        if days <= 0:
            return start_date
            
        # Obtenemos un rango amplio de feriados para evitar queries en loop
        # Proyección pesimista: 365 días + (days * 2) para cubrir fines de semana y feriados
        estimated_end = start_date + timedelta(days=days * 3 + 30)
        holidays = cls.get_holidays_in_range(start_date, estimated_end)
        
        days_added = 0
        curr = start_date
        
        # Ajuste: Si days=1, queremos que el resultado sea start_date SI es hábil.
        # Pero la semantica de "Add Business Days" suele ser: start + N days.
        # En vacaciones: Desde el dia X, disfruta 15 dias.
        # Si X es habil, cuenta como 1.
        
        # Algoritmo:
        # Avanzar hasta consumir 'days' días hábiles.
        # Retornar el último día hábil consumido.
        
        last_business_day = curr
        
        while days_added < days:
            is_business_day = True
            
            # Check weekend
            if curr.weekday() in cls.WEEKEND_DAYS:
                is_business_day = False
            # Check holiday
            elif curr in holidays:
                is_business_day = False
                
            if is_business_day:
                days_added += 1
                last_business_day = curr
            
            # Avanzar al siguiente día para evaluar, 
            # pero si ya completamos los días, el loop termina y devolvemos el last_business_day
            if days_added < days:
                 curr += timedelta(days=1)
                 
        return last_business_day
