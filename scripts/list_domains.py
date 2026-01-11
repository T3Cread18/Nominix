from customers.models import Client, Domain
try:
    domains = Domain.objects.all()
    print(f"Total domains: {domains.count()}")
    for d in domains:
        print(f"- {d.domain} -> {d.tenant.schema_name}")
except Exception as e:
    print(f"Error: {e}")
exit()
