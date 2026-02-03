# -*- coding: utf-8 -*-
"""
Management Command: accrue_all_historical

Ejecuta la acumulación histórica de vacaciones para TODOS los empleados
con contrato activo que no tienen movimientos ACCRUAL completos.

Uso (multi-tenant):
    python manage.py tenant_command accrue_all_historical --schema=nombre_tenant
    python manage.py tenant_command accrue_all_historical --schema=nombre_tenant --dry-run

Opciones:
    --dry-run: Mostrar qué se haría sin ejecutar cambios
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count

from payroll_core.models import Employee
from vacations.models import VacationBalance


class Command(BaseCommand):
    """
    Migración masiva: acumula todos los años pendientes para cada empleado.
    
    NOTA: Este comando debe ejecutarse dentro de un contexto de tenant.
    Use: python manage.py tenant_command accrue_all_historical --schema=<tenant>
    """
    help = 'Acumulación histórica masiva de vacaciones (LOTTT Art. 190)'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar qué se haría sin ejecutar cambios',
        )
    
    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('=== MODO DRY-RUN ===\n'))
        
        # Obtener empleados con contrato activo
        employees = Employee.objects.filter(
            contracts__is_active=True
        ).distinct()
        
        total_employees = employees.count()
        self.stdout.write(f'Procesando {total_employees} empleados con contrato activo...\n')
        
        processed_count = 0
        skipped_count = 0
        total_days_all = 0
        total_years_all = 0
        error_count = 0
        
        for employee in employees:
            try:
                years_of_service = employee.seniority_years or 1
                
                # Contar cuántos años ya tienen ACCRUAL
                existing_accruals = VacationBalance.objects.filter(
                    employee=employee,
                    transaction_type=VacationBalance.TransactionType.ACCRUAL
                ).count()
                
                # Si ya tiene todos los años, omitir
                if existing_accruals >= years_of_service:
                    self.stdout.write(
                        f'  {employee.full_name}: Ya tiene {existing_accruals} acumulaciones (omitido)'
                    )
                    skipped_count += 1
                    continue
                
                # Calcular días pendientes
                pending_days = 0
                pending_years = 0
                for year in range(1, years_of_service + 1):
                    if not VacationBalance.has_accrual_for_year(employee, year):
                        days = 15 if year == 1 else min(15 + (year - 1), 30)
                        pending_days += days
                        pending_years += 1
                
                if pending_years == 0:
                    skipped_count += 1
                    continue
                
                if dry_run:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  {employee.full_name}: +{pending_days} días '
                            f'({pending_years} años pendientes de {years_of_service})'
                        )
                    )
                    processed_count += 1
                    total_days_all += pending_days
                    total_years_all += pending_years
                else:
                    # Ejecutar acumulación histórica
                    result = VacationBalance.accrue_historical(
                        employee=employee,
                        created_by='COMMAND:accrue_all_historical'
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'  {employee.full_name}: +{result["total_days_added"]} días '
                            f'({result["years_processed"]} años) -> Saldo: {result["new_balance"]}'
                        )
                    )
                    processed_count += 1
                    total_days_all += result['total_days_added']
                    total_years_all += result['years_processed']
                    
            except Exception as e:
                error_count += 1
                self.stdout.write(
                    self.style.ERROR(f'  ERROR {employee.full_name}: {str(e)}')
                )
        
        # Resumen
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS(f'Empleados procesados: {processed_count}'))
        self.stdout.write(f'Empleados omitidos (ya completos): {skipped_count}')
        self.stdout.write(self.style.SUCCESS(f'Total años acumulados: {total_years_all}'))
        self.stdout.write(self.style.SUCCESS(f'Total días acumulados: {total_days_all}'))
        if error_count > 0:
            self.stdout.write(self.style.ERROR(f'Errores: {error_count}'))
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\n(Dry-run: no se guardaron cambios)'))
