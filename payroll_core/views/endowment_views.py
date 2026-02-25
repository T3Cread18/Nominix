from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from ..models import EndowmentEvent, Employee, Branch
from ..serializers import EndowmentEventSerializer
from rest_framework.permissions import DjangoModelPermissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

class EndowmentEventViewSet(viewsets.ModelViewSet):
    """
    ViewSet para listar y crear eventos de dotación.
    """
    queryset = EndowmentEvent.objects.all().order_by('-date')
    serializer_class = EndowmentEventSerializer
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissions]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employee', 'endowment_type', 'status']
    ordering_fields = ['date', 'employee__first_name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        branch = self.request.query_params.get('branch', None)
        if branch:
            queryset = queryset.filter(branch_id=branch)
        return queryset

    @action(detail=False, methods=['post'])
    def massive(self, request):
        """
        Registra una dotación masiva y actualiza el last_endowment_date de los empleados.
        Payload esperado:
        {
            "date": "YYYY-MM-DD",
            "description": "...",
            "branch_id": 1, (Opcional)
            "employee_ids": [1, 2, 3] (Opcional, si no se envía y hay branch_id, aplica a todos los de esa sede. Si no hay nada, aplica a todos los activos)
        }
        """
        date_str = request.data.get('date')
        description = request.data.get('description', '')
        branch_id = request.data.get('branch_id')
        employee_ids = request.data.get('employee_ids', None)
        
        if not date_str:
            return Response({'error': 'La fecha es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)
        if not description:
            return Response({'error': 'La descripción es obligatoria.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            with transaction.atomic():
                # 1. Determinar empleados afectados
                employees = Employee.objects.filter(is_active=True)
                
                if employee_ids is not None:
                    # Si mandan lista de IDs explícita
                    employees = employees.filter(id__in=employee_ids)
                elif branch_id:
                    # Si no mandan IDs pero mandan sede, aplicar a activos de la sede
                    employees = employees.filter(branch_id=branch_id)
                
                if not employees.exists():
                    return Response({'error': 'No se encontraron empleados activos para los criterios dados.'}, status=status.HTTP_400_BAD_REQUEST)
                
                # 2. Crear el evento de dotación
                endowment_event = EndowmentEvent.objects.create(
                    date=date_str,
                    description=description,
                    branch_id=branch_id if branch_id else None
                )
                
                # Asignar los empleados al evento (bulk)
                endowment_event.employees.set(employees)
                
                # 3. Actualizar la fecha de última dotación masivamente
                employees.update(last_endowment_date=date_str)
                
                serializer = self.get_serializer(endowment_event)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
