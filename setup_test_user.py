from django.contrib.auth.models import User
from django_tenants.utils import tenant_context
from customers.models import Client

try:
    tenant = Client.objects.get(schema_name='grupo_farmacias_ospino')
    with tenant_context(tenant):
        username = 'ingpablo'
        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(username, 'admin@farmacia.com', 'admin123')
            print(f"Usuario '{username}' creado exitosamente en el tenant GFO con contraseña 'admin123'")
        else:
            u = User.objects.get(username=username)
            u.set_password('admin123')
            u.save()
            print(f"Contraseña del usuario '{username}' actualizada a 'admin123'")
except Exception as e:
    print(f"Error: {e}")
exit()
