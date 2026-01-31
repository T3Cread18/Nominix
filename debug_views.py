import os
import django
import sys

# Setup Django environment
sys.path.append('c:/Desarrollo/RRHH')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

print("Attempting to import payroll_core.views...")
try:
    from payroll_core import views
    print("Success: payroll_core.views imported.")
    
    if hasattr(views, 'VariationCauseViewSet'):
        print("VariationCauseViewSet found in views.")
    else:
        print("VariationCauseViewSet NOT found in views.")
        
    if hasattr(views, 'VacationBalanceViewSet'):
        print("VacationBalanceViewSet found in views.")
    else:
        print("VacationBalanceViewSet NOT found in views.")
        
except Exception as e:
    import traceback
    traceback.print_exc()
