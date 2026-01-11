import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from payroll_core.models import Payslip, PayslipDetail
from django.db.models import Sum

print("--- Diagnóstico de Cestaticket ---")

# Buscar recibos que tengan Cestaticket
ct_details = PayslipDetail.objects.filter(tipo_recibo='cestaticket')
count = ct_details.count()

print(f"Total de líneas de detalle marcadas como 'cestaticket': {count}")

if count > 0:
    total_amount = ct_details.aggregate(Sum('amount_ves'))['amount_ves__sum']
    print(f"Monto total acumulado: {total_amount} VES")
    
    # Ver los periodos involucrados
    periods = ct_details.values_list('payslip__period__name', flat=True).distinct()
    print(f"Periodos con datos de Cestaticket: {list(periods)}")
else:
    print("⚠️ No hay ninguna línea de detalle con tipo_recibo='cestaticket' en la base de datos.")
    print("Sugerencia: Re-ejecutar el cierre de nómina para que se aplique la nueva clasificación.")

print("\n--- Diagnóstico de Complemento ---")
comp_details = PayslipDetail.objects.filter(tipo_recibo='complemento')
count_comp = comp_details.count()
print(f"Total de líneas de detalle marcadas como 'complemento': {count_comp}")
if count_comp > 0:
    total_comp = comp_details.aggregate(Sum('amount_ves'))['amount_ves__sum']
    print(f"Monto total acumulado: {total_comp} VES")
else:
    print("⚠️ No hay ninguna línea de detalle con tipo_recibo='complemento'.")
