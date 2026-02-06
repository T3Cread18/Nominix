# -*- coding: utf-8 -*-
"""
Vistas API del módulo de Vacaciones.

Implementa:
- CRUD de solicitudes de vacaciones
- Carga masiva desde Excel (upload_bulk)
- Simulación de cálculo monetario (simulate)
- Consulta de saldo vacacional
"""
import logging
from decimal import Decimal
from datetime import datetime

logger = logging.getLogger(__name__)

from django.db import transaction
from django.utils import timezone

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from django_filters.rest_framework import DjangoFilterBackend

# NOTA: pandas se importa de forma lazy dentro de upload_bulk para evitar
# errores si no está instalado (el módulo carga sin problemas)

from payroll_core.models import Employee, LaborContract

from .models import VacationRequest, VacationBalance, Holiday
from .serializers import (
    VacationRequestSerializer,
    VacationBalanceSerializer,
    VacationSummarySerializer,
    HolidaySerializer,
)
from .services import VacationEngine
from .services.vacation_novelties import generate_vacation_novelties


class VacationRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de Solicitudes de Vacaciones.
    
    Endpoints:
    - GET    /api/vacations/                  - Listar solicitudes
    - POST   /api/vacations/                  - Crear solicitud
    - GET    /api/vacations/{id}/             - Detalle solicitud
    - PUT    /api/vacations/{id}/             - Actualizar solicitud
    - PATCH  /api/vacations/{id}/             - Actualizar parcialmente
    - DELETE /api/vacations/{id}/             - Eliminar solicitud (solo DRAFT)
    - POST   /api/vacations/upload-bulk/      - Carga masiva desde Excel
    - GET    /api/vacations/{id}/simulate/    - Simular cálculo monetario
    - POST   /api/vacations/{id}/approve/     - Aprobar solicitud
    - GET    /api/vacations/summary/?employee_id=X - Resumen vacacional
    """
    
    queryset = VacationRequest.objects.select_related(
        'employee', 'contract'
    ).all()
    serializer_class = VacationRequestSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee', 'status', 'vacation_type']
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    
    def perform_destroy(self, instance):
        """
        Solo permite eliminar solicitudes en estado DRAFT.
        """
        if instance.status != VacationRequest.Status.DRAFT:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(
                "Solo se pueden eliminar solicitudes en estado Borrador."
            )
        instance.delete()
    
    # =========================================================================
    # CARGA MASIVA DESDE EXCEL
    # =========================================================================
    
    @action(detail=False, methods=['post'], url_path='upload-bulk')
    def upload_bulk(self, request):
        """
        POST /api/vacations/upload-bulk/
        
        Acepta un archivo Excel con las siguientes columnas:
        - ID: Cédula del empleado (ej: V-12345678)
        - Date: Fecha de inicio (YYYY-MM-DD o DD/MM/YYYY)
        - Days: Días solicitados
        
        El archivo debe enviarse en el campo 'file' del form-data.
        
        Retorna:
        - processed: Cantidad de registros procesados exitosamente
        - errors: Lista de errores por fila
        - created_ids: IDs de las solicitudes creadas
        """
        # 1. Validar que se envió un archivo
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Se requiere un archivo Excel en el campo "file"'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        
        # 2. Validar extensión del archivo
        if not file.name.endswith(('.xlsx', '.xls')):
            return Response(
                {'error': 'El archivo debe ser un Excel (.xlsx o .xls)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 3. Leer archivo con pandas (import lazy para evitar fallo si no está instalado)
        try:
            import pandas as pd
        except ImportError:
            return Response(
                {'error': 'pandas no está instalado. Ejecute: pip install pandas'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            df = pd.read_excel(file)
        except Exception as e:
            return Response(
                {'error': f'Error al leer el archivo Excel: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 4. Validar columnas requeridas
        required_columns = ['ID', 'Date', 'Days']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            return Response(
                {
                    'error': f'Columnas faltantes: {", ".join(missing_columns)}',
                    'expected_columns': required_columns,
                    'found_columns': list(df.columns)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 5. Procesar filas
        processed = 0
        errors = []
        created_ids = []
        
        with transaction.atomic():
            for idx, row in df.iterrows():
                row_num = idx + 2  # +2 porque pandas es 0-indexed y Excel tiene header
                
                try:
                    # 5.1 Buscar empleado por cédula
                    national_id = str(row['ID']).strip()
                    try:
                        employee = Employee.objects.get(national_id=national_id)
                    except Employee.DoesNotExist:
                        errors.append({
                            'row': row_num,
                            'id': national_id,
                            'error': f'Empleado con cédula "{national_id}" no encontrado'
                        })
                        continue
                    
                    # 5.2 Parsear fecha
                    date_value = row['Date']
                    if isinstance(date_value, str):
                        # Intentar varios formatos
                        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                            try:
                                start_date = datetime.strptime(date_value.strip(), fmt).date()
                                break
                            except ValueError:
                                continue
                        else:
                            errors.append({
                                'row': row_num,
                                'id': national_id,
                                'error': f'Formato de fecha inválido: "{date_value}"'
                            })
                            continue
                    elif hasattr(date_value, 'date'):
                        # Es un datetime de pandas
                        start_date = date_value.date()
                    else:
                        start_date = date_value
                    
                    # 5.3 Parsear días
                    try:
                        days = int(row['Days'])
                        if days <= 0:
                            raise ValueError("Debe ser mayor a 0")
                    except (ValueError, TypeError) as e:
                        errors.append({
                            'row': row_num,
                            'id': national_id,
                            'error': f'Días inválidos: "{row["Days"]}" - {str(e)}'
                        })
                        continue
                    
                    # 5.4 Calcular fecha de fin
                    from datetime import timedelta
                    end_date = start_date + timedelta(days=days - 1)
                    
                    # 5.5 Crear solicitud
                    vacation_request = VacationRequest.objects.create(
                        employee=employee,
                        start_date=start_date,
                        end_date=end_date,
                        days_requested=days,
                        status=VacationRequest.Status.DRAFT,
                        vacation_type=VacationRequest.VacationType.INDIVIDUAL,
                        notes=f'Carga masiva - Fila {row_num}'
                    )
                    
                    created_ids.append(vacation_request.id)
                    processed += 1
                    
                except Exception as e:
                    errors.append({
                        'row': row_num,
                        'id': str(row.get('ID', 'N/A')),
                        'error': f'Error inesperado: {str(e)}'
                    })
        
        return Response({
            'processed': processed,
            'errors': errors,
            'created_ids': created_ids,
            'message': f'Se procesaron {processed} solicitudes correctamente.'
        }, status=status.HTTP_201_CREATED if processed > 0 else status.HTTP_400_BAD_REQUEST)
    
    # =========================================================================
    # SIMULACIÓN DE CÁLCULO MONETARIO
    # =========================================================================
    
    @action(detail=True, methods=['get'], url_path='simulate')
    def simulate(self, request, pk=None):
        """
        GET /api/vacations/{id}/simulate/
        
        Calcula los montos de vacaciones y bono vacacional SIN persistir.
        Útil para previsualizar antes de aprobar.
        
        Query Params (opcionales):
        - days: Días a simular (default: días de la solicitud)
        
        Retorna:
        - monthly_salary: Salario mensual
        - daily_salary: Salario diario
        - vacation_days: Días de vacaciones
        - salary_amount: Monto salario vacaciones
        - bonus_days: Días de bono vacacional
        - bonus_amount: Monto de bono
        - total: Total a pagar
        - calculation_trace: Detalle del cálculo
        """
        vacation_request = self.get_object()
        
        # Obtener contrato para el cálculo
        contract = vacation_request.contract
        if not contract:
            contract = vacation_request.employee.contracts.filter(
                is_active=True
            ).first()
        
        if not contract:
            return Response(
                {'error': 'El empleado no tiene un contrato activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener días a simular
        days_param = request.query_params.get('days')
        if days_param:
            try:
                days_to_enjoy = int(days_param)
            except ValueError:
                return Response(
                    {'error': 'Parámetro "days" debe ser un número entero'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            days_to_enjoy = vacation_request.days_requested
        
        # Calcular montos
        try:
            result = VacationEngine.calculate_monetary_values(
                contract=contract,
                days_to_enjoy=days_to_enjoy
            )
            
            # Convertir Decimals a float para JSON
            response_data = {
                k: float(v) if isinstance(v, Decimal) else v
                for k, v in result.items()
            }
            
            # Agregar info de la solicitud
            response_data['request_id'] = vacation_request.id
            response_data['employee_name'] = vacation_request.employee.full_name
            response_data['start_date'] = str(vacation_request.start_date)
            response_data['end_date'] = str(vacation_request.end_date)
            
            return Response(response_data)
            
        except Exception as e:
            return Response(
                {'error': f'Error calculando vacaciones: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # =========================================================================
    # APROBAR SOLICITUD
    # =========================================================================
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        POST /api/vacations/{id}/approve/
        
        Aprueba una solicitud de vacaciones.
        Esto dispara el signal que crea el registro USAGE en VacationBalance.
        
        Solo funciona para solicitudes en estado DRAFT.
        """
        vacation_request = self.get_object()
        
        if vacation_request.status != VacationRequest.Status.DRAFT:
            return Response(
                {'error': f'Solo se pueden aprobar solicitudes en estado Borrador. Estado actual: {vacation_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener usuario que aprueba
        approver = getattr(request.user, 'username', 'API')
        
        # Cambiar estado
        vacation_request.status = VacationRequest.Status.APPROVED
        vacation_request.approved_by = approver
        vacation_request.approved_at = timezone.now()
        vacation_request.save()  # Esto dispara el signal
        
        return Response({
            'message': 'Solicitud aprobada exitosamente',
            'request': VacationRequestSerializer(vacation_request).data
        })
    
    # =========================================================================
    # RECHAZAR SOLICITUD
    # =========================================================================
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """
        POST /api/vacations/{id}/reject/
        
        Rechaza una solicitud de vacaciones.
        Solo funciona para solicitudes en estado DRAFT.
        
        Body (opcional):
        {
            "reason": "Motivo del rechazo"
        }
        """
        vacation_request = self.get_object()
        
        if vacation_request.status != VacationRequest.Status.DRAFT:
            return Response(
                {'error': f'Solo se pueden rechazar solicitudes en estado Borrador. Estado actual: {vacation_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('reason', '')
        approver = getattr(request.user, 'username', 'API')
        
        vacation_request.status = VacationRequest.Status.REJECTED
        vacation_request.approved_by = approver
        vacation_request.approved_at = timezone.now()
        vacation_request.notes = f"RECHAZADO: {reason}" if reason else vacation_request.notes
        vacation_request.save()
        
        return Response({
            'message': 'Solicitud rechazada',
            'request': VacationRequestSerializer(vacation_request).data
        })
    
    # =========================================================================
    # RESUMEN VACACIONAL DEL EMPLEADO
    # =========================================================================
    
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        GET /api/vacations/summary/?employee_id=X
        
        Obtiene el resumen vacacional de un empleado:
        - Días correspondientes por antigüedad
        - Saldo actual
        - Días usados
        """
        employee_id = request.query_params.get('employee_id')
        
        if not employee_id:
            return Response(
                {'error': 'Se requiere el parámetro employee_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            employee = Employee.objects.get(pk=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {'error': f'Empleado con ID {employee_id} no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        summary = VacationEngine.get_employee_vacation_summary(employee)
        
        return Response(summary)
    
    # =========================================================================
    # ACUMULACIÓN MANUAL DE DÍAS
    # =========================================================================
    
    @action(detail=False, methods=['post'], url_path='accrue')
    def accrue(self, request):
        """
        POST /api/vacations/accrue/
        
        Registra manualmente la acumulación de días de vacaciones para un empleado.
        
        Body:
        {
            "employee_id": 123,
            "year": 5  // opcional, default: años de antigüedad actual
        }
        
        Según LOTTT Art. 190:
        - Año 1: 15 días
        - Año 2+: 15 + (años - 1), máximo 30 días
        
        Retorna:
        - El movimiento de acumulación creado
        - Error si ya existe acumulación para ese año
        """
        employee_id = request.data.get('employee_id')
        year = request.data.get('year')
        
        if not employee_id:
            return Response(
                {'error': 'Se requiere employee_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            employee = Employee.objects.get(pk=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {'error': f'Empleado con ID {employee_id} no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar contrato activo
        if not employee.contracts.filter(is_active=True).exists():
            return Response(
                {'error': 'El empleado no tiene contrato activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener usuario que ejecuta
        created_by = getattr(request.user, 'username', 'API')
        
        try:
            # Crear acumulación
            accrual = VacationBalance.accrue_days(
                employee=employee,
                year=year,
                created_by=created_by
            )
            
            # Serializar respuesta
            from .serializers import VacationBalanceSerializer
            serializer = VacationBalanceSerializer(accrual)
            
            return Response({
                'message': f'Acumulación registrada: +{accrual.days} días para año {accrual.period_year}',
                'accrual': serializer.data,
                'new_balance': VacationBalance.get_balance(employee)
            }, status=status.HTTP_201_CREATED)
            
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Error registrando acumulación: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # =========================================================================
    # ACUMULACIÓN HISTÓRICA (TODOS LOS AÑOS PENDIENTES)
    # =========================================================================
    
    @action(detail=False, methods=['post'], url_path='accrue-historical')
    def accrue_historical(self, request):
        """
        POST /api/vacations/accrue-historical/
        
        Registra TODOS los años pendientes de vacaciones para un empleado.
        Útil para migración inicial de empleados sin historial en el kardex.
        
        LOTTT Art. 190:
        - Año 1: 15 días
        - Año 2+: 15 + (año - 1), máximo 30 días por año
        
        Ejemplo para empleado con 8 años de servicio:
        Año 1: 15, Año 2: 16, ..., Año 8: 22 = TOTAL: 148 días
        
        Body:
        {
            "employee_id": 123
        }
        
        Returns:
        {
            "message": "Acumulación histórica completada: +148 días",
            "years_of_service": 8,
            "years_processed": 8,
            "total_days_added": 148,
            "new_balance": 148
        }
        """
        employee_id = request.data.get('employee_id')
        
        if not employee_id:
            return Response(
                {'error': 'Se requiere employee_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            employee = Employee.objects.get(pk=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {'error': f'Empleado con ID {employee_id} no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar contrato activo
        if not employee.contracts.filter(is_active=True).exists():
            return Response(
                {'error': 'El empleado no tiene contrato activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener usuario que ejecuta
        created_by = getattr(request.user, 'username', 'API')
        
        try:
            result = VacationBalance.accrue_historical(
                employee=employee,
                created_by=created_by
            )
            
            if result['years_processed'] == 0:
                return Response({
                    'message': 'No hay años pendientes por acumular',
                    'years_of_service': result['years_of_service'],
                    'years_processed': 0,
                    'total_days_added': 0,
                    'current_balance': result['new_balance']
                }, status=status.HTTP_200_OK)
            
            return Response({
                'message': f"Acumulación histórica completada: +{result['total_days_added']} días",
                'years_of_service': result['years_of_service'],
                'years_processed': result['years_processed'],
                'total_days_added': result['total_days_added'],
                'new_balance': result['new_balance']
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Error en acumulación histórica: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # =========================================================================
    # SIMULACIÓN COMPLETA DE PAGO (con días descanso/feriados/deducciones)
    # =========================================================================
    
    @action(detail=True, methods=['get'], url_path='simulate-complete')
    def simulate_complete(self, request, pk=None):
        """
        GET /api/vacations/{id}/simulate-complete/?exchange_rate=X
        
        Calcula el pago completo SIN persistir.
        Incluye días de descanso, feriados y deducciones.
        Retorna montos en USD y VES (si hay tasa de cambio).
        
        Query Params:
            exchange_rate: Tasa de cambio USD->VES (opcional)
        
        Returns:
            Desglose completo dual moneda para vista previa.
        """
        from payroll_core.models import Company
        
        vacation_request = self.get_object()
        
        # Obtener contrato activo
        employee = vacation_request.employee
        contract = employee.contracts.filter(is_active=True).first()
        
        if not contract:
            return Response(
                {'error': 'El empleado no tiene contrato activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Obtener configuración de empresa
            company = Company.objects.first()
            
            # Obtener tasa de cambio con fecha de pago (opcional)
            payment_date_str = request.query_params.get('payment_date')
            target_date = None
            if payment_date_str:
                try:
                    target_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
                except ValueError:
                    pass

            exchange_rate = request.query_params.get('exchange_rate')
            if exchange_rate:
                exchange_rate = Decimal(str(exchange_rate))
            else:
                # Usar utilidad centralizada para obtener tasa USD->VES
                from payroll_core.services import get_usd_exchange_rate
                exchange_rate = get_usd_exchange_rate(target_date=target_date)
            
            calculation = VacationEngine.calculate_complete_payment(
                contract=contract,
                start_date=vacation_request.start_date,
                days_to_enjoy=vacation_request.days_requested,
                company=company,
                exchange_rate=exchange_rate
            )
            
            # Convertir Decimal a float para JSON
            response_data = {}
            for key, value in calculation.items():
                if isinstance(value, Decimal):
                    response_data[key] = float(value)
                elif hasattr(value, 'isoformat'):  # date objects
                    response_data[key] = value.isoformat()
                else:
                    response_data[key] = value
            
            response_data['request_id'] = vacation_request.id
            response_data['employee_name'] = employee.full_name
            
            # Agregar labels legibles para la configuración
            if company:
                response_data['vacation_salary_basis_display'] = company.get_vacation_salary_basis_display()
                response_data['vacation_receipt_currency'] = company.vacation_receipt_currency
            
            return Response(response_data)
            
        except Exception as e:
            return Response(
                {'error': f'Error en simulación: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # =========================================================================
    # PROCESAR PAGO
    # =========================================================================
    
    @action(detail=True, methods=['post'], url_path='process-payment')
    def process_payment(self, request, pk=None):
        """
        POST /api/vacations/{id}/process-payment/
        
        Procesa el pago de vacaciones:
        1. Solo para solicitudes APPROVED
        2. Crea registro VacationPayment (inmutable)
        3. Cambia estado a PROCESSED
        
        Returns:
            Resumen del pago procesado.
        """
        from .models import VacationPayment
        from .serializers import VacationPaymentSerializer
        
        # Parse Payment Date from request body or query
        payment_date_str = request.data.get('payment_date') or request.query_params.get('payment_date')
        payment_date = timezone.now().date()
        if payment_date_str:
            try:
                payment_date = datetime.strptime(payment_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass
        
        vacation_request = self.get_object()
        
        # Validar estado
        if vacation_request.status != VacationRequest.Status.APPROVED:
            return Response(
                {'error': f'Solo se pueden procesar pagos de solicitudes APROBADAS. Estado actual: {vacation_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar si ya tiene pago
        if hasattr(vacation_request, 'payment'):
            return Response(
                {'error': 'Esta solicitud ya tiene un pago procesado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        employee = vacation_request.employee
        contract = employee.contracts.filter(is_active=True).first()
        
        if not contract:
            return Response(
                {'error': 'El empleado no tiene contrato activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                # Obtener configuración de empresa
                from payroll_core.models import Company
                company = Company.objects.first()
                
                # Prepare exchange rate for this specific date
                from payroll_core.services import get_usd_exchange_rate
                exchange_rate = request.data.get('exchange_rate')
                if exchange_rate:
                    exchange_rate = Decimal(str(exchange_rate))
                else:
                    exchange_rate = get_usd_exchange_rate(target_date=payment_date)

                calculation = VacationEngine.calculate_complete_payment(
                    contract=contract,
                    start_date=vacation_request.start_date,
                    days_to_enjoy=vacation_request.days_requested,
                    company=company,
                    exchange_rate=exchange_rate
                )
                
                # Obtener usuario
                created_by = getattr(request.user, 'username', 'API')
                
                # Crear registro de pago
                payment = VacationPayment.create_from_calculation(
                    vacation_request=vacation_request,
                    calculation=calculation,
                    created_by=created_by,
                    payment_date=payment_date
                )    
                # Cambiar estado a PROCESSED
                vacation_request.status = VacationRequest.Status.PROCESSED
                vacation_request.save()
                
                # Generar novedades de Opción B (Anticipo de Vacaciones - Deducción Futura)
                try:
                    generate_vacation_novelties(
                        contract=contract,
                        start_date=vacation_request.start_date,
                        end_date=vacation_request.end_date,
                        return_date=vacation_request.return_date
                    )
                except Exception as e:
                    logger.exception("Error generando novedades de vacaciones: %s", e)

                serializer = VacationPaymentSerializer(payment)
                
                return Response({
                    'message': 'Pago procesado exitosamente',
                    'payment': serializer.data
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response(
                {'error': f'Error procesando pago: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # =========================================================================
    # EXPORTAR PDF
    # =========================================================================
    
    @action(detail=True, methods=['get'], url_path='export-pdf')
    def export_pdf(self, request, pk=None):
        """
        GET /api/vacations/{id}/export-pdf/
        
        Genera y descarga el recibo de vacaciones en PDF.
        Solo para solicitudes APPROVED o PROCESSED.
        
        Returns:
            Archivo PDF como descarga.
        """
        from django.template.loader import render_to_string
        from django.http import HttpResponse
        from weasyprint import HTML
        
        vacation_request = self.get_object()
        
        # Validar estado
        if vacation_request.status not in [VacationRequest.Status.APPROVED, VacationRequest.Status.PROCESSED]:
            return Response(
                {'error': f'Solo se pueden generar PDFs de solicitudes APROBADAS o PROCESADAS. Estado actual: {vacation_request.get_status_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        employee = vacation_request.employee
        contract = employee.contracts.filter(is_active=True).first()
        
        if not contract:
            return Response(
                {'error': 'El empleado no tiene contrato activo'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Obtener configuración de empresa
            from payroll_core.models import Company
            company = Company.objects.first()
            
            # Obtener tasa de cambio usando utilidad centralizada
            from payroll_core.services import get_usd_exchange_rate
            exchange_rate = get_usd_exchange_rate()
            
            # Calcular valores (o usar del pago si existe)
            calculation = VacationEngine.calculate_complete_payment(
                contract=contract,
                start_date=vacation_request.start_date,
                days_to_enjoy=vacation_request.days_requested,
                company=company,
                exchange_rate=exchange_rate
            )
            
            # Determinar moneda del recibo según configuración
            receipt_currency = company.vacation_receipt_currency if company else 'USD'
            
            # Preparar contexto para el template
            context = {
                'employee': employee,
                'contract': contract,
                'years_of_service': calculation['years_of_service'],
                'monthly_salary': calculation['monthly_salary'],
                'daily_salary': calculation['daily_salary'],
                # Fechas
                'start_date': calculation['start_date'],
                'end_date': calculation['end_date'],
                'return_date': calculation['return_date'],
                'payment_date': timezone.now().date(),
                # Días
                'vacation_days': calculation['vacation_days'],
                'rest_days': calculation['rest_days'],
                'holiday_days': calculation['holiday_days'],
                'bonus_days': calculation['bonus_days'],
                # Montos USD
                'vacation_amount': calculation['vacation_amount'],
                'rest_amount': calculation['rest_amount'],
                'holiday_amount': calculation['holiday_amount'],
                'bonus_amount': calculation['bonus_amount'],
                'gross_total': calculation['gross_total'],
                # Deducciones
                'ivss_amount': calculation['ivss_amount'],
                'faov_amount': calculation['faov_amount'],
                'rpe_amount': calculation['rpe_amount'],
                'total_deductions': calculation['total_deductions'],
                # Neto
                'net_total': calculation['net_total'],
                # Montos VES (si hay tasa)
                'exchange_rate': calculation.get('exchange_rate'),
                'daily_salary_ves': calculation.get('daily_salary_ves'),
                'gross_total_ves': calculation.get('gross_total_ves'),
                'total_deductions_ves': calculation.get('total_deductions_ves'),
                'net_total_ves': calculation.get('net_total_ves'),
                
                # Desglose VES
                'vacation_amount_ves': calculation.get('vacation_amount_ves'),
                'rest_amount_ves': calculation.get('rest_amount_ves'),
                'holiday_amount_ves': calculation.get('holiday_amount_ves'),
                'bonus_amount_ves': calculation.get('bonus_amount_ves'),
                'ivss_amount_ves': calculation.get('ivss_amount_ves'),
                'faov_amount_ves': calculation.get('faov_amount_ves'),
                'rpe_amount_ves': calculation.get('rpe_amount_ves'),
                # Configuración moneda
                'receipt_currency': receipt_currency,
                # Meta
                'generation_date': timezone.now(),
                'company_name': company.name if company else 'Nóminix',
                'company_rif': company.rif if company else '',
                'company': company,
            }
            
            # Renderizar HTML
            html_content = render_to_string('vacations/recibo_vacaciones.html', context)
            
            # Generar PDF
            pdf = HTML(string=html_content).write_pdf()
            
            # Crear respuesta
            response = HttpResponse(pdf, content_type='application/pdf')
            filename = f"recibo_vacaciones_{employee.national_id}_{vacation_request.start_date.strftime('%Y%m%d')}.pdf"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            return response
            
        except Exception as e:
            logger.exception("Error generando PDF de vacaciones: %s", e)
            return Response(
                {'error': f'Error generando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VacationBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet de solo lectura para el kardex de vacaciones.
    
    Endpoints:
    - GET /api/vacation-balance/                    - Listar movimientos
    - GET /api/vacation-balance/{id}/               - Detalle movimiento
    - GET /api/vacation-balance/by-employee/?id=X   - Movimientos por empleado
    """
    
    queryset = VacationBalance.objects.select_related(
        'employee', 'related_request'
    ).all()
    serializer_class = VacationBalanceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employee', 'transaction_type', 'period_year']
    
    @action(detail=False, methods=['get'], url_path='by-employee')
    def by_employee(self, request):
        """
        GET /api/vacation-balance/by-employee/?id=X
        
        Obtiene todos los movimientos de vacaciones de un empleado específico.
        """
        employee_id = request.query_params.get('id')
        
        if not employee_id:
            return Response(
                {'error': 'Se requiere el parámetro id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        entries = self.queryset.filter(employee_id=employee_id)
        serializer = self.get_serializer(entries, many=True)
        
        # Calcular saldo actual
        balance = VacationBalance.get_balance(
            Employee.objects.get(pk=employee_id)
        )
        
        return Response({
            'entries': serializer.data,
            'current_balance': balance
        })


class HolidayViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión de Feriados.
    
    Endpoints:
    - GET    /api/holidays/           - Listar feriados
    - POST   /api/holidays/           - Crear feriado
    - GET    /api/holidays/{id}/      - Detalle feriado
    - PUT    /api/holidays/{id}/      - Actualizar feriado
    - DELETE /api/holidays/{id}/      - Eliminar feriado
    
    Query Params:
    - year: Filtrar por año (ej: ?year=2026)
    - is_national: Filtrar por tipo (true/false)
    - is_recurring: Filtrar por recurrencia (true/false)
    """
    
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_national', 'is_recurring']
    
    def get_queryset(self):
        """
        Permite filtrar feriados por año usando ?year=YYYY.
        """
        queryset = super().get_queryset()
        
        # Filtro por año
        year = self.request.query_params.get('year')
        if year:
            try:
                year_int = int(year)
                queryset = queryset.filter(date__year=year_int)
            except ValueError:
                pass  # Ignorar si el año no es válido
        
        return queryset
