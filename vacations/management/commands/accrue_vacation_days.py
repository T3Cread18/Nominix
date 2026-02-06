# -*- coding: utf-8 -*-
"""
Management Command: accrue_vacation_days

Ejecuta la acumulación de días de vacaciones para todos los empleados
con contrato activo, según LOTTT Art. 190.

Uso (multi-tenant):
    python manage.py tenant_command accrue_vacation_days --schema=nombre_tenant
    python manage.py tenant_command accrue_vacation_days --schema=nombre_tenant --dry-run
    python manage.py tenant_command accrue_vacation_days --schema=nombre_tenant --force

Opciones:
    --dry-run: Muestra qué se haría sin ejecutar cambios
    --employee-id: Procesar solo un empleado específico
    --force: Forzar acumulación incluso si ya existe (crear todos los años faltantes)
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from payroll_core.models import Employee, LaborContract
from vacations.models import VacationBalance


class Command(BaseCommand):
    """
    Comando para registrar acumulación de días de vacaciones.
    
    NOTA: Este comando debe ejecutarse dentro de un contexto de tenant.
    Use: python manage.py tenant_command accrue_vacation_days --schema=<tenant>
    """
    help = 'Registra la acumulación de días de vacaciones (LOTTT Art. 190)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar qué se haría sin ejecutar cambios',
        )
        parser.add_argument(
            '--employee-id',
            type=int,
            help='Procesar solo el empleado con este ID',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Crear acumulaciones para todos los años faltantes',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        employee_id = options.get('employee_id')
        force = options['force']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('=== MODO DRY-RUN ==='))
        
        # Obtener empleados con contrato activo
        if employee_id:
            try:
                employees = Employee.objects.filter(
                    pk=employee_id,
                    contracts__is_active=True
                ).distinct()
                if not employees.exists():
                    raise CommandError(f'Empleado {employee_id} no encontrado o sin contrato activo')
            except Employee.DoesNotExist:
                raise CommandError(f'Empleado con ID {employee_id} no encontrado')
        else:
            employees = Employee.objects.filter(
                contracts__is_active=True
            ).distinct()
        
        total_count = employees.count()
        self.stdout.write(f'Procesando {total_count} empleados con contrato activo...\n')
        
        created_count = 0
        skipped_count = 0
        error_count = 0
        
        for employee in employees:
            try:
                years_of_service = employee.seniority_years or 1
                
                if force:
                    # Crear acumulaciones para todos los años faltantes
                    for year in range(1, years_of_service + 1):
                        result = self._process_accrual(employee, year, dry_run)
                        if result == 'created':
                            created_count += 1
                        elif result == 'skipped':
                            skipped_count += 1
                else:
                    # Solo crear para el año actual de servicio
                    result = self._process_accrual(employee, years_of_service, dry_run)
                    if result == 'created':
                        created_count += 1
                    elif result == 'skipped':
                        skipped_count += 1
                        
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'  ERROR {employee.full_name}: {str(e)}')
                )
        
        # Resumen
        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(self.style.SUCCESS(f'Acumulaciones creadas: {created_count}'))
        self.stdout.write(f'Omitidos (ya existían): {skipped_count}')
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errores: {error_count}'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n(Dry-run: no se guardaron cambios)'))
    
    def _process_accrual(self, employee, year, dry_run):
        """
        Procesa la acumulación para un empleado y año específico.
        
        Returns:
            'created', 'skipped', o 'error'
        """
        # Verificar si ya existe
        if VacationBalance.has_accrual_for_year(employee, year):
            self.stdout.write(
                f'  {employee.full_name} - Año {year}: ya tiene acumulación (omitido)'
            )
            return 'skipped'
        
        # Calcular días
        base_days = 15
        additional_days = min(year - 1, 15) if year > 1 else 0
        total_days = base_days + additional_days
        
        if dry_run:
            self.stdout.write(
                self.style.SUCCESS(
                    f'  {employee.full_name} - Año {year}: '
                    f'+{total_days} días (15 base + {additional_days} adicionales)'
                )
            )
            return 'created'
        
        # Crear acumulación
        with transaction.atomic():
            accrual = VacationBalance.accrue_days(
                employee=employee,
                year=year,
                created_by='COMMAND:accrue_vacation_days'
            )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'  {employee.full_name} - Año {year}: '
                f'+{total_days} días (ID: {accrual.id})'
            )
        )
        return 'created'
