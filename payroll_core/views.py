from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from decimal import Decimal
from .models import (
    Employee, LaborContract, ExchangeRate, PayrollConcept, 
    EmployeeConcept, Branch, Currency, PayrollPeriod, Payslip,
    PayrollNovelty
)
from .serializers import (
    EmployeeSerializer, BranchSerializer, LaborContractSerializer,
    CurrencySerializer, PayrollConceptSerializer, EmployeeConceptSerializer,
    PayrollPeriodSerializer, PayslipSerializer, PayrollNoveltySerializer
)
from .engine import PayrollEngine

class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer

class PayrollConceptViewSet(viewsets.ModelViewSet):
    queryset = PayrollConcept.objects.all()
    serializer_class = PayrollConceptSerializer
    filterset_fields = ['kind', 'active']

class EmployeeConceptViewSet(viewsets.ModelViewSet):
    queryset = EmployeeConcept.objects.all()
    serializer_class = EmployeeConceptSerializer
    filterset_fields = ['employee', 'is_active']

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

class LaborContractViewSet(viewsets.ModelViewSet):
    queryset = LaborContract.objects.all()
    serializer_class = LaborContractSerializer
    filterset_fields = ['employee', 'is_active', 'branch']


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

    @action(detail=True, methods=['get', 'post'], url_path='simulate-payslip')
    def simulate_payslip(self, request, pk=None):
        """
        GET/POST /api/employees/{id}/simulate-payslip/
        Calcula la nómina proyectada para este empleado al día de hoy.
        Soporta variables de entrada como {"overtime_hours": 5}.
        """
        employee = self.get_object()
        
        # 1. Obtener variables de entrada (POST json o GET params)
        input_variables = {}
        if request.method == 'POST':
            input_variables = request.data
        else:
            # Convertir query params a dict de floats (o strings para Decimal)
            input_variables = {k: v for k, v in request.query_params.items()}

        # 2. Buscar Contrato Activo
        contract = LaborContract.objects.filter(employee=employee, is_active=True).first()
        if not contract:
            return Response(
                {"error": "El empleado no tiene contrato activo."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Buscar Tasa de Cambio (BCV) del día
        rate_obj = ExchangeRate.objects.filter(currency__code='USD').order_by('date_valid').last()
        if not rate_obj:
            return Response(
                {"error": "No hay tasa de cambio registrada para USD en el sistema."}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        rate_value = rate_obj.rate

        # 4. Inicializar Motor con Variables
        payment_date = timezone.now().date()
        engine = PayrollEngine(
            contract, 
            payment_date, 
            exchange_rate=rate_obj, 
            input_variables=input_variables
        )

        # 5. Obtener conceptos aplicables (Activos)
        concepts = PayrollConcept.objects.filter(active=True)
        
        lines = []
        total_income = Decimal('0.00')
        total_deductions = Decimal('0.00')

        # 6. Iterar y Calcular
        for concept in concepts:
            # Verificar override
            try:
                override = EmployeeConcept.objects.filter(
                    employee=employee, concept=concept, active=True
                ).first()
                override_val = override.override_value if override else None
            except Exception:
                 override_val = None

            # ¡Cálculo con fórmulas legales!
            amount_ves = engine.calculate_concept_amount(concept, override_value=override_val)
            
            if amount_ves > 0:
                lines.append({
                    "code": concept.code,
                    "name": concept.name,
                    "kind": concept.kind, 
                    "amount_ves": amount_ves,
                    "currency_origin": concept.currency.code,
                    "formula": concept.computation_method
                })

                if concept.kind == 'EARNING':
                    total_income += amount_ves
                elif concept.kind == 'DEDUCTION':
                    total_deductions += amount_ves

        # 7. Respuesta JSON
        return Response({
            "employee": f"{employee.first_name} {employee.last_name}",
            "position": contract.position,
            "contract_currency": contract.salary_currency.code,
            "exchange_rate_used": rate_value,
            "payment_date": payment_date,
            "input_variables": input_variables,
            "lines": lines,
            "totals": {
                "income_ves": total_income,
                "deductions_ves": total_deductions,
                "net_pay_ves": total_income - total_deductions,
                "net_pay_usd_ref": round((total_income - total_deductions) / rate_value, 2)
            }
        })


class PayrollPeriodViewSet(viewsets.ModelViewSet):
    queryset = PayrollPeriod.objects.all()
    serializer_class = PayrollPeriodSerializer

    @action(detail=True, methods=['post'], url_path='close-period')
    def close_period(self, request, pk=None):
        """
        POST /api/payroll-periods/{id}/close-period/
        Inicia el proceso de cálculo masivo y cierre inmutable.
        """
        try:
            from .services import PayrollProcessor
            manual_rate = request.data.get('manual_rate')
            result = PayrollProcessor.process_period(pk, user=request.user, manual_rate=manual_rate)
            return Response(result, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"Falla inesperada en cierre: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PayslipReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet solo lectura para consultar recibos históricos.
    """
    queryset = Payslip.objects.all()
    serializer_class = PayslipSerializer
    filterset_fields = ['period', 'employee', 'currency_code']


class PayrollNoveltyViewSet(viewsets.ModelViewSet):
    """
    Gestión de incidencias de nómina (Novedades).
    """
    queryset = PayrollNovelty.objects.all()
    serializer_class = PayrollNoveltySerializer
    filterset_fields = ['employee', 'period', 'concept_code']

    @action(detail=False, methods=['post'], url_path='batch')
    def batch(self, request):
        """
        POST /api/payroll-novelties/batch/
        Carga masiva de novedades.
        Recibe: [{"employee_id": 1, "period_id": 5, "concept_code": "H_EXTRA", "amount": 4}, ...]
        """
        data = request.data
        if not isinstance(data, list):
            return Response(
                {"error": "Se esperaba una lista de novedades (array)."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        processed_ids = []
        try:
            with transaction.atomic():
                for item in data:
                    # Usamos update_or_create para manejar ediciones rápidas en el grid
                    obj, created = PayrollNovelty.objects.update_or_create(
                        employee_id=item.get('employee_id'),
                        period_id=item.get('period_id'),
                        concept_code=item.get('concept_code'),
                        defaults={'amount': Decimal(str(item.get('amount', 0)))}
                    )
                    processed_ids.append(obj.id)
            
            return Response({
                "status": "success", 
                "processed_count": len(processed_ids)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Falla en procesamiento batch: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
