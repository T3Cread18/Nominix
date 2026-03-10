from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from audits.models import AuditAnswer

class Command(BaseCommand):
    help = 'Alerta sobre permisos de checklists a punto de expirar'

    def handle(self, *args, **options):
        today = timezone.now().date()
        threshold_date = today + timedelta(days=15)
        
        # Optimizamos consultas usando select_related() para evitar problemas N+1
        expiring_items = AuditAnswer.objects.select_related(
            'audit__sede', 'question'
        ).filter(
            expiration_date__lte=threshold_date,
            expiration_date__gte=today,
            is_expiry_alert_sent=False
        )

        for answer in expiring_items:
            sede = answer.audit.sede
            permiso = answer.question.text
            fecha_vencimiento = answer.expiration_date
            
            self.stdout.write(
                self.style.WARNING(f"[ALERTA] La Sede {sede.name} tiene '{permiso}' pronto a vencer: {fecha_vencimiento}")
            )
            
            # Marcamos
            answer.is_expiry_alert_sent = True
            answer.save(update_fields=['is_expiry_alert_sent'])
            
        self.stdout.write(self.style.SUCCESS('Proceso de alerta de vencimientos finalizado.'))
