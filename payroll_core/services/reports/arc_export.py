"""
Servicio de generación del Comprobante de Retención de ISLR (Forma AR-C).

Genera el comprobante anual que el empleador entrega a cada empleado
como aval de las retenciones de ISLR practicadas durante el ejercicio fiscal.

Base legal: Decreto 1.808, Art. 23 — Reglamento Parcial de la LISLR
en materia de Retenciones.
"""
from decimal import Decimal
from datetime import date
from typing import Optional

from django.template.loader import render_to_string

from payroll_core.models import Employee, Company
from payroll_core.models.government_filings import ISLRRetention


MESES = {
    1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril',
    5: 'Mayo', 6: 'Junio', 7: 'Julio', 8: 'Agosto',
    9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre',
}

MESES_ES = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
    5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
    9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre',
}


def _build_arc_entry(employee: Employee, year: int, retentions: list, company: Company) -> dict:
    """
    Construye un diccionario con todos los datos necesarios para
    renderizar un ARC individual en el template.
    """
    ret_by_month = {r.month: r for r in retentions}

    months_data = []
    for m in range(1, 13):
        r = ret_by_month.get(m)
        months_data.append({
            'num': m,
            'name': MESES[m],
            'taxable_income': r.taxable_income_ves if r else Decimal('0.00'),
            'retention': r.retention_amount_ves if r else Decimal('0.00'),
            'rate': r.rate_applied if r else Decimal('0.00'),
            'ut_value': r.ut_value_used if r else Decimal('0.00'),
            'has_data': r is not None,
        })

    total_taxable = sum(m['taxable_income'] for m in months_data)
    total_retention = sum(m['retention'] for m in months_data)

    today = date.today()

    return {
        # Empresa (agente de retención)
        'company_name': company.name if company else '',
        'company_rif': company.rif if company else '',
        'company_address': (company.address or '') if company else '',
        'company_city': (company.city or '') if company else '',
        # Empleado
        'employee_name': employee.full_name,
        'employee_cedula': employee.national_id,
        'employee_rif': employee.rif or '',
        'employee_position': employee.position or '',
        'employee_department': str(employee.department) if employee.department else '',
        # Ejercicio fiscal
        'year': year,
        'months': months_data,
        'total_taxable_income': total_taxable,
        'total_retention': total_retention,
        # Fecha de emisión
        'generation_day': today.day,
        'generation_month': MESES_ES[today.month],
        'generation_year': today.year,
    }


class ARCExportService:
    """
    Genera el Comprobante de Retención ISLR (AR-C) en PDF.

    Modos:
    - Individual: un solo empleado, un año.
    - Lote: todos los empleados con retenciones en el año (un ARC por página).
    """

    @staticmethod
    def generate_for_employee(employee_id: int, year: int) -> bytes:
        """
        Genera el ARC individual para un empleado y año fiscal.

        Returns:
            Bytes del PDF generado.
        """
        from weasyprint import HTML

        employee = Employee.objects.select_related(
            'branch', 'department', 'job_position'
        ).get(pk=employee_id)

        retentions = list(
            ISLRRetention.objects.filter(employee=employee, year=year).order_by('month')
        )

        company = Company.objects.first()
        arc_entry = _build_arc_entry(employee, year, retentions, company)

        context = {'arcs': [arc_entry]}
        html = render_to_string('payroll/arc_comprobante.html', context)
        return HTML(string=html).write_pdf()

    @staticmethod
    def generate_batch(year: int) -> bytes:
        """
        Genera un PDF con el ARC de todos los empleados que tuvieron
        retenciones ISLR en el año indicado. Un ARC por página.

        Returns:
            Bytes del PDF.
        """
        from weasyprint import HTML

        employee_ids = list(
            ISLRRetention.objects
            .filter(year=year)
            .values_list('employee_id', flat=True)
            .distinct()
        )

        employees = list(
            Employee.objects.filter(id__in=employee_ids)
            .select_related('branch', 'department', 'job_position')
            .order_by('last_name', 'first_name')
        )

        # Cargar todas las retenciones del año en una sola query
        all_retentions = list(
            ISLRRetention.objects.filter(
                year=year,
                employee_id__in=employee_ids,
            ).order_by('employee_id', 'month')
        )

        # Agrupar por empleado para evitar N+1
        ret_by_employee: dict[int, list] = {}
        for r in all_retentions:
            ret_by_employee.setdefault(r.employee_id, []).append(r)

        company = Company.objects.first()

        arcs = []
        for emp in employees:
            emp_rets = ret_by_employee.get(emp.id, [])
            arcs.append(_build_arc_entry(emp, year, emp_rets, company))

        context = {'arcs': arcs}
        html = render_to_string('payroll/arc_comprobante.html', context)
        return HTML(string=html).write_pdf()

    @staticmethod
    def get_filename(year: int, employee_id: Optional[int] = None) -> str:
        """Nombre de archivo descriptivo para el PDF."""
        company = Company.objects.first()
        rif = (company.rif or '').replace('-', '') if company else 'SINRIF'
        if employee_id:
            return f"ARC_{rif}_{year}_emp{employee_id}.pdf"
        return f"ARC_{rif}_{year}_LOTE.pdf"
