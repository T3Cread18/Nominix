from django.contrib.auth.models import User
from django_tenants.utils import tenant_context
from customers.models import Client

try:
    tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
    with tenant_context(tenant):
        print(f"--- Usuarios en Tenant: {tenant.name} ---")
        users = User.objects.all()
        if not users.exists():
            print("No hay usuarios en este tenant.")
        for u in users:
            print(f"- Usuario: {u.username} | Email: {u.email} | IsStaff: {u.is_staff}")
except Exception as e:
    print(f"Error: {e}")
exit()
