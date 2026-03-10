import os
import django
import pandas as pd
import sys

# Setup Django
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rrhh_saas.settings')
django.setup()

from audits.models import ChecklistTemplate, ChecklistCategory, ChecklistItem
from django.db import transaction

def import_checklists():
    file_path = '/app/Check List Apertura, Operativo y Legal GERENTE DE TIENDA.xlsx'
    
    with transaction.atomic():
        # 1. APERTURA
        print("Importando APERTURA...")
        tpl_apertura, _ = ChecklistTemplate.objects.get_or_create(name="Apertura Diaria", description="Checklist diario de apertura de tienda")
        df_apertura = pd.read_excel(file_path, sheet_name='Formato para sistema OPERATIVO') # Usando la hoja de formato limpia
        
        # Filtrar solo Apertura si el formato tiene varias
        # En el Excel analizado, 'OPERATIVO' y 'APERTURA' tienen formatos similares.
        
        # Hoja 'APERTURA' original es más humana, 'Formato para sistema OPERATIVO' es más data-friendly
        # Vamos a parsear la hoja 'Formato para sistema OPERATIVO' que parece ser la que tiene los items limpios
        
        current_cat = None
        for _, row in df_apertura.iterrows():
            area = str(row.iloc[2]).strip()
            indicador = str(row.iloc[3]).strip()
            punto = str(row.iloc[4]).strip()
            
            if area and area != 'nan' and area != 'Proceso':
                cat, _ = ChecklistCategory.objects.get_or_create(template=tpl_apertura, name=area)
                ChecklistItem.objects.get_or_create(
                    category=cat,
                    indicator=indicador if indicador != 'nan' else "",
                    text=punto
                )
        
        # 2. LEGAL
        print("Importando LEGAL...")
        tpl_legal, _ = ChecklistTemplate.objects.get_or_create(name="Legal Mensual", description="Checklist de cumplimiento legal y carteleras")
        df_legal = pd.read_excel(file_path, sheet_name='Formato para Sistema LEGAL')
        
        for _, row in df_legal.iterrows():
            area = str(row.iloc[2]).strip()
            indicador = str(row.iloc[3]).strip()
            punto = str(row.iloc[4]).strip()
            
            if area and area != 'nan' and area != 'Proceso':
                cat, _ = ChecklistCategory.objects.get_or_create(template=tpl_legal, name=area)
                ChecklistItem.objects.get_or_create(
                    category=cat,
                    indicator=indicador if indicador != 'nan' else "",
                    text=punto
                )

    print("Importación finalizada con éxito.")

if __name__ == "__main__":
    from django_tenants.utils import schema_context
    # Ejecutar en el esquema que estemos usando (asumiremos 'public' para las plantillas globales si es multi-tenant public o iterar)
    # Si queremos que estén en todos los esquemas, deberíamos iterar.
    from customers.models import Client
    for tenant in Client.objects.all():
        with schema_context(tenant.schema_name):
            print(f"Procesando esquema: {tenant.schema_name}")
            import_checklists()
