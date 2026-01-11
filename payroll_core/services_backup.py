"""
Servicios de la app Payroll Core.

Capa de lógica de negocio para operaciones de nómina.
Incluye el servicio de conversión de moneda para Venezuela.
"""
from decimal import Decimal
from datetime import datetime, date
from typing import Optional, Tuple
import requests
from django.utils import timezone
from django.db import models, transaction
from django.db.models import QuerySet
from .models import (
    Currency, ExchangeRate, Employee, LaborContract,
    PayrollPeriod, Payslip, PayslipDetail, PayrollConcept,
    PayrollNovelty
)
from .engine import PayrollEngine


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
    
    Uso:
        >>> amount_ves = SalaryConverter.convert_to_local(
        ...     amount=Decimal('500.00'),
        ...     currency_code='USD',
        ...     target_date=date.today()
        ... )
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
        
        Args:
            currency_code: Código de la moneda (ej: 'USD')
            target_date: Fecha para la cual buscar la tasa
            source: Fuente opcional (BCV, MONITOR, etc.)
        
        Returns:
            ExchangeRate: La tasa de cambio encontrada
        
        Raises:
            CurrencyNotFoundError: Si la moneda no existe
            ExchangeRateNotFoundError: Si no hay tasa disponible
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
        # Convertir date a datetime al inicio del día siguiente para incluir todas las tasas del día
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
        
        Busca la tasa de cambio más reciente para la fecha dada
        y multiplica el monto por esa tasa.
        
        Args:
            amount: Monto a convertir
            currency_code: Código de la moneda de origen (ej: 'USD')
            target_date: Fecha para determinar la tasa aplicable
            source: Fuente de la tasa (opcional, ej: 'BCV')
        
        Returns:
            Decimal: Monto convertido a VES
        
        Raises:
            CurrencyNotFoundError: Si la moneda no existe
            ExchangeRateNotFoundError: Si no hay tasa disponible
        
        Example:
            >>> # Convertir 500 USD a VES usando tasa BCV
            >>> ves_amount = SalaryConverter.convert_to_local(
            ...     amount=Decimal('500.00'),
            ...     currency_code='USD',
            ...     target_date=date(2024, 1, 15),
            ...     source='BCV'
            ... )
            >>> print(f"Bs. {ves_amount:,.2f}")
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
        
        Útil cuando se necesita registrar qué tasa se utilizó para la conversión,
        por ejemplo en recibos de pago.
        
        Args:
            amount: Monto a convertir
            currency_code: Código de la moneda de origen
            target_date: Fecha para determinar la tasa
            source: Fuente de la tasa (opcional)
        
        Returns:
            Tuple[Decimal, ExchangeRate]: Monto convertido y tasa utilizada
        
        Example:
            >>> amount_ves, rate = SalaryConverter.convert_to_local_with_rate(
            ...     amount=Decimal('1000.00'),
            ...     currency_code='USD',
            ...     target_date=date.today()
            ... )
            >>> print(f"Monto: Bs. {amount_ves:,.2f}")
            >>> print(f"Tasa: {rate.rate} ({rate.source})")
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
        
        Método de conveniencia que extrae la información del contrato
        y realiza la conversión.
        
        Args:
            contract: Contrato laboral
            target_date: Fecha para la conversión
            source: Fuente de la tasa (opcional)
        
        Returns:
            Decimal: Salario mensual en VES
        
        Example:
            >>> contract = LaborContract.objects.get(id=1)
            >>> salary_ves = SalaryConverter.convert_contract_salary(
            ...     contract=contract,
            ...     target_date=date.today(),
            ...     source='BCV'
            ... )
        """
        return SalaryConverter.convert_to_local(
            amount=contract.monthly_salary,
            currency_code=contract.salary_currency.code,
            target_date=target_date,
            source=source
        )


class EmployeeService:
    """
    Servicio para operaciones relacionadas con empleados.
    
    Proporciona métodos para consultas comunes y operaciones
    de negocio sobre empleados.
    """
    
    @staticmethod
    def get_active_employees() -> QuerySet[Employee]:
        """
        Obtiene todos los empleados activos.
        
        Returns:
            QuerySet[Employee]: Empleados activos ordenados por apellido
        """
        return Employee.objects.filter(is_active=True).order_by('last_name', 'first_name')
    
    @staticmethod
    def get_employees_by_seniority(min_years: int = 0) -> QuerySet[Employee]:
        """
        Obtiene empleados con antigüedad mínima.
        
        Args:
            min_years: Años mínimos de antigüedad
        
        Returns:
            QuerySet[Employee]: Empleados que cumplen el criterio
        """
        cutoff_date = timezone.now().date() - timezone.timedelta(days=min_years * 365)
        return Employee.objects.filter(
            is_active=True,
            hire_date__lte=cutoff_date
        ).order_by('hire_date')
    
    @staticmethod
    def get_employee_current_contract(employee: Employee) -> Optional[LaborContract]:
        """
        Obtiene el contrato vigente de un empleado.
        
        Args:
            employee: Empleado a consultar
        
        Returns:
            Optional[LaborContract]: Contrato vigente o None
        """
        return employee.contracts.filter(is_active=True).first()
    
    @staticmethod
    def calculate_total_payroll(
        target_date: date,
        source: str = 'BCV'
    ) -> Tuple[Decimal, int]:
        """
        Calcula el total de nómina en moneda local.
        
        Args:
            target_date: Fecha para la conversión de tasas
            source: Fuente de la tasa de cambio
        
        Returns:
            Tuple[Decimal, int]: Total en VES y cantidad de empleados
        """
        total: Decimal = Decimal('0.00')
        employee_count: int = 0
        
        active_contracts = LaborContract.objects.filter(is_active=True)
        
        for contract in active_contracts:
            try:
                salary_ves = SalaryConverter.convert_contract_salary(
                    contract=contract,
                    target_date=target_date,
                    source=source
                )
                total += salary_ves
                employee_count += 1
            except (CurrencyNotFoundError, ExchangeRateNotFoundError):
                # Log error pero continuar con los demás
                continue
        
        return total, employee_count


class PayrollProcessor:
    """
    Servicio encargado de ejecutar el cálculo masivo y cierre definitivo de nómina.
    Transforma cálculos de motor en registros inmutables.
    """

    @staticmethod
    @transaction.atomic
    def process_period(period_id: int, user: Optional[models.Model] = None, manual_rate: Optional[Decimal] = None) -> dict:
        """
        Calcula y cierra el periodo para todos los empleados activos.
        
        Paso 1: Validar periodo.
        Paso 2: Obtener tasa BCV (Automática o Manual).
        Paso 3: Agrupar novedades por empleado.
        Paso 4: Procesar cada empleado y persistir snapshots.
        Paso 5: Cerrar periodo.
        """
        # 1. Obtener Periodo
        try:
            period = PayrollPeriod.objects.select_for_update().get(id=period_id)
        except PayrollPeriod.DoesNotExist:
            raise ValueError(f"El periodo {period_id} no existe.")

        if period.status == PayrollPeriod.Status.CLOSED:
            raise ValueError("Este periodo ya se encuentra cerrado.")

        # 2. Obtener Tasa BCV
        bcv_rate = None
        
        if manual_rate:
            # Si el usuario provee una tasa manual, la usamos y la guardamos para el record
            bcv_rate = Decimal(str(manual_rate))
            currency_usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'Dólar Estadounidense'})
            ExchangeRate.objects.get_or_create(
                currency=currency_usd,
                date_valid__date=period.payment_date,
                source=ExchangeRate.RateSource.BCV,
                defaults={'rate': bcv_rate, 'date_valid': datetime.combine(period.payment_date, datetime.min.time()).replace(tzinfo=timezone.get_current_timezone())}
            )
        else:
            try:
                usd_rate_obj = SalaryConverter.get_latest_rate(
                    currency_code='USD',
                    target_date=period.payment_date,
                    source='BCV'
                )
                bcv_rate = usd_rate_obj.rate
            except (CurrencyNotFoundError, ExchangeRateNotFoundError):
                raise ValueError(
                    f"No hay una tasa BCV válida cargada para la fecha {period.payment_date}. "
                    "Cargue la tasa de cambio antes de proceder al cierre."
                )

        # 3. Obtener Empleados y Novedades
        active_employees = Employee.objects.filter(is_active=True).prefetch_related('contracts')
        
        # Agrupar novedades: { employee_id: { concept_code: amount, ... }, ... }
        all_novelties = PayrollNovelty.objects.filter(period=period)
        novelties_map = {}
        for n in all_novelties:
            if n.employee_id not in novelties_map:
                novelties_map[n.employee_id] = {}
            novelties_map[n.employee_id][n.concept_code] = n.amount

        # 4. Procesamiento
        processed_count = 0
        total_income_ves = Decimal('0.00')
        warnings = []

        for employee in active_employees:
            contract = employee.contracts.filter(is_active=True).first()
            if not contract:
                warnings.append(f"Empleado {employee.full_name} ({employee.national_id}) no tiene contrato activo.")
                continue

            # Obtener variables de entrada (novedades)
            input_vars = novelties_map.get(employee.id, {})

            # Ejecutar Motor (Lógica Centralizada LOTTT)
            engine = PayrollEngine(
                contract=contract,
                period=period,
                input_variables=input_vars
            )
            
            # Obtener resultados calculados por el motor
            # Esto incluye: Conceptos de Contrato (Base, Cesta, Compl) + Deducciones Ley + Conceptos Dinámicos
            calculation_result = engine.calculate_payroll()
            
            result_lines = calculation_result.get('lines', [])
            totals = calculation_result.get('totals', {})
            
            if not result_lines:
                continue

            # 5. Guardar Snapshot e Inmutabilidad
            snapshot = {
                'position': contract.position,
                'salary_amount': str(contract.salary_amount),
                'salary_currency': contract.salary_currency.code,
                'payment_frequency': contract.payment_frequency,
                'hire_date': str(employee.hire_date),
                'department': contract.department.name if contract.department else None,
                'base_salary_bs': str(contract.base_salary_bs)
            }

            payslip = Payslip.objects.create(
                period=period,
                employee=employee,
                contract_snapshot=snapshot,
                total_income_ves=totals.get('income_ves', 0),
                total_deductions_ves=totals.get('deductions_ves', 0),
                net_pay_ves=totals.get('net_pay_ves', 0),
                exchange_rate_applied=bcv_rate,
                currency_code='VES',
                status=Payslip.PayslipStatus.DRAFT
            )

            # Bulk create de detalles
            detail_objs = []
            for line in result_lines:
                # line = {'code', 'name', 'kind', 'amount_ves'}
                detail_objs.append(
                    PayslipDetail(
                        payslip=payslip,
                        concept_code=line['code'],
                        concept_name=line['name'],
                        kind=line['kind'],
                        amount_ves=line['amount_ves'],
                        # Referencial en moneda origen (si aplica)
                        amount_src=(line['amount_ves'] / bcv_rate).quantize(Decimal('0.01')) if bcv_rate else 0
                    )
                )

            PayslipDetail.objects.bulk_create(detail_objs)

            processed_count += 1
            total_income_ves += totals.get('net_pay_ves', 0)

        # 6. Finalizar Periodo
        period.status = PayrollPeriod.Status.CLOSED
        period.save()

        return {
            "processed_employees": processed_count,
            "total_payroll_ves": float(total_income_ves),
            "exchange_rate": float(bcv_rate),
            "warnings": warnings
        }


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
                # Usamos update_or_create con la fecha del día para evitar duplicados excesivos en el mismo día si se corre varias veces
                # Pero el modelo tiene unique_together con date_valid, así que usaremos la fecha sugerida por la API o el ahora.
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
