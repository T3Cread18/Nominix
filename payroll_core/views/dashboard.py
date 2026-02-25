from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import date, timedelta
from django.db.models import Count, Q

class DashboardMetricsView(APIView):
    """
    Retorna métricas clave para el Home Dashboard:
    - Empleados activos
    - Nóminas abiertas (borradores)
    - Contratos próximos a vencer (30 días)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.has_perm('payroll_core.view_dashboard_metrics'):
            return Response({'error': 'No tiene permiso para ver métricas.'}, status=403)

        # Evitar importaciones circulares en el encabezado
        from payroll_core.models.employee import Employee, LaborContract
        from payroll_core.models.payroll import PayrollPeriod

        tenant = request.tenant

        # 1. Empleados Activos
        active_employees = Employee.objects.filter(is_active=True).count()

        # 2. Nóminas Abiertas (Borrador)
        open_payrolls = PayrollPeriod.objects.filter(status='OPEN').count()

        # 3. Contratos próximos a vencer (en los siguientes 30 días)
        today = date.today()
        thirty_days_later = today + timedelta(days=30)
        
        expiring_contracts = LaborContract.objects.filter(
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=thirty_days_later,
            employee__is_active=True
        ).count()

        return Response({
            'active_employees': active_employees,
            'open_payrolls': open_payrolls,
            'expiring_contracts': expiring_contracts
        })

class DashboardTasksView(APIView):
    """
    Retorna tareas pendientes que requieren acción del usuario actual (o administradores).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.has_perm('payroll_core.view_dashboard_tasks'):
            return Response({'error': 'No tiene permiso para ver tareas.'}, status=403)

        from vacations.models import VacationRequest
        from payroll_core.models.loans import Loan

        # 1. Vacaciones Pendientes
        pending_vacations_queryset = VacationRequest.objects.filter(status='DRAFT')
        # Si no es admin, filtramos por sus propias solicitudes (simplificación) o según permisos
        if not request.user.has_perm('vacations.change_vacationrequest'):
           # Si el usuario no tiene poder de aprobar, solo mostramos sus propias solicitudes pendientes como "info"
           pending_vacations_queryset = pending_vacations_queryset.filter(employee__user=request.user)
           
        pending_vacations = pending_vacations_queryset.count()

        # 2. Préstamos Pendientes
        pending_loans_queryset = Loan.objects.filter(status='DRAFT')
        if not request.user.has_perm('payroll_core.change_loan'):
            pending_loans_queryset = pending_loans_queryset.filter(employee__user=request.user)

        pending_loans = pending_loans_queryset.count()

        return Response({
            'pending_vacations': pending_vacations,
            'pending_loans': pending_loans
        })

class DashboardEventsView(APIView):
    """
    Retorna cumpleaños y aniversarios de trabajo para los próximos 15 días.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.has_perm('payroll_core.view_dashboard_events'):
            return Response({'error': 'No tiene permiso para ver eventos.'}, status=403)

        from payroll_core.models.employee import Employee
        today = date.today()
        # Para simplificar la búsqueda de fechas en el mismo mes/día sin importar el año:
        
        events = []
        
        # Obtenemos todos los empleados activos (idealmente en prod se pagina o filtra a nivel base de datos)
        # Sin embargo, la lógica de cumpleaños (mes y día) es más fácil iterando en memoria si la base de datos es pequeña/mediana,
        # o usando Extra() functions en bases de datos más grandes.
        
        # Para Nóminix (SaaS Pyme), iterar sobre activos (max ~500) es aceptable.
        active_employees = Employee.objects.filter(is_active=True).values('id', 'first_name', 'last_name', 'date_of_birth', 'hire_date')
        
        # Rango de 15 días:
        date_range = [today + timedelta(days=i) for i in range(15)]
        valid_bday_tuples = [(d.month, d.day) for d in date_range]

        for emp in active_employees:
            name = f"{emp['first_name']} {emp['last_name']}"
            
            # Cumpleaños
            if emp['date_of_birth']:
                if (emp['date_of_birth'].month, emp['date_of_birth'].day) in valid_bday_tuples:
                    # Encontrar para qué día cae
                    event_date = date(today.year, emp['date_of_birth'].month, emp['date_of_birth'].day)
                    if event_date < today:
                        event_date = date(today.year + 1, emp['date_of_birth'].month, emp['date_of_birth'].day)
                        
                    events.append({
                        'type': 'birthday',
                        'employee': name,
                        'date': event_date.isoformat(),
                        'days_left': (event_date - today).days
                    })
            
            # Aniversarios
            if emp['hire_date']:
                if (emp['hire_date'].month, emp['hire_date'].day) in valid_bday_tuples:
                    years_service = today.year - emp['hire_date'].year
                    if years_service > 0: # Solo si ha cumplido al menos 1 año
                        event_date = date(today.year, emp['hire_date'].month, emp['hire_date'].day)
                        if event_date < today:
                             event_date = date(today.year + 1, emp['hire_date'].month, emp['hire_date'].day)
                        events.append({
                            'type': 'anniversary',
                            'employee': name,
                            'years': years_service,
                            'date': event_date.isoformat(),
                            'days_left': (event_date - today).days
                        })
        
        # Ordenar por days_left
        events.sort(key=lambda x: x['days_left'])

        return Response(events[:5]) # Devolver solo los 5 más próximos
