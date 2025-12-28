from django.core.management.base import BaseCommand
from payroll_core.services import BCVRateService

class Command(BaseCommand):
    help = 'Obtiene las tasas de cambio oficiales (USD/EUR) desde la API del BCV y las actualiza en el sistema.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Iniciando actualización de tasas BCV...'))
        
        try:
            results = BCVRateService.fetch_and_update_rates()
            
            for currency, data in results.items():
                if data['status'] == 'success':
                    status_text = "Creada" if data.get('created') else "Actualizada"
                    self.stdout.write(self.style.SUCCESS(
                        f'  [OK] {currency}: {data["rate"]} ({status_text})'
                    ))
                else:
                    self.stdout.write(self.style.ERROR(
                        f'  [ERROR] {currency}: {data.get("error", "Falla desconocida")}'
                    ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error crítico: {str(e)}'))
