from django.core.management.base import BaseCommand
from decimal import Decimal
# Ajusta el import según la ruta real de tu modelo
from apps.payroll.models import PayrollConcept 

class Command(BaseCommand):
    help = 'Crea o actualiza únicamente el concepto de ISLR con la lógica de Contrato'

    def handle(self, *args, **kwargs):
        self.stdout.write("Actualizando configuración de ISLR...")

        # Definición exacta del concepto
        islr_data = {
            'name': 'Retención ISLR (Sujeta a ARI)',
            'kind': PayrollConcept.ConceptKind.DEDUCTION,
            'computation_method': PayrollConcept.ComputationMethod.DYNAMIC_FORMULA,
            'value': Decimal('0.00'),
            'currency_id': 2, # Asumiendo 2 es VES, ajusta según tu ID de moneda local
            'active': True,
            'show_on_payslip': True,
            'receipt_order': 103, # Orden sugerido para que salga al final de las deducciones
            
            # --- LA CLAVE DE TODO: EL COMPORTAMIENTO ---
            'behavior': PayrollConcept.ConceptBehavior.LAW_DEDUCTION,
            'system_params': {
                # 1. Origen de la Tasa: El Contrato
                'rate_source': 'CONTRACT',
                'contract_field': 'islr_retention_percentage', 
                
                # 2. Origen de la Base: Acumulador de Incidencias
                'base_source': 'ACCUMULATOR',
                'base_label': 'ISLR_BASE',
                
                # 3. Sin tope (el ISLR grava todo lo salarial)
                'cap_multiplier': None
            },
            
            # --- INCIDENCIAS (Vacío, porque el ISLR no suele ser base de nada más) ---
            'incidences': [] 
        }

        # Ejecutamos el Upsert (Update o Insert) buscando por CÓDIGO
        concept, created = PayrollConcept.objects.update_or_create(
            code='ISLR',
            defaults=islr_data
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'✅ Concepto ISLR creado exitosamente (ID: {concept.id})'))
        else:
            self.stdout.write(self.style.WARNING(f'🔄 Concepto ISLR actualizado con la nueva lógica (ID: {concept.id})'))