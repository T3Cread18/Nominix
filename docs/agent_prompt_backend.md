# PROMPT PARA AGENTE: Backend - Módulo de Pagos de Vacaciones

---
role: backend-developer
stack: Django 5.x, Django REST Framework, PostgreSQL, WeasyPrint
workspace: c:\Desarrollo\RRHH
---

## OBJETIVO

Implementar el cálculo completo de pagos de vacaciones y la generación de recibos PDF para el sistema Nóminix, siguiendo la ley laboral venezolana (LOTTT).

## CONTEXTO

El módulo de vacaciones ya existe con:
- Modelo `VacationRequest` para solicitudes de vacaciones
- Modelo `VacationBalance` para seguimiento de días (kardex)
- Modelo `Holiday` para feriados nacionales
- Clase `VacationEngine` con métodos de cálculo básicos
- Endpoints API para CRUD, aprobar, simular

**BRECHA CRÍTICA**: El cálculo actual solo paga días hábiles. La LOTTT requiere pagar el PERÍODO COMPLETO incluyendo fines de semana y feriados que caigan dentro del período vacacional.

## ARCHIVOS A MODIFICAR

### Archivos Principales
| Archivo | Acción |
|---------|--------|
| `vacations/services/vacation_calculator.py` | MODIFICAR - Extender VacationEngine |
| `vacations/models.py` | MODIFICAR - Agregar modelo VacationPayment |
| `vacations/views.py` | MODIFICAR - Agregar endpoints export-pdf y process-payment |
| `vacations/serializers.py` | MODIFICAR - Agregar VacationPaymentSerializer |
| `vacations/urls.py` | MODIFICAR - Registrar nuevas rutas |
| `templates/vacations/recibo_vacaciones.html` | CREAR - Template PDF |

### Archivos de Referencia (NO MODIFICAR)
| Archivo | Propósito |
|---------|-----------|
| `payroll_core/engine.py` | Referencia para patrones de cálculo |
| `templates/payroll/payslip_batch.html` | Referencia para estructura de template PDF |
| `payroll_core/models/social_benefits.py` | Referencia para patrón de libro mayor inmutable |

## TAREA 1: Extender VacationEngine

**Archivo**: `vacations/services/vacation_calculator.py`

Agregar método `calculate_complete_payment()` que:

1. Acepta: `contract`, `start_date`, `days_to_enjoy`, `holidays` (opcional)
2. Calcula días de descanso (Sáb/Dom) dentro del período vacacional
3. Calcula días feriados dentro del período vacacional
4. Calcula deducciones: IVSS (4%), FAOV (1%), RPE (0.5%)
5. Retorna desglose completo con bruto, deducciones y neto

**Estructura de retorno esperada**:
```python
{
    "daily_salary": Decimal,
    "vacation_days": int,
    "rest_days": int,
    "holiday_days": int,
    "bonus_days": int,
    "vacation_amount": Decimal,
    "rest_amount": Decimal,
    "holiday_amount": Decimal,
    "bonus_amount": Decimal,
    "gross_total": Decimal,
    "ivss_amount": Decimal,
    "faov_amount": Decimal,
    "rpe_amount": Decimal,
    "total_deductions": Decimal,
    "net_total": Decimal,
    "start_date": date,
    "end_date": date,
    "return_date": date,
    "calculation_trace": str
}
```

**REGLAS**:
- Usar `Decimal` para todos los cálculos monetarios, NUNCA `float`
- Usar `ROUND_HALF_UP` para redondeos
- Cargar feriados de `Holiday.objects.filter()` si no se proveen

## TAREA 2: Crear Modelo VacationPayment

**Archivo**: `vacations/models.py`

Crear modelo con campos:
- `vacation_request` (OneToOne hacia VacationRequest)
- `payment_date` (DateField)
- `daily_salary` (DecimalField)
- Días: `vacation_days`, `rest_days`, `holiday_days`, `bonus_days`
- Montos: `vacation_amount`, `rest_amount`, `holiday_amount`, `bonus_amount`, `gross_amount`
- Deducciones: `ivss_deduction`, `faov_deduction`, `rpe_deduction`, `total_deductions`
- `net_amount` (DecimalField)
- `receipt_pdf` (FileField, opcional)
- `created_at`, `created_by`, `calculation_trace`

**REGLAS**:
- El modelo debe ser inmutable (sobreescribir save para prevenir actualizaciones)
- Usar `on_delete=models.PROTECT` para claves foráneas

## TAREA 3: Crear Template PDF

**Archivo**: `templates/vacations/recibo_vacaciones.html`

Crear template HTML para WeasyPrint con:
1. Encabezado de empresa con placeholder para logo
2. Sección de datos del trabajador (nombre, cédula, cargo, fecha ingreso, antigüedad)
3. Sección de período vacacional (inicio, fin, retorno)
4. Tabla de devengados:
   - Días de vacaciones × salario diario
   - Días de descanso × salario diario
   - Días feriados × salario diario
   - Bono vacacional × salario diario
   - TOTAL BRUTO
5. Tabla de deducciones:
   - IVSS (4%)
   - FAOV (1%)
   - RPE (0.5%)
   - TOTAL DEDUCCIONES
6. NETO A PAGAR (resaltado)
7. **OBLIGATORIO**: Línea para firma del empleado
8. **OBLIGATORIO**: Recuadro para huella dactilar (80x100px con borde)
9. Texto legal de conformidad referenciando LOTTT Art. 190-194

**Usar CSS**:
- `@page { size: letter; margin: 2cm; }`
- Estilo profesional con bordes y espaciado
- Amigable para impresión (sin colores que gasten tinta)

## TAREA 4: Agregar Endpoints API

**Archivo**: `vacations/views.py`

Agregar a `VacationRequestViewSet`:

### Endpoint 1: `GET /api/vacations/{id}/simulate-complete/`
- Calcula pago completo sin persistir
- Retorna desglose completo para vista previa

### Endpoint 2: `POST /api/vacations/{id}/process-payment/`
- Solo para solicitudes APPROVED
- Crea registro VacationPayment
- Cambia estado de solicitud a PROCESSED
- Retorna resumen del pago

### Endpoint 3: `GET /api/vacations/{id}/export-pdf/`
- Solo para solicitudes APPROVED o PROCESSED
- Genera PDF usando WeasyPrint
- Retorna PDF como descarga de archivo

**Patrón de implementación**:
```python
from django.template.loader import render_to_string
from weasyprint import HTML
from django.http import HttpResponse

@action(detail=True, methods=['get'], url_path='export-pdf')
def export_pdf(self, request, pk=None):
    # ... implementación
    html = render_to_string('vacations/recibo_vacaciones.html', context)
    pdf = HTML(string=html).write_pdf()
    response = HttpResponse(pdf, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="recibo_{pk}.pdf"'
    return response
```

## TAREA 5: Crear Serializer

**Archivo**: `vacations/serializers.py`

Agregar `VacationPaymentSerializer` con todos los campos de solo lectura.
Incluir campo computado `employee_name` desde la solicitud relacionada.

## TAREA 6: Crear Migración

Después de agregar el modelo, ejecutar:
```bash
python manage.py makemigrations vacations
python manage.py migrate
```

## CRITERIOS DE VALIDACIÓN

1. ✅ `calculate_complete_payment()` retorna días de descanso/feriados correctos para un período de muestra
2. ✅ PDF se genera sin errores e incluye espacio para firma/huella
3. ✅ Endpoint `process-payment` crea registro VacationPayment
4. ✅ Endpoint `export-pdf` retorna PDF descargable
5. ✅ Todos los cálculos monetarios usan Decimal, no float
6. ✅ Deducciones IVSS/FAOV/RPE calculadas sobre base correcta

## CASO DE PRUEBA EJEMPLO

```python
# Empleado con 3 años de antigüedad, salario $1350/mes
# Vacaciones iniciando Lunes 2026-02-02, 10 días hábiles

Esperado:
- vacation_days: 10
- rest_days: 4 (2 fines de semana dentro del período)
- holiday_days: 0
- bonus_days: 17 (15 base + 2 años)
- daily_salary: $45.00
- vacation_amount: $450.00
- rest_amount: $180.00
- bonus_amount: $765.00
- gross_total: $1395.00
- ivss_amount: $25.20 (4% de $630)
- faov_amount: $6.30 (1% de $630)
- rpe_amount: $3.15 (0.5% de $630)
- net_total: $1360.35
```

## NO HACER

- Usar float para cálculos monetarios
- Modificar archivos fuera de la app vacations
- Omitir el espacio para firma/huella en el PDF
- Permitir edición de VacationPayment después de creado
