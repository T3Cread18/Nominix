"""
Servicios relacionados con monedas y tasas de cambio.
"""
from decimal import Decimal
from datetime import datetime, date
from typing import Optional, Tuple
import requests
from django.utils import timezone
from django.db import models, transaction
from django.db.models import QuerySet

from ..models import Currency, ExchangeRate, LaborContract


class CurrencyNotFoundError(Exception):
    """Excepción cuando no se encuentra una moneda."""
    pass


class ExchangeRateNotFoundError(Exception):
    """Excepción cuando no se encuentra una tasa de cambio."""
    pass


class SalaryConverter:
    """
    Servicio para conversión de salarios entre monedas.
    
    En Venezuela es común que los salarios se pacten en USD
    pero se paguen en VES según la tasa del día (BCV o paralelo).
    
    El BCV actualiza las tasas a las 9:00 AM y 1:00 PM.
    """
    
    # Código de la moneda local (Bolívar Digital)
    LOCAL_CURRENCY_CODE: str = 'VES'
    
    @staticmethod
    def get_latest_rate(
        currency_code: str,
        target_date: date,
        source: Optional[str] = None
    ) -> ExchangeRate:
        """
        Obtiene la tasa de cambio más reciente para una fecha.
        
        Busca la tasa más reciente que sea menor o igual a la fecha objetivo.
        Si se especifica source, filtra por esa fuente (BCV, Monitor, etc.)
        """
        # Verificar que la moneda existe
        try:
            currency = Currency.objects.get(code=currency_code)
        except Currency.DoesNotExist:
            raise CurrencyNotFoundError(
                f"La moneda '{currency_code}' no existe en el sistema"
            )
        
        # Si es la moneda local, la tasa es 1
        if currency_code == SalaryConverter.LOCAL_CURRENCY_CODE:
            # Crear un objeto ExchangeRate temporal (no guardado en DB)
            return ExchangeRate(
                currency=currency,
                rate=Decimal('1.000000'),
                date_valid=timezone.now(),
                source='SISTEMA'
            )
        
        # Construir query para buscar la tasa
        target_datetime = datetime.combine(
            target_date, 
            datetime.max.time()
        ).replace(tzinfo=timezone.get_current_timezone())
        
        queryset: QuerySet[ExchangeRate] = ExchangeRate.objects.filter(
            currency=currency,
            date_valid__lte=target_datetime
        )
        
        # Filtrar por fuente si se especifica
        if source:
            queryset = queryset.filter(source=source)
        
        # Obtener la más reciente
        exchange_rate: Optional[ExchangeRate] = queryset.order_by('-date_valid').first()
        
        if not exchange_rate:
            source_msg = f" de fuente '{source}'" if source else ""
            raise ExchangeRateNotFoundError(
                f"No se encontró tasa de cambio para {currency_code}{source_msg} "
                f"válida para la fecha {target_date.strftime('%d/%m/%Y')}"
            )
        
        return exchange_rate
    
    @staticmethod
    def convert_to_local(
        amount: Decimal,
        currency_code: str,
        target_date: date,
        source: Optional[str] = None
    ) -> Decimal:
        """
        Convierte un monto a moneda local (VES).
        """
        # Si ya es moneda local, retornar el mismo monto
        if currency_code == SalaryConverter.LOCAL_CURRENCY_CODE:
            return amount
        
        # Obtener la tasa de cambio
        exchange_rate: ExchangeRate = SalaryConverter.get_latest_rate(
            currency_code=currency_code,
            target_date=target_date,
            source=source
        )
        
        # Convertir: monto * tasa
        converted_amount: Decimal = amount * exchange_rate.rate
        
        # Redondear a 2 decimales (centavos)
        return converted_amount.quantize(Decimal('0.01'))
    
    @staticmethod
    def convert_to_local_with_rate(
        amount: Decimal,
        currency_code: str,
        target_date: date,
        source: Optional[str] = None
    ) -> Tuple[Decimal, ExchangeRate]:
        """
        Convierte un monto a moneda local y retorna también la tasa usada.
        """
        exchange_rate: ExchangeRate = SalaryConverter.get_latest_rate(
            currency_code=currency_code,
            target_date=target_date,
            source=source
        )
        
        if currency_code == SalaryConverter.LOCAL_CURRENCY_CODE:
            return amount, exchange_rate
        
        converted_amount: Decimal = (amount * exchange_rate.rate).quantize(Decimal('0.01'))
        
        return converted_amount, exchange_rate
    
    @staticmethod
    def convert_contract_salary(
        contract: LaborContract,
        target_date: date,
        source: Optional[str] = None
    ) -> Decimal:
        """
        Convierte el salario de un contrato a moneda local.
        """
        return SalaryConverter.convert_to_local(
            amount=contract.monthly_salary,
            currency_code=contract.salary_currency.code,
            target_date=target_date,
            source=source
        )


class BCVRateService:
    """
    Servicio para obtener tasas oficiales desde una API externa del BCV.
    """
    DOLAR_URL = "https://bcvapi.onrender.com/tasaDolar"
    EURO_URL = "https://bcvapi.onrender.com/tasaEuro"

    @staticmethod
    @transaction.atomic
    def fetch_and_update_rates() -> dict:
        """
        Obtiene las tasas de USD y EUR y las guarda en la base de datos.
        """
        results = {
            'USD': {'status': 'error', 'rate': None},
            'EUR': {'status': 'error', 'rate': None}
        }

        # 1. Procesar Dólar
        try:
            usd_response = requests.get(BCVRateService.DOLAR_URL, timeout=10)
            if usd_response.status_code == 200:
                data = usd_response.json()
                rate_val = Decimal(str(data['tasa']))
                
                currency_usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'Dólar Estadounidense', 'symbol': '$'})
                
                # Crear o actualizar tasa para el momento actual
                now = timezone.now()
                rate_obj, created = ExchangeRate.objects.get_or_create(
                    currency=currency_usd,
                    date_valid__date=now.date(),
                    source=ExchangeRate.RateSource.BCV,
                    defaults={'rate': rate_val, 'date_valid': now}
                )
                if not created:
                    rate_obj.rate = rate_val
                    rate_obj.save()
                
                results['USD'] = {'status': 'success', 'rate': rate_val, 'created': created}
        except Exception as e:
            results['USD']['error'] = str(e)

        # 2. Procesar Euro
        try:
            eur_response = requests.get(BCVRateService.EURO_URL, timeout=10)
            if eur_response.status_code == 200:
                data = eur_response.json()
                rate_val = Decimal(str(data['tasa']))
                
                currency_eur, _ = Currency.objects.get_or_create(code='EUR', defaults={'name': 'Euro', 'symbol': '€'})
                
                now = timezone.now()
                rate_obj, created = ExchangeRate.objects.get_or_create(
                    currency=currency_eur,
                    date_valid__date=now.date(),
                    source=ExchangeRate.RateSource.BCV,
                    defaults={'rate': rate_val, 'date_valid': now}
                )
                if not created:
                    rate_obj.rate = rate_val
                    rate_obj.save()
                
                results['EUR'] = {'status': 'success', 'rate': rate_val, 'created': created}
        except Exception as e:
            results['EUR']['error'] = str(e)

        return results
