"""
Vistas para exportación de archivos planos gubernamentales y declaraciones.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from datetime import date


class IVSSExportView(APIView):
    """
    GET /api/payroll/exports/ivss/?type=INGRESO&year=2026&month=2
    
    Descarga archivo TXT para carga masiva en IVSS Tiuna.
    """
    
    def get(self, request):
        export_type = request.query_params.get('type', 'INGRESO')
        
        from payroll_core.services.reports.ivss_export import IVSSTiunaExport, IVSSExportType
        
        valid_types = {
            'INGRESO': IVSSExportType.INGRESO,
            'EGRESO': IVSSExportType.EGRESO,
            'CAMBIO_SALARIO': IVSSExportType.CAMBIO_SALARIO,
        }
        
        if export_type not in valid_types:
            return Response(
                {'error': f'Tipo inválido. Use: {list(valid_types.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        content = IVSSTiunaExport.generate(export_type=valid_types[export_type])
        
        filename = f"IVSS_{export_type}_{date.today().strftime('%Y%m%d')}.txt"
        
        response = HttpResponse(content, content_type='text/plain; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class FAOVExportView(APIView):
    """
    GET /api/payroll/exports/faov/?year=2026&month=2
    
    Descarga archivo TXT para declaración FAOV ante Banavih.
    """
    
    def get(self, request):
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        
        from payroll_core.services.reports.faov_export import FAOVExport
        
        content = FAOVExport.generate(year=year, month=month)
        filename = FAOVExport.get_filename(year=year, month=month)
        
        response = HttpResponse(content, content_type='text/plain; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ISLRXMLExportView(APIView):
    """
    GET /api/payroll/exports/islr-xml/?year=2026&month=2
    
    Descarga XML de retenciones ISLR para SENIAT.
    """
    
    def get(self, request):
        year = int(request.query_params.get('year', date.today().year))
        month = int(request.query_params.get('month', date.today().month))
        
        from payroll_core.services.reports.islr_xml_export import ISLRXMLExport
        
        content = ISLRXMLExport.generate(year=year, month=month)
        filename = ISLRXMLExport.get_filename(year=year, month=month)
        
        response = HttpResponse(content, content_type='application/xml; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class LPPSSCalculateView(APIView):
    """
    POST /api/payroll/declarations/lppss/calculate/
    Body: {"year": 2026, "month": 2}
    
    Calcula la declaración LPPSS del mes.
    """
    
    def post(self, request):
        year = request.data.get('year')
        month = request.data.get('month')
        
        if not year or not month:
            return Response(
                {'error': 'Se requieren year y month'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from payroll_core.services.lppss_calculator import LPPSSCalculator
        
        try:
            declaration = LPPSSCalculator.calculate_for_month(
                year=int(year),
                month=int(month),
                created_by=str(request.user) if request.user.is_authenticated else 'api',
            )
            
            return Response({
                'id': declaration.id,
                'year': declaration.year,
                'month': declaration.month,
                'total_employees': declaration.total_employees,
                'total_payroll_base_ves': str(declaration.total_payroll_base_ves),
                'contribution_amount_ves': str(declaration.contribution_amount_ves),
                'imii_usd_used': str(declaration.imii_usd_used),
                'exchange_rate_used': str(declaration.exchange_rate_used),
                'status': declaration.status,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class INCESCalculateView(APIView):
    """
    POST /api/payroll/declarations/inces/calculate/
    Body: {"year": 2026, "quarter": 1}
    
    Calcula la declaración INCES del trimestre.
    """
    
    def post(self, request):
        year = request.data.get('year')
        quarter = request.data.get('quarter')
        
        if not year or not quarter:
            return Response(
                {'error': 'Se requieren year y quarter (1-4)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from payroll_core.services.inces_calculator import INCESCalculator
        
        try:
            declaration = INCESCalculator.calculate_for_quarter(
                year=int(year),
                quarter=int(quarter),
            )
            
            return Response({
                'id': declaration.id,
                'year': declaration.year,
                'quarter': declaration.quarter,
                'total_payroll_ves': str(declaration.total_payroll_ves),
                'employer_rate': str(declaration.employer_rate),
                'employer_contribution_ves': str(declaration.employer_contribution_ves),
                'status': declaration.status,
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ConstanciaTrabajoView(APIView):
    """
    GET /api/payroll/reports/constancia-trabajo/<employee_id>/
    ?show_salary=true&signer_name=...&city=...
    
    Genera PDF de constancia de trabajo.
    """
    
    def get(self, request, employee_id):
        show_salary = request.query_params.get('show_salary', 'true').lower() == 'true'
        signer_name = request.query_params.get('signer_name', '')
        signer_title = request.query_params.get('signer_title', 'Representante Legal')
        city = request.query_params.get('city', 'Caracas')
        
        from payroll_core.services.reports.constancia_trabajo import ConstanciaTrabajoService
        
        try:
            pdf_bytes = ConstanciaTrabajoService.generate(
                employee_id=int(employee_id),
                show_salary=show_salary,
                signer_name=signer_name,
                signer_title=signer_title,
                city=city,
            )
            
            response = HttpResponse(pdf_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'inline; filename="constancia_trabajo_{employee_id}.pdf"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PayrollExcelReportView(APIView):
    """
    GET /api/payroll/reports/excel/<period_id>/
    
    Descarga reporte Excel de resumen de nómina.
    """
    
    def get(self, request, period_id):
        from payroll_core.services.reports.excel_report import PayrollExcelReport
        
        try:
            xlsx_bytes = PayrollExcelReport.generate_period_summary(period_id=int(period_id))
            
            response = HttpResponse(
                xlsx_bytes,
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="nomina_resumen_{period_id}.xlsx"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EndowmentSizesExportView(APIView):
    """
    GET /api/payroll/exports/endowment-sizes/
    ?branch=<branch_id> (Opcional)
    
    Descarga reporte Excel con las tallas del personal.
    """
    
    def get(self, request):
        import openpyxl
        from openpyxl.styles import Font
        from payroll_core.models import Employee
        
        branch_id = request.query_params.get('branch')
        
        employees = Employee.objects.filter(is_active=True).select_related('branch')
        if branch_id:
            employees = employees.filter(branch_id=branch_id)
            
        # 1. Configuración del archivo Excel
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="tallas_personal.xlsx"'

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Tallas de Personal"

        # 2. Encabezados
        headers = ['Nombres', 'Apellidos', 'Cédula de Identidad', 'Sede', 'Talla Camisa', 'Talla Pantalón', 'Talla Calzado', 'Última Dotación']
        ws.append(headers)

        # Estilo para encabezados (Negrita)
        for cell in ws[1]:
            cell.font = Font(bold=True)

        # 3. Iterar datos
        for emp in employees:
            row = [
                emp.first_name,
                emp.last_name,
                emp.national_id,
                emp.branch.name if emp.branch else 'N/D',
                emp.shirt_size or 'N/D',
                emp.pants_size or 'N/D',
                emp.shoe_size or 'N/D',
                emp.last_endowment_date.strftime('%Y-%m-%d') if emp.last_endowment_date else 'N/D'
            ]
            ws.append(row)

        # 4. Ajustar ancho de columnas automáticamente (Opcional pero útil)
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter # Get the column name
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = (max_length + 2)
            ws.column_dimensions[column].width = adjusted_width

        # 5. Guardar en la respuesta
        wb.save(response)
        return response
