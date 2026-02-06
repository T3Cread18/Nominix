import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from datetime import datetime
from payroll_core.models import (
    Branch, Department, JobPosition, Employee, LaborContract, Currency, Company
)

from django.utils.text import slugify

class Command(BaseCommand):
    help = 'Import standardized workers from JSON file'

    def add_arguments(self, parser):
        parser.add_argument('json_path', type=str, help='Path to standardized_workers.json')

    def handle(self, *args, **options):
        json_path = options['json_path']
        
        if not os.path.exists(json_path):
            self.stderr.write(self.style.ERROR(f"File not found: {json_path}"))
            return

        with open(json_path, 'r', encoding='utf-8') as f:
            workers = json.load(f)

        # Ensure USD currency exists
        usd, _ = Currency.objects.get_or_create(code='USD', defaults={'name': 'Dólar Estadounidense', 'symbol': '$'})

        created_count = 0
        updated_count = 0
        error_count = 0

        self.stdout.write(self.style.SUCCESS(f"Starting import of {len(workers)} records..."))

        for data in workers:
            try:
                with transaction.atomic():
                    # 1. Get or Create Branch
                    branch_name = data.get('branch')
                    if not branch_name:
                        self.stderr.write(f"Skip Row {data['source_row']}: No branch specified")
                        continue
                    
                    branch_code = slugify(branch_name)[:20].upper()
                    branch, _ = Branch.objects.get_or_create(
                        code=branch_code,
                        defaults={
                            'name': branch_name,
                            'is_active': True
                        }
                    )

                    # 2. Get or Create Department (linked to branch)
                    dept_name = data.get('department') or "GENERAL"
                    dept_code = slugify(f"{branch_code}-{dept_name}")[:50]
                    dept, _ = Department.objects.get_or_create(
                        name=dept_name,
                        branch=branch,
                        defaults={'description': f'Departamento de {dept_name}'}
                    )

                    # 3. Get or Create JobPosition (linked to dept)
                    pos_name = data.get('position') or "TRABAJADOR"
                    pos_code = slugify(f"{dept.id}-{pos_name}")[:20].upper()
                    job_pos, _ = JobPosition.objects.get_or_create(
                        code=pos_code,
                        defaults={
                            'name': pos_name,
                            'department': dept,
                            'currency': usd,
                            'default_total_salary': 0
                        }
                    )

                    # 4. Process Employee
                    full_name = data.get('name', 'SIN NOMBRE')
                    name_parts = full_name.split(' ', 1)
                    first_name = name_parts[0]
                    last_name = name_parts[1] if len(name_parts) > 1 else ""

                    cid_raw = data.get('cid')
                    if not cid_raw:
                        self.stderr.write(f"Skip Row {data['source_row']} ({full_name}): No CID")
                        error_count += 1
                        continue
                    
                    national_id = f"V-{cid_raw}" if not cid_raw.startswith(('V-', 'E-')) else cid_raw
                    
                    def parse_date(d_str):
                        if not d_str or str(d_str) == 'None': return None
                        try:
                            # Handle date objects if they were serialized as strings
                            return datetime.fromisoformat(str(d_str)).date()
                        except:
                            return None

                    employee, created = Employee.objects.update_or_create(
                        national_id=national_id,
                        defaults={
                            'first_name': first_name,
                            'last_name': last_name,
                            'email': data.get('email') or None,
                            'phone': data.get('phone') or '',
                            'date_of_birth': parse_date(data.get('birth_date')),
                            'address': '',
                            'branch': branch,
                            'department': dept,
                            'job_position': job_pos,
                            'hire_date': parse_date(data.get('hire_date')) or timezone.now().date(),
                            'bank_name': data.get('bank') or '',
                            'bank_account_number': data.get('account') or '',
                            'is_active': True,
                            'employee_code': national_id.replace("-", "")
                        }
                    )

                    # 5. Create active LaborContract
                    LaborContract.objects.update_or_create(
                        employee=employee,
                        is_active=True,
                        defaults={
                            'branch': branch,
                            'department': dept,
                            'job_position': job_pos,
                            'position': pos_name,
                            'salary_amount': 0,
                            'salary_currency': usd,
                            'start_date': employee.hire_date,
                            'payment_frequency': 'BIWEEKLY'
                        }
                    )

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Error Row {data.get('source_row')} ({data.get('name')}): {str(e)}"))
                error_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Import Finished: {created_count} created, {updated_count} updated, {error_count} errors."
        ))
