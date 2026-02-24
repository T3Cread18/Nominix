"""
Generador de Archivo TXT para FAOV — Banavih.

Formato:
- Delimitado por comas
- Nombre del archivo: N<nro_patronal_20dig><MM><AAAA>.txt
- Cada línea = un empleado

Campos por línea:
    TipoID(1), Cédula(5-8), PrimerNombre(2-25), SegundoNombre,
    PrimerApellido, SegundoApellido, NroAfiliacion(10),
    FechaIngreso(DDMMAAAA), FechaEgreso, SalarioMensual(decimal)
"""
from decimal import Decimal
from datetime import date
from typing import List, Optional

from payroll_core.models import Employee, Company
from payroll_core.services.currency import get_usd_exchange_rate


class FAOVExport:
    """
    Genera archivos TXT para declaración de FAOV ante Banavih.
    """
    
    @staticmethod
    def generate(
        year: int,
        month: int,
        employees: Optional[List[Employee]] = None,
    ) -> str:
        """
        Genera el contenido del archivo TXT FAOV.
        
        Args:
            year: Año de la declaración
            month: Mes de la declaración
            employees: Lista de empleados (default: todos los activos)
        
        Returns:
            Contenido del archivo TXT como string
        """
        if employees is None:
            employees = Employee.objects.filter(
                is_active=True
            ).select_related()
        
        exchange_rate = get_usd_exchange_rate()
        lines = []
        
        for emp in employees:
            line = FAOVExport._build_line(emp, exchange_rate)
            if line:
                lines.append(line)
        
        return '\n'.join(lines)
    
    @staticmethod
    def get_filename(year: int, month: int) -> str:
        """
        Genera el nombre del archivo según formato Banavih.
        Formato: N<nro_patronal_20dig><MM><AAAA>.txt
        """
        try:
            company = Company.objects.first()
            patron_num = (company.rif or '').replace('-', '').ljust(20, '0')[:20]
        except Exception:
            patron_num = '0' * 20
        
        return f"N{patron_num}{str(month).zfill(2)}{year}.txt"
    
    @staticmethod
    def _build_line(employee: Employee, exchange_rate: Decimal) -> Optional[str]:
        """Construye una línea del archivo FAOV."""
        contract = employee.contracts.filter(is_active=True).first()
        if not contract:
            return None
        
        # Tipo de identificación (V/E)
        nationality = getattr(employee, 'nationality', 'V') or 'V'
        
        # Cédula (solo números)
        cedula = employee.national_id.replace('V-', '').replace('E-', '').strip()
        
        # Nombres (separar primer y segundo nombre)
        first_name = employee.first_name.upper().strip()
        second_name = (getattr(employee, 'second_name', '') or '').upper().strip()
        
        # Apellidos
        last_name = employee.last_name.upper().strip()
        second_last_name = (getattr(employee, 'second_last_name', '') or '').upper().strip()
        
        # Número de afiliación FAOV
        faov_code = employee.faov_code or ''
        
        # Fecha de ingreso (DDMMAAAA)
        hire_str = employee.hire_date.strftime('%d%m%Y') if employee.hire_date else ''
        
        # Fecha de egreso (vacío si está activo)
        termination_str = ''
        if employee.termination_date:
            termination_str = employee.termination_date.strftime('%d%m%Y')
        
        # Salario mensual en VES
        salary = contract.monthly_salary
        currency_code = getattr(contract.salary_currency, 'code', 'VES')
        if currency_code in ('USD', 'EUR'):
            salary_ves = (salary * exchange_rate).quantize(Decimal('0.01'))
        else:
            salary_ves = salary
        
        salary_str = f"{salary_ves:.2f}"
        
        fields = [
            nationality,
            cedula,
            first_name,
            second_name,
            last_name,
            second_last_name,
            faov_code,
            hire_str,
            termination_str,
            salary_str,
        ]
        
        return ','.join(fields)
