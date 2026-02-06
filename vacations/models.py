# -*- coding: utf-8 -*-
"""
Modelos del Módulo de Vacaciones - Nóminix

Este módulo implementa los modelos para la gestión de vacaciones
según la Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras (LOTTT).

Referencias Legales:
- Art. 190: Días de vacaciones (15 días + 1 por año adicional, máx. 30)
- Art. 192: Bono vacacional (15 días + 1 por año adicional, máx. 30)
"""
from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone

from payroll_core.models import Employee, LaborContract


class VacationRequest(models.Model):
    """
    Solicitud de Vacaciones.
    
    Representa una solicitud de disfrute de vacaciones por parte de un empleado.
    El flujo típico es: DRAFT -> APPROVED -> PROCESSED (tras cierre de nómina).
    
    Campos principales:
    - employee: Empleado que solicita las vacaciones
    - start_date / end_date: Período de disfrute
    - days_requested: Días de vacaciones solicitados
    - return_date: Fecha de reincorporación (calculada considerando días hábiles)
    - status: Estado del flujo de aprobación
    - type: Individual o Colectiva
    """
    
    class Status(models.TextChoices):
        """Estados posibles de una solicitud de vacaciones."""
        DRAFT = 'DRAFT', 'Borrador'
        APPROVED = 'APPROVED', 'Aprobada'
        REJECTED = 'REJECTED', 'Rechazada'
        PROCESSED = 'PROCESSED', 'Procesada'
    
    class VacationType(models.TextChoices):
        """Tipo de vacación."""
        INDIVIDUAL = 'INDIVIDUAL', 'Individual'
        COLLECTIVE = 'COLLECTIVE', 'Colectiva'
    
    # ==========================================================================
    # RELACIONES
    # ==========================================================================
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='vacation_requests',
        verbose_name='Empleado',
        help_text='Empleado que solicita las vacaciones'
    )
    
    contract = models.ForeignKey(
        LaborContract,
        on_delete=models.PROTECT,
        related_name='vacation_requests',
        verbose_name='Contrato Laboral',
        help_text='Contrato vigente al momento de la solicitud',
        null=True,
        blank=True
    )
    
    # ==========================================================================
    # FECHAS
    # ==========================================================================
    
    start_date = models.DateField(
        verbose_name='Fecha de Inicio',
        help_text='Primer día de vacaciones'
    )
    
    end_date = models.DateField(
        verbose_name='Fecha de Fin',
        help_text='Último día de vacaciones'
    )
    
    days_requested = models.PositiveIntegerField(
        verbose_name='Días Solicitados',
        validators=[MinValueValidator(1)],
        help_text='Cantidad de días de vacaciones solicitados'
    )
    
    return_date = models.DateField(
        verbose_name='Fecha de Reincorporación',
        help_text='Fecha en que el empleado se reintegra al trabajo (calculada)',
        null=True,
        blank=True
    )
    
    # ==========================================================================
    # CLASIFICACIÓN Y ESTADO
    # ==========================================================================
    
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name='Estado',
        help_text='Estado actual de la solicitud'
    )
    
    vacation_type = models.CharField(
        max_length=20,
        choices=VacationType.choices,
        default=VacationType.INDIVIDUAL,
        verbose_name='Tipo de Vacación',
        help_text='Individual o Colectiva (cierre de empresa)'
    )
    
    # ==========================================================================
    # INFORMACIÓN ADICIONAL
    # ==========================================================================
    
    notes = models.TextField(
        blank=True,
        verbose_name='Observaciones',
        help_text='Notas adicionales sobre la solicitud'
    )
    
    approved_by = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Aprobado Por',
        help_text='Usuario que aprobó la solicitud'
    )
    
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Fecha de Aprobación'
    )
    
    # ==========================================================================
    # METADATA / AUDITORÍA
    # ==========================================================================
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Última Actualización'
    )
    
    class Meta:
        verbose_name = 'Solicitud de Vacaciones'
        verbose_name_plural = 'Solicitudes de Vacaciones'
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['employee', '-start_date']),
            models.Index(fields=['status']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self) -> str:
        """Representación en string de la solicitud."""
        return f"{self.employee.full_name} - {self.start_date} ({self.days_requested} días)"
    
    def save(self, *args, **kwargs):
        """
        Lógica pre-guardado:
        - Asigna el contrato activo si no está definido
        - Calcula fecha de retorno si no está definida
        """
        # Asignar contrato activo del empleado si no está definido
        if not self.contract:
            self.contract = self.employee.contracts.filter(is_active=True).first()
        
        # Calcular fecha de retorno (día siguiente al end_date por simplicidad)
        # TODO: Implementar cálculo de días hábiles real
        if not self.return_date and self.end_date:
            from datetime import timedelta
            self.return_date = self.end_date + timedelta(days=1)
        
        super().save(*args, **kwargs)


class VacationBalance(models.Model):
    """
    Kardex/Ledger de Saldo de Vacaciones.
    
    Registro inmutable de movimientos del saldo vacacional de un empleado.
    Similar al patrón de SocialBenefitsLedger, este modelo actúa como
    un libro mayor de vacaciones donde cada fila representa un movimiento.
    
    Tipos de Movimientos:
    - ACCRUAL (Ganado): Días devengados al cumplir un año de servicio
    - USAGE (Disfrutado): Días consumidos al aprobar una solicitud
    - ADJUSTMENT: Correcciones manuales (ej: migración de datos legacy)
    
    Referencia LOTTT:
    - Art. 190: El trabajador tiene derecho a vacaciones remuneradas de
      15 días hábiles, con un día adicional por cada año de servicio,
      hasta un máximo de 15 días adicionales.
    """
    
    class TransactionType(models.TextChoices):
        """Tipo de movimiento en el kardex de vacaciones."""
        ACCRUAL = 'ACCRUAL', 'Ganado'          # Días devengados
        USAGE = 'USAGE', 'Disfrutado'          # Días consumidos
        ADJUSTMENT = 'ADJUSTMENT', 'Ajuste'    # Corrección manual
    
    # ==========================================================================
    # RELACIONES
    # ==========================================================================
    
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name='vacation_balance_entries',
        verbose_name='Empleado'
    )
    
    related_request = models.ForeignKey(
        VacationRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='balance_entries',
        verbose_name='Solicitud Relacionada',
        help_text='Solicitud de vacaciones asociada a este movimiento'
    )
    
    # ==========================================================================
    # DATOS DEL MOVIMIENTO
    # ==========================================================================
    
    period_year = models.PositiveIntegerField(
        verbose_name='Año del Período',
        help_text='Año de servicio al que corresponde el movimiento (1, 2, 3...)',
        validators=[MinValueValidator(1)]
    )
    
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        verbose_name='Tipo de Movimiento'
    )
    
    days = models.IntegerField(
        verbose_name='Días',
        help_text='Cantidad de días (positivo=ganado, negativo=consumido)'
    )
    
    transaction_date = models.DateField(
        verbose_name='Fecha del Movimiento',
        default=timezone.now
    )
    
    description = models.TextField(
        verbose_name='Descripción',
        help_text='Detalle del movimiento'
    )
    
    # ==========================================================================
    # AUDITORÍA
    # ==========================================================================
    
    created_by = models.CharField(
        max_length=100,
        default='SYSTEM',
        verbose_name='Creado Por'
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Fecha de Creación'
    )
    
    class Meta:
        verbose_name = 'Movimiento de Vacaciones'
        verbose_name_plural = 'Movimientos de Vacaciones'
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['employee', '-transaction_date']),
            models.Index(fields=['transaction_type']),
            models.Index(fields=['period_year']),
        ]
    
    def __str__(self) -> str:
        """Representación en string del movimiento."""
        sign = '+' if self.days > 0 else ''
        return f"{self.employee.full_name} | Año {self.period_year} | {sign}{self.days} días ({self.get_transaction_type_display()})"
    
    @classmethod
    def get_balance(cls, employee: Employee) -> int:
        """
        Obtiene el saldo actual de días de vacaciones del empleado.
        
        Args:
            employee: Instancia de Employee
            
        Returns:
            Saldo total de días disponibles (puede ser negativo si hay deuda)
        """
        from django.db.models import Sum
        result = cls.objects.filter(employee=employee).aggregate(
            total=Sum('days')
        )
        return result['total'] or 0
    
    @classmethod
    def accrue_days(
        cls,
        employee: Employee,
        year: int = None,
        created_by: str = 'SYSTEM'
    ) -> 'VacationBalance':
        """
        Registra la acumulación anual de días de vacaciones para un empleado.
        
        Según LOTTT Art. 190:
        - Año 1: 15 días hábiles
        - Años siguientes: +1 día por año de servicio
        - Máximo: 30 días (15 base + 15 adicionales)
        
        Args:
            employee: Empleado al que se le acumulan los días
            year: Año de servicio (default: años de antigüedad actual)
            created_by: Usuario que registra el movimiento
        
        Returns:
            VacationBalance creado
        
        Raises:
            ValueError: Si ya existe un movimiento ACCRUAL para el año especificado
        """
        from django.utils import timezone
        
        # Calcular año de servicio si no se especifica
        if year is None:
            year = employee.seniority_years or 1
        
        # Verificar si ya existe ACCRUAL para este año
        existing = cls.objects.filter(
            employee=employee,
            transaction_type=cls.TransactionType.ACCRUAL,
            period_year=year
        ).exists()
        
        if existing:
            raise ValueError(
                f"Ya existe un movimiento de acumulación para el año {year} "
                f"del empleado {employee.full_name}"
            )
        
        # Calcular días según LOTTT Art. 190
        # Base: 15 días, +1 por año adicional, máximo 30
        base_days = 15
        additional_days = min(year - 1, 15) if year > 1 else 0
        total_days = base_days + additional_days
        
        # Crear movimiento de acumulación
        accrual = cls.objects.create(
            employee=employee,
            period_year=year,
            transaction_type=cls.TransactionType.ACCRUAL,
            days=total_days,
            transaction_date=timezone.now().date(),
            description=f"Acumulación año {year} de servicio: {base_days} base + {additional_days} adicionales = {total_days} días (LOTTT Art. 190)",
            created_by=created_by
        )
        
        return accrual
    
    @classmethod
    def has_accrual_for_year(cls, employee: Employee, year: int) -> bool:
        """
        Verifica si el empleado ya tiene acumulación para un año específico.
        
        Args:
            employee: Empleado a verificar
            year: Año de servicio
            
        Returns:
            True si ya existe acumulación, False si no
        """
        return cls.objects.filter(
            employee=employee,
            transaction_type=cls.TransactionType.ACCRUAL,
            period_year=year
        ).exists()
    
    @classmethod
    def accrue_historical(
        cls,
        employee: Employee,
        created_by: str = 'MIGRATION'
    ) -> dict:
        """
        Registra TODOS los años de vacaciones pendientes para un empleado
        que no tiene movimientos previos en el kardex.
        
        LOTTT Art. 190:
        - Año 1: 15 días
        - Año 2+: 15 + (año - 1), máximo 30 días por año
        
        Ejemplo para empleado con 8 años de servicio:
        - Año 1: 15 días
        - Año 2: 16 días
        - Año 3: 17 días
        - ...
        - Año 8: 22 días
        - TOTAL: 148 días
        
        Args:
            employee: Empleado para procesar
            created_by: Usuario que ejecuta la migración
            
        Returns:
            dict con:
            - accruals: Lista de VacationBalance creados
            - total_days_added: Total de días acumulados
            - new_balance: Saldo final después de la operación
            - years_processed: Cantidad de años procesados
        """
        from django.utils import timezone
        from django.db import transaction as db_transaction
        
        years_of_service = employee.seniority_years
        
        # Validación: empleados con menos de 1 año no pueden acumular vacaciones
        if years_of_service is None or years_of_service < 1:
            return {
                'accruals': [],
                'total_days_added': 0,
                'new_balance': cls.get_balance(employee),
                'years_processed': 0,
                'years_of_service': years_of_service or 0,
                'message': 'Empleado con menos de 1 año de servicio. No se acumularon días.'
            }
        
        accruals = []
        total_days = 0
        
        with db_transaction.atomic():
            for year in range(1, years_of_service + 1):
                # Calcular días para este año según LOTTT Art. 190
                if year == 1:
                    days = 15
                else:
                    days = min(15 + (year - 1), 30)  # Máximo 30 días por año
                
                # Verificar si ya existe ACCRUAL para este año
                if not cls.has_accrual_for_year(employee, year):
                    accrual = cls.objects.create(
                        employee=employee,
                        transaction_type=cls.TransactionType.ACCRUAL,
                        days=days,
                        period_year=year,
                        transaction_date=timezone.now().date(),
                        description=f"Acumulación histórica año {year}: {days} días (LOTTT Art. 190)",
                        created_by=created_by
                    )
                    accruals.append(accrual)
                    total_days += days
        
        return {
            'accruals': accruals,
            'total_days_added': total_days,
            'new_balance': cls.get_balance(employee),
            'years_processed': len(accruals),
            'years_of_service': years_of_service
        }


class Holiday(models.Model):
    """
    Días Feriados.
    
    Modelo para gestionar los feriados nacionales y locales de Venezuela.
    Se usa para:
    - Calcular fechas de retorno excluyendo feriados
    - Advertir al usuario cuando selecciona un feriado como inicio de vacaciones
    
    Feriados Nacionales de Venezuela:
    - 01 Enero: Año Nuevo
    - Carnaval (Lunes y Martes, variable)
    - Semana Santa (Jueves y Viernes, variable)
    - 19 Abril: Declaración de Independencia
    - 01 Mayo: Día del Trabajador
    - 24 Junio: Batalla de Carabobo
    - 05 Julio: Día de la Independencia
    - 24 Julio: Natalicio de Bolívar
    - 12 Octubre: Día de la Resistencia Indígena
    - 24-25 Diciembre: Navidad
    - 31 Diciembre: Fin de Año
    """
    
    date = models.DateField(
        verbose_name='Fecha',
        unique=True,
        help_text='Fecha del feriado'
    )
    
    name = models.CharField(
        max_length=100,
        verbose_name='Nombre',
        help_text='Nombre del feriado (ej: Día del Trabajador)'
    )
    
    is_national = models.BooleanField(
        default=True,
        verbose_name='Nacional',
        help_text='¿Es un feriado nacional?'
    )
    
    is_recurring = models.BooleanField(
        default=True,
        verbose_name='Recurrente',
        help_text='¿Se repite cada año en la misma fecha?'
    )
    
    class Meta:
        verbose_name = 'Feriado'
        verbose_name_plural = 'Feriados'
        ordering = ['date']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['is_national']),
        ]
    
    def __str__(self) -> str:
        """Representación en string del feriado."""
        return f"{self.date} - {self.name}"
    
    @classmethod
    def is_holiday(cls, check_date) -> bool:
        """
        Verifica si una fecha es feriado.
        
        Args:
            check_date: Fecha a verificar (date object)
            
        Returns:
            True si es feriado, False si no
        """
        return cls.objects.filter(date=check_date).exists()
    
    @classmethod
    def get_holidays_for_year(cls, year: int):
        """
        Obtiene todos los feriados de un año específico.
        
        Args:
            year: Año a consultar
            
        Returns:
            QuerySet de feriados del año
        """
        return cls.objects.filter(date__year=year)


class VacationPayment(models.Model):
    """
    Registro de Pago de Vacaciones.
    
    Modelo INMUTABLE que almacena el registro completo de un pago de vacaciones
    procesado. Una vez creado, no puede ser modificado.
    
    Contiene:
    - Desglose de días (vacaciones, descanso, feriados, bono)
    - Montos devengados
    - Deducciones de ley (IVSS, FAOV, RPE)
    - Neto a pagar
    - Traza de cálculo para auditoría
    """
    
    # Relación con la solicitud
    vacation_request = models.OneToOneField(
        VacationRequest,
        on_delete=models.PROTECT,
        related_name='payment',
        verbose_name='Solicitud de Vacaciones'
    )
    
    # Fecha de procesamiento
    payment_date = models.DateField(
        verbose_name='Fecha de Pago',
        help_text='Fecha en que se procesó el pago'
    )
    
    # Salario base
    daily_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name='Salario Diario'
    )
    
    # Días
    vacation_days = models.PositiveIntegerField(
        verbose_name='Días de Vacaciones',
        help_text='Días hábiles de vacaciones disfrutados'
    )
    rest_days = models.PositiveIntegerField(
        default=0,
        verbose_name='Días de Descanso',
        help_text='Sábados y Domingos dentro del período'
    )
    holiday_days = models.PositiveIntegerField(
        default=0,
        verbose_name='Días Feriados',
        help_text='Feriados nacionales dentro del período'
    )
    bonus_days = models.PositiveIntegerField(
        verbose_name='Días de Bono',
        help_text='Días de bono vacacional (Art. 192 LOTTT)'
    )
    
    # Montos devengados
    vacation_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Monto Vacaciones'
    )
    rest_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Monto Días Descanso'
    )
    holiday_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Monto Días Feriados'
    )
    bonus_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Monto Bono Vacacional'
    )
    gross_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Total Bruto'
    )
    
    # Deducciones
    ivss_deduction = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Deducción IVSS (4%)'
    )
    faov_deduction = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Deducción FAOV (1%)'
    )
    rpe_deduction = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Deducción RPE (0.5%)'
    )
    total_deductions = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        verbose_name='Total Deducciones'
    )
    
    # Neto
    net_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Neto a Pagar'
    )
    
    # Archivo PDF (opcional)
    receipt_pdf = models.FileField(
        upload_to='vacations/receipts/',
        blank=True,
        null=True,
        verbose_name='Recibo PDF'
    )
    
    # Auditoría
    calculation_trace = models.TextField(
        blank=True,
        verbose_name='Traza de Cálculo',
        help_text='Registro detallado del cálculo para auditoría'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=100, blank=True)
    
    class Meta:
        verbose_name = 'Pago de Vacaciones'
        verbose_name_plural = 'Pagos de Vacaciones'
        ordering = ['-payment_date', '-created_at']
    
    def __str__(self):
        return f"Pago #{self.id} - {self.vacation_request.employee.full_name} ({self.net_amount})"
    
    def save(self, *args, **kwargs):
        """
        Sobreescribe save para hacer el modelo INMUTABLE.
        Solo permite creación, nunca actualización.
        """
        if self.pk:
            raise ValueError(
                "VacationPayment es inmutable. No se puede modificar después de creado."
            )
        super().save(*args, **kwargs)
    
    @classmethod
    def create_from_calculation(cls, vacation_request, calculation: dict, created_by: str = 'SYSTEM', payment_date=None):
        """
        Crea un registro de pago a partir de un cálculo de VacationEngine.
        
        Args:
            vacation_request: Instancia de VacationRequest
            calculation: Dict retornado por VacationEngine.calculate_complete_payment()
            created_by: Usuario que procesa el pago
            payment_date: Fecha de pago (opcional, default: today)
        
        Returns:
            Instancia de VacationPayment creada
        """
        from django.utils import timezone
        
        if payment_date is None:
            payment_date = timezone.now().date()
        
        return cls.objects.create(
            vacation_request=vacation_request,
            payment_date=payment_date,
            daily_salary=calculation['daily_salary'],
            vacation_days=calculation['vacation_days'],
            rest_days=calculation['rest_days'],
            holiday_days=calculation['holiday_days'],
            bonus_days=calculation['bonus_days'],
            vacation_amount=calculation['vacation_amount'],
            rest_amount=calculation['rest_amount'],
            holiday_amount=calculation['holiday_amount'],
            bonus_amount=calculation['bonus_amount'],
            gross_amount=calculation['gross_total'],
            ivss_deduction=calculation['ivss_amount'],
            faov_deduction=calculation['faov_amount'],
            rpe_deduction=calculation['rpe_amount'],
            total_deductions=calculation['total_deductions'],
            net_amount=calculation['net_total'],
            calculation_trace=calculation['calculation_trace'],
            created_by=created_by
        )
