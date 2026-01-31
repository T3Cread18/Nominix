from decimal import Decimal
from datetime import date
from django.template.loader import render_to_string
from django.http import HttpResponse
from django.utils import timezone
import weasyprint

from ..models import EmployeeVariation, PayrollConcept, Company
from ..engine import PayrollEngine

class VacationReceiptService:
    @staticmethod
    def calculate_variation_payout(variation_id: int):
        """
        Calcula el monto a pagar por una variación de vacaciones específica.
        """
        variation = EmployeeVariation.objects.select_related('employee', 'cause').get(id=variation_id)
        employee = variation.employee
        contract = employee.contracts.filter(is_active=True).first()
        
        if not contract:
            raise ValueError(f"El empleado {employee.full_name} no tiene un contrato activo.")

        # 1. Crear un objeto "Mock" que simule un PayrollPeriod
        class MockPeriod:
            def __init__(self, start, end):
                self.start_date = start
                self.end_date = end
                self.payment_date = end
                self.name = f"Vacaciones: {start} al {end}"
                self.id = 0

        period = MockPeriod(variation.start_date, variation.end_date)

        # 2. Inicializar el motor de nómina
        # Nota: Como pasamos el 'period', el motor ya detectará automáticamente 
        # el impacto de la variación en sus fechas.
        engine = PayrollEngine(
            contract=contract,
            period=period
        )

        # 3. Calcular nómina
        calculation = engine.calculate_payroll()
        
        # 4. Filtrar y preparar datos para el recibo de vacaciones
        # El template espera un objeto 'payslip' con ciertos campos
        vacation_lines = [l for l in calculation['lines'] if l.get('tipo_recibo') == 'vacaciones']
        
        total_income = sum(l['amount_ves'] for l in vacation_lines if l['kind'] == 'EARNING')
        total_deductions = sum(l['amount_ves'] for l in vacation_lines if l['kind'] == 'DEDUCTION')
        
        # Construir el objeto payslip mock
        payslip = {
            'employee': employee,
            'contract_snapshot': {
                'position': str(contract.job_position or contract.position)
            },
            'processed_rows': vacation_lines,
            'total_income_vacaciones': total_income,
            'total_deductions_vacaciones': total_deductions,
            'net_pay_vacaciones': total_income - total_deductions,
            'exchange_rate_applied': calculation['exchange_rate_used']
        }

        return {
            'payslip': payslip,
            'period_name': period.name,
            'start_date': period.start_date,
            'end_date': period.end_date,
            'payment_date': period.payment_date
        }

    @staticmethod
    def generate_pdf(variation_id: int, request=None):
        """
        Genera el PDF del recibo de vacaciones standalone.
        """
        try:
            data = VacationReceiptService.calculate_variation_payout(variation_id)
            
            # Obtener datos de empresa para el encabezado
            company = Company.objects.first()
            tenant_name = request.tenant.name if request and hasattr(request, 'tenant') else (company.name if company else "Nóminix")
            
            context = {
                'payslips': [data['payslip']], # El template espera una lista de payslips
                'period_name': data['period_name'],
                'start_date': data['start_date'],
                'end_date': data['end_date'],
                'payment_date': data['payment_date'],
                'tenant_name': tenant_name,
                'tenant_rif': request.tenant.rif if request and hasattr(request, 'tenant') else "",
                'tenant_address': request.tenant.address if request and hasattr(request, 'tenant') else "",
                'company_config': company,
                'tipo_recibo': 'vacaciones'
            }

            # Renderizar HTML
            html_string = render_to_string('payroll/recibo_vacaciones_standalone.html', context)
            
            # Generar PDF
            pdf_file = weasyprint.HTML(string=html_string).write_pdf()
            
            return pdf_file
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise e
