"""
Servicio de generación de Constancia de Trabajo (PDF).

Genera un PDF profesional con:
- Datos de la empresa
- Datos del empleado
- Cargo, antigüedad, salario (opcional)
- Firma del representante
"""
from decimal import Decimal
from datetime import date
from typing import Optional

from django.template.loader import render_to_string


# Nombres de meses en español
MESES_ES = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
    5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
    9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
}


class ConstanciaTrabajoService:
    """
    Genera constancia de trabajo en PDF.
    """
    
    @staticmethod
    def generate(
        employee_id: int,
        show_salary: bool = True,
        signer_name: str = '',
        signer_title: str = 'Representante Legal',
        city: str = 'Caracas',
    ) -> bytes:
        """
        Genera el PDF de constancia de trabajo.
        
        Args:
            employee_id: ID del empleado
            show_salary: Si True, incluye el salario en la constancia
            signer_name: Nombre de quien firma
            signer_title: Cargo de quien firma
            city: Ciudad donde se emite
        
        Returns:
            Bytes del PDF
        """
        from payroll_core.models import Employee, Company
        
        employee = Employee.objects.select_related(
            'department', 'branch'
        ).get(pk=employee_id)
        
        contract = employee.contracts.filter(is_active=True).select_related(
            'salary_currency'
        ).first()
        
        company = Company.objects.first()
        
        today = date.today()
        
        context = {
            'company_name': company.name if company else '',
            'company_rif': company.rif if company else '',
            'company_address': '',
            'employee_name': employee.full_name,
            'employee_cedula': employee.national_id,
            'hire_date': f"{employee.hire_date.day} de {MESES_ES.get(employee.hire_date.month, '')} de {employee.hire_date.year}" if employee.hire_date else '',
            'position': employee.position or (contract.position if contract else ''),
            'department': str(employee.department) if employee.department else '',
            'branch': str(employee.branch) if employee.branch else '',
            'show_salary': show_salary,
            'monthly_salary': str(contract.monthly_salary) if contract else '0.00',
            'salary_currency': contract.salary_currency.code if contract and contract.salary_currency else 'VES',
            'monthly_salary_words': '',  # TODO: número a palabras
            'signer_name': signer_name or (company.name if company else ''),
            'signer_title': signer_title,
            'city': city,
            'day': today.day,
            'month_name': MESES_ES.get(today.month, ''),
            'year': today.year,
        }
        
        html = render_to_string('payroll/constancia_trabajo.html', context)
        
        # Generar PDF con WeasyPrint
        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
        
        return pdf_bytes
