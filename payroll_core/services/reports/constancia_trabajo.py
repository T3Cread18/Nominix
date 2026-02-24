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


def monto_a_letras(monto: Decimal) -> str:
    """
    Convierte un monto decimal a su representación en letras (Español).
    Implementación básica para montos de sueldo.
    """
    unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
    decenas = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
    especiales = {
        11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
        16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
        21: 'veintiuno', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro', 25: 'veinticinco',
        26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve'
    }
    centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

    def convertir_grupo(n):
        if n == 0: return ''
        if n == 100: return 'cien'
        res = []
        c = n // 100
        d = (n % 100) // 10
        u = n % 10
        
        if c > 0: res.append(centenas[c])
        
        if n % 100 in especiales:
            res.append(especiales[n % 100])
        else:
            if d > 0:
                if d == 1: res.append('diez') # Solo para 10 estrictamente
                elif d == 2: res.append('veinte')
                else: res.append(decenas[d])
            if d > 2 and u > 0:
                res.append('y')
            if u > 0:
                res.append(unidades[u])
        return ' '.join([r for r in res if r])

    entero = int(monto)
    decimales = int(round((monto - entero) * 100))
    
    if entero == 0:
        letras = 'cero'
    else:
        partes = []
        # Millones
        millones = entero // 1000000
        if millones > 0:
            if millones == 1: partes.append('un millón')
            else: partes.append(f"{convertir_grupo(millones)} millones")
        
        # Miles
        miles = (entero % 1000000) // 1000
        if miles > 0:
            if miles == 1: partes.append('mil')
            else: partes.append(f"{convertir_grupo(miles)} mil")
            
        # Unidades
        resto = entero % 1000
        if resto > 0:
            partes.append(convertir_grupo(resto))
            
        letras = ' '.join(partes)

    return f"{letras.strip().upper()} CON {decimales:02d}/100"


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
        branch = employee.branch
        
        today = date.today()
        
        # El sueldo a mostrar es el Sueldo Base en BS solicitado por el usuario
        salary_val = contract.base_salary_bs if contract else Decimal('0.00')
        salary_words = monto_a_letras(salary_val)
        
        context = {
            'company_name': company.name if company else '',
            'company_rif': company.rif if company else '',
            'branch_name': branch.name if branch else (company.name if company else ''),
            'branch_rif': branch.rif if branch and branch.rif else (company.rif if company else ''),
            'branch_address': branch.address if branch else (company.address if company else ''),
            'employee_name': employee.full_name,
            'employee_cedula': employee.national_id,
            'hire_date': f"{employee.hire_date.day} de {MESES_ES.get(employee.hire_date.month, '')} de {employee.hire_date.year}" if employee.hire_date else '',
            'position': employee.position or (contract.position if contract else ''),
            'department': str(employee.department) if employee.department else '',
            'branch': str(employee.branch) if employee.branch else '',
            'show_salary': show_salary,
            'monthly_salary': f"{salary_val:,.2f}",
            'salary_currency': 'VES',
            'monthly_salary_words': salary_words,
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
