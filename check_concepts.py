from django_tenants.utils import schema_context
from payroll_core.models import PayrollConcept

def run():
    schema = 'gfo'
    with schema_context(schema):
        concepts = PayrollConcept.objects.all()
        print(f"--- CONCEPTS VISIBILITY ({schema}) ---")
        for c in concepts:
            print(f"[{c.code}] {c.name}: show={c.show_on_payslip}, active={c.active}")

if __name__ == "__main__":
    run()
