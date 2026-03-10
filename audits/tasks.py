from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import AuditAnswer

@shared_task
def alert_expiring_permissions():
    """
    Se ejecuta de forma asíncrona mediante Celery Beat una vez al día.
    Busca documentos evaluados que caduquen en los próximos 15 días.
    """
    today = timezone.now().date()
    # Cambiamos 15 días a 14 o 30, según prefieras, o configurable en admin a futuro.  
    # Usaremos 15 días como predeterminado.
    threshold_date = today + timedelta(days=15)
    
    # Optimizamos consultas usando select_related() para evitar problemas N+1
    expiring_items = AuditAnswer.objects.select_related(
        'audit__sede', 'question'
    ).filter(
        expiration_date__lte=threshold_date,
        expiration_date__gte=today,
        is_expiry_alert_sent=False  # Filtramos los que aún no han detonado la alerta
    )

    for answer in expiring_items:
        sede = answer.audit.sede
        permiso = answer.question.text
        fecha_vencimiento = answer.expiration_date
        
        # Aquí puedes implementar la lógica de notificación. Por ahora, hacemos print.
        print(f"[ALERTA] La Sede {sede.name} tiene '{permiso}' pronto a vencer: {fecha_vencimiento}")
        
        # Opcional pero recomendado: Marcar para no recibir SPAM todos los días de la misma revisión
        answer.is_expiry_alert_sent = True
        answer.save(update_fields=['is_expiry_alert_sent'])
