# -*- coding: utf-8 -*-
"""
Signals del módulo de Vacaciones.

Este módulo implementa las reglas de negocio automáticas:
- Al aprobar una solicitud, crear registro USAGE en VacationBalance
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

import logging

from .models import VacationRequest, VacationBalance

logger = logging.getLogger(__name__)


@receiver(pre_save, sender=VacationRequest)
def track_status_change(sender, instance, **kwargs):
    """
    Rastrea cambios de estado para detectar aprobaciones.
    Guarda el estado anterior en una variable de instancia.
    """
    if instance.pk:
        try:
            old_instance = VacationRequest.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except VacationRequest.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=VacationRequest)
def on_vacation_request_approved(sender, instance, created, **kwargs):
    """
    Cuando una VacationRequest cambia a APPROVED:
    - Crea automáticamente un registro USAGE en VacationBalance
    
    Este signal implementa la regla de negocio que descuenta
    los días del saldo vacacional del empleado cuando se
    aprueba su solicitud.
    
    Los días se registran como NEGATIVOS (consumo).
    """
    # Obtener estado anterior (guardado en pre_save)
    old_status = getattr(instance, '_old_status', None)
    new_status = instance.status
    
    # Solo actuar si cambió a APPROVED (y no era APPROVED antes)
    if new_status == VacationRequest.Status.APPROVED and old_status != VacationRequest.Status.APPROVED:
        logger.info(
            f"Solicitud de vacaciones #{instance.pk} aprobada para "
            f"{instance.employee.full_name}. Creando registro USAGE."
        )
        
        try:
            # Calcular año de servicio al momento de la solicitud
            years_of_service = instance.employee.seniority_years or 1
            
            # Crear registro de USAGE (días negativos)
            VacationBalance.objects.create(
                employee=instance.employee,
                related_request=instance,
                period_year=years_of_service,
                transaction_type=VacationBalance.TransactionType.USAGE,
                days=-instance.days_requested,  # NEGATIVO: Consumo
                transaction_date=timezone.now().date(),
                description=f"Vacaciones del {instance.start_date} al {instance.end_date} ({instance.days_requested} días)",
                created_by=instance.approved_by or 'SYSTEM'
            )
            
            logger.info(
                f"Registro USAGE creado: -{instance.days_requested} días "
                f"para {instance.employee.full_name}"
            )
            
        except Exception as e:
            logger.error(
                f"Error creando registro USAGE para solicitud #{instance.pk}: {e}"
            )
            # No re-lanzamos la excepción para no bloquear el guardado
            # pero el log quedará registrado para auditoría
