from django_tenants.utils import schema_context
from payroll_core.models import Company

def run():
    schema = 'gfo'
    with schema_context(schema):
        co = Company.objects.first()
        if co:
            print(f"Company: {co.name}")
            print(f"show_base_salary: {co.show_base_salary}")
            print(f"show_tickets: {co.show_tickets}")
            print(f"show_supplement: {co.show_supplement}")
            print(f"payroll_journey: {co.payroll_journey}")
        else:
            print("No company record found.")

if __name__ == "__main__":
    run()
