import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from django_tenants.utils import schema_context
from biometrics.models import BiometricDeviceType
from customers.models import Client

for tenant in Client.objects.all():
    try:
        with schema_context(tenant.schema_name):
            obj, created = BiometricDeviceType.objects.get_or_create(
                name='hikvision',
                defaults={
                    'display_name': 'Hikvision ISAPI',
                    'protocol': 'isapi',
                }
            )
            status = "Created" if created else "Exists"
            print(tenant.schema_name + ": " + status + " - " + obj.display_name + " (id=" + str(obj.id) + ")")
    except Exception as e:
        print(tenant.schema_name + ": SKIPPED - " + str(e)[:80])
