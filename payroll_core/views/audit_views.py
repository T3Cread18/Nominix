from rest_framework import views, response, status, permissions
from django.contrib.contenttypes.models import ContentType
from rest_framework.pagination import PageNumberPagination

class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 100

class AuditLogView(views.APIView):
    """
    Endpoint consolidado para obtener el historial de cambios (Bitácora) 
    de los modelos protegidos por django-simple-history.
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AuditLogPagination

    def get(self, request, *args, **kwargs):
        from django.db.models import Q
        # Lista de modelos auditados
        from payroll_core.models import Employee, LaborContract, Department, JobPosition, Company, PayrollPolicy, Loan, EndowmentEvent
        from vacations.models import VacationRequest
        
        search_user = request.query_params.get('search_user', '').strip()
        
        models_to_audit = [
            Employee, LaborContract, Department, JobPosition, 
            Company, PayrollPolicy, Loan, EndowmentEvent,
            VacationRequest
        ]
        
        # Recolectar registros históricos de todos los modelos
        all_history = []
        for model in models_to_audit:
            try:
                # Cada modelo con HistoricalRecords tiene el manager 'history'
                records = model.history.all().select_related('history_user')
                
                if search_user:
                    records = records.filter(
                        Q(history_user__username__icontains=search_user) |
                        Q(history_user__email__icontains=search_user)
                    )
                
                for record in records:
                    # Preparar los datos básicos del log
                    action = 'Created' if record.history_type == '+' else ('Updated' if record.history_type == '~' else 'Deleted')
                    
                    user_str = 'Sistema'
                    if record.history_user:
                        user_str = record.history_user.email or record.history_user.username
                    
                    # Generar una representación en string del objeto (si aún existe) o del registro histórico
                    object_repr = str(record.instance) if hasattr(record, 'instance') else f"{model.__name__} ID: {record.id}"
                    
                    # Identificar qué cambió (Delta)
                    changes = []
                    if action == 'Updated' and record.prev_record:
                        delta = record.diff_against(record.prev_record)
                        for change in delta.changes:
                            changes.append({
                                'field': change.field,
                                'old': str(change.old),
                                'new': str(change.new)
                            })
                    
                    all_history.append({
                        'id': record.history_id,
                        'timestamp': record.history_date,
                        'user': user_str,
                        'action': action,
                        'model_name': model._meta.verbose_name.title(),
                        'object_id': record.id,
                        'object_repr': object_repr,
                        'changes': changes
                    })
            except Exception as e:
                # Si el modelo no tiene configurado simple_history correctamente, se salta
                continue
                
        # Ordenar por fecha descendente
        all_history.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Paginación manual para listas
        paginator = AuditLogPagination()
        paginated_history = paginator.paginate_queryset(all_history, request, view=self)
        
        return paginator.get_paginated_response(paginated_history)
