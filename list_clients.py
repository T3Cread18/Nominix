from customers.models import Client
try:
    clients = Client.objects.all()
    print(f"Total clients: {clients.count()}")
    for c in clients:
        print(f"- {c.schema_name} ({c.name})")
except Exception as e:
    print(f"Error: {e}")
exit()
