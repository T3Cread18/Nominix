"""
Generador de Archivos TXT para IVSS — Sistema Tiuna.

Formatos soportados:
1. Carga Masiva de Ingresos
2. Carga Masiva de Egresos
3. Carga Masiva por Cambios de Salarios

Cada tipo genera un archivo TXT de longitud fija con campos separados por comas.

Estructura del registro:
    Nacionalidad(1) | Cédula(8) | PrimerNombre(25) | SegundoNombre(25) |
    PrimerApellido(25) | SegundoApellido(25) | FechaNacimiento(8) | Sexo(1) |
    SalarioSemanal(12) | FechaIngreso(8) [o FechaEgreso para egresos]
"""
import io
from decimal import Decimal
from datetime import date
from typing import List, Optional

from payroll_core.models import Employee
from payroll_core.services.currency import get_usd_exchange_rate


class IVSSExportType:
    INGRESO = 'INGRESO'
    EGRESO = 'EGRESO'
    CAMBIO_SALARIO = 'CAMBIO_SALARIO'


class IVSSTiunaExport:
    """
    Genera archivos TXT para carga masiva en el sistema Tiuna del IVSS.
    """
    
    @staticmethod
    def generate(
        export_type: str,
        employees: Optional[List[Employee]] = None,
        reference_date: Optional[date] = None,
    ) -> str:
        """
        Genera el contenido TXT para el tipo de carga indicado.
        
        Args:
            export_type: IVSSExportType.INGRESO | EGRESO | CAMBIO_SALARIO
            employees: Lista de empleados (si None, toma activos)
            reference_date: Fecha de referencia
        
        Returns:
            Contenido del archivo TXT como string
        """
        if employees is None:
            if export_type == IVSSExportType.EGRESO:
                employees = Employee.objects.filter(
                    is_active=False,
                    termination_date__isnull=False
                ).select_related()
            else:
                employees = Employee.objects.filter(
                    is_active=True
                ).select_related()
        
        exchange_rate = get_usd_exchange_rate()
        lines = []
        
        for emp in employees:
            line = IVSSTiunaExport._build_line(emp, export_type, exchange_rate)
            if line:
                lines.append(line)
        
        return '\n'.join(lines)
    
    @staticmethod
    def _build_line(employee: Employee, export_type: str, exchange_rate: Decimal) -> Optional[str]:
        """Construye una línea del archivo TXT."""
        contract = employee.contracts.filter(is_active=True).first()
        if not contract and export_type != IVSSExportType.EGRESO:
            return None
        
        # Nacionalidad (V/E) — extraer del national_id o del campo nationality
        nationality = getattr(employee, 'nationality', 'V') or 'V'
        
        # Cédula (solo números, sin V- o E-)
        cedula = employee.national_id.replace('V-', '').replace('E-', '').strip()
        
        # Nombres y apellidos
        first_name = employee.first_name.upper().strip()[:25]
        second_name = getattr(employee, 'second_name', '') or ''
        second_name = second_name.upper().strip()[:25]
        
        last_name = employee.last_name.upper().strip()[:25]
        second_last_name = getattr(employee, 'second_last_name', '') or ''
        second_last_name = second_last_name.upper().strip()[:25]
        
        # Fecha de nacimiento (DDMMAAAA)
        dob = ''
        if employee.date_of_birth:
            dob = employee.date_of_birth.strftime('%d%m%Y')
        
        # Sexo
        sex = employee.gender if employee.gender else 'M'
        
        # Salario semanal en VES (mensual / 4.33)
        salary_weekly_ves = Decimal('0')
        if contract:
            salary = contract.monthly_salary
            currency_code = getattr(contract.salary_currency, 'code', 'VES')
            if currency_code in ('USD', 'EUR'):
                salary_ves = salary * exchange_rate
            else:
                salary_ves = salary
            salary_weekly_ves = (salary_ves / Decimal('4.33')).quantize(Decimal('0.01'))
        
        # Formatear salario (12 dígitos, sin decimales, zero-padded)
        salary_str = str(int(salary_weekly_ves * 100)).zfill(12)
        
        # Fecha de ingreso/egreso (DDMMAAAA)
        if export_type == IVSSExportType.EGRESO:
            action_date = employee.termination_date
        else:
            action_date = employee.hire_date
        
        date_str = action_date.strftime('%d%m%Y') if action_date else ''
        
        # Construir línea separada por comas
        fields = [
            nationality,
            cedula.ljust(8),
            first_name.ljust(25),
            second_name.ljust(25),
            last_name.ljust(25),
            second_last_name.ljust(25),
            dob.ljust(8),
            sex,
            salary_str,
            date_str,
        ]
        
        return ','.join(fields)
