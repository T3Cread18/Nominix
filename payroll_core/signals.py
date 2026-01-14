from django.db.models.signals import post_save
from django.dispatch import receiver
from django_tenants.signals import post_schema_sync
from django_tenants.utils import schema_context
from .services.initialization import create_system_concepts
from .models.organization import Company, Branch
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

@receiver(post_save, sender=Company)
def on_company_created(sender, instance, created, **kwargs):
    """
    Automatización de Onboarding:
    Configura la infraestructura base cuando se crea la configuración de la empresa.
    
    1. Crea Sede Principal.
    2. Inyecta Conceptos de Nómina.
    """
    if not created:
        return

    logger.info(f"Iniciando onboarding automático para empresa: {instance.name}")

    try:
        # 1. Infraestructura Base: Sede Principal
        if not Branch.objects.exists():
            Branch.objects.create(
                name="Sede Principal",
                code="MAIN",
                is_main=True,
                is_active=True
            )
            logger.info("Sede Principal creada automáticmanete.")

        # 2. Inyección de Conceptos
        # Reutilizamos el servicio de inicialización que ya define los conceptos de ley
        # (Sueldo, IVSS, FAOV, INCES, etc.)
        count = create_system_concepts()
        logger.info(f"Conceptos de nómina inyectados: {count}")

    except Exception as e:
        logger.error(f"Error en onboarding automático: {e}")
