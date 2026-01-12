from django.db.models.signals import post_save
from django.dispatch import receiver
from django_tenants.signals import post_schema_sync
from django_tenants.utils import schema_context
from .services.initialization import create_system_concepts
import logging

logger = logging.getLogger(__name__)

@receiver(post_schema_sync)
def initialize_tenant_data(sender, **kwargs):
    """
    Se ejecuta después de que un esquema ha sido creado y sincronizado.
    """
    schema_name = kwargs.get('schema_name')
    if schema_name == 'public':
        return

    logger.info(f"Inicializando conceptos de sistema para el tenant: {schema_name}")
    try:
        with schema_context(schema_name):
            count = create_system_concepts()
            logger.info(f"Se crearon/actualizaron {count} conceptos de sistema en {schema_name}")
    except Exception as e:
        logger.error(f"Error inicializando tenant {schema_name}: {e}")
