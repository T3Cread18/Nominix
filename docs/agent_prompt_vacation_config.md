# PROMPT PARA AGENTE: Configuración de Vacaciones - Base Salarial y Moneda

---
role: fullstack-developer
stack: Django 5.x, DRF, React 18, TailwindCSS
workspace: c:\Desarrollo\RRHH
---

## OBJETIVO

Implementar configuraciones en el módulo de vacaciones para:
1. **Base salarial de vacaciones**: Definir si el cálculo usa solo sueldo base o sueldo base + complemento
2. **Moneda del recibo**: Definir en qué moneda se muestra el recibo PDF
3. **Simulación dual**: Mostrar montos en bolívares y dólares simultáneamente

---

## CONTEXTO DEL SISTEMA

### Estructura Salarial Existente

El sistema maneja distribución de salario según `Company.salary_split_mode`:

```python
# LaborContract (contrato del empleado)
salary_amount          # Paquete mensual total en USD
base_salary_bs         # Sueldo base en Bs (si aplica)
salary_currency        # Moneda del contrato (FK a Currency)

# Company (configuración empresa)
salary_split_mode      # PERCENTAGE | FIXED_BASE | FIXED_BONUS
split_percentage_base  # Ej: 30% = sueldo base es 30% del total
```

**Ejemplo práctico**:
- Paquete Total: $1,500 USD
- Si `split_percentage_base = 30%`:
  - Sueldo Base: $450 USD (30%)
  - Complemento: $1,050 USD (70%)

### Tasa de Cambio

El sistema ya usa `TASA_BCV` para conversiones USD ↔ VES en el PayrollEngine.

---

## ARCHIVOS A MODIFICAR

### Backend
| Archivo | Acción |
|---------|--------|
| `payroll_core/models/organization.py` | MODIFICAR - Agregar campos de configuración vacaciones a `Company` |
| `vacations/services/vacation_calculator.py` | MODIFICAR - Usar configuración para determinar base salarial |
| `vacations/views.py` | MODIFICAR - Retornar montos en ambas monedas en simulación |
| `vacations/serializers.py` | MODIFICAR - Agregar campos de conversión a respuestas |

### Frontend
| Archivo | Acción |
|---------|--------|
| `src/features/settings/VacationSettings.jsx` | CREAR - Formulario de configuración |
| `src/features/vacations/VacationManager.jsx` | MODIFICAR - Mostrar simulación dual Bs/$ |
| `src/services/company.service.js` | MODIFICAR - Agregar métodos para guardar config |

---

## TAREA 1: Agregar Campos de Configuración a Company

**Archivo**: `payroll_core/models/organization.py`

Agregar al modelo `Company` después de la línea 343:

```python
# ==========================================================================
# CONFIGURACIÓN DE VACACIONES
# ==========================================================================

class VacationSalaryBasis(models.TextChoices):
    """Base salarial para cálculo de vacaciones."""
    BASE_ONLY = 'BASE_ONLY', 'Solo Sueldo Base'
    BASE_PLUS_COMPLEMENT = 'BASE_PLUS_COMPLEMENT', 'Sueldo Base + Complemento (Paquete Total)'

vacation_salary_basis = models.CharField(
    max_length=20,
    choices=VacationSalaryBasis.choices,
    default=VacationSalaryBasis.BASE_PLUS_COMPLEMENT,
    verbose_name="Base Salarial para Vacaciones",
    help_text="Define qué componentes del sueldo inciden en el pago de vacaciones"
)

class VacationReceiptCurrency(models.TextChoices):
    """Moneda para recibo de vacaciones."""
    USD = 'USD', 'Dólares (USD)'
    VES = 'VES', 'Bolívares (Bs.)'
    DUAL = 'DUAL', 'Ambas Monedas'

vacation_receipt_currency = models.CharField(
    max_length=10,
    choices=VacationReceiptCurrency.choices,
    default=VacationReceiptCurrency.USD,
    verbose_name="Moneda del Recibo de Vacaciones",
    help_text="En qué moneda se muestran los montos del recibo PDF"
)
```

---

## TAREA 2: Modificar VacationEngine para Usar Configuración

**Archivo**: `vacations/services/vacation_calculator.py`

Modificar `calculate_complete_payment()` para:

1. Recibir parámetro `company` o cargar la configuración
2. Determinar base salarial según `company.vacation_salary_basis`:

```python
@staticmethod
def _get_vacation_salary(contract: LaborContract, company: Company) -> Decimal:
    """
    Determina el salario a usar para cálculo de vacaciones según configuración.
    
    Args:
        contract: Contrato laboral del empleado
        company: Configuración de la empresa
    
    Returns:
        Salario mensual a usar para el cálculo
    """
    if company.vacation_salary_basis == Company.VacationSalaryBasis.BASE_ONLY:
        # Solo sueldo base (calculado según split de la empresa)
        total = contract.monthly_salary
        percentage = company.split_percentage_base / Decimal('100')
        return (total * percentage).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    else:
        # Paquete completo (base + complemento)
        return contract.monthly_salary
```

3. Agregar conversión a bolívares en el resultado:

```python
def calculate_complete_payment(..., exchange_rate: Decimal = None) -> dict:
    # ... cálculos existentes ...
    
    # Agregar conversión a VES si hay tasa
    result['currency'] = 'USD'
    if exchange_rate and exchange_rate > 0:
        result['exchange_rate'] = exchange_rate
        result['gross_total_ves'] = (result['gross_total'] * exchange_rate).quantize(Decimal('0.01'))
        result['net_total_ves'] = (result['net_total'] * exchange_rate).quantize(Decimal('0.01'))
        result['daily_salary_ves'] = (result['daily_salary'] * exchange_rate).quantize(Decimal('0.01'))
```

---

## TAREA 3: Actualizar Endpoint de Simulación

**Archivo**: `vacations/views.py`

Modificar `simulate` y `simulate_complete` para:

1. Obtener tasa BCV actual (desde setting o parámetro)
2. Retornar montos en ambas monedas

```python
@action(detail=True, methods=['get'], url_path='simulate-complete')
def simulate_complete(self, request, pk=None):
    vacation_request = self.get_object()
    
    # Obtener configuración de empresa
    company = Company.objects.first()
    
    # Obtener tasa de cambio (del request o configuración)
    exchange_rate = Decimal(request.query_params.get('exchange_rate', '0'))
    if not exchange_rate:
        # Intentar obtener tasa del sistema
        from payroll_core.models import ExchangeRate
        try:
            rate = ExchangeRate.objects.latest('date')
            exchange_rate = rate.rate
        except:
            exchange_rate = Decimal('0')
    
    result = VacationEngine.calculate_complete_payment(
        contract=vacation_request.contract,
        start_date=vacation_request.start_date,
        days_to_enjoy=vacation_request.days_requested,
        company=company,
        exchange_rate=exchange_rate
    )
    
    # Agregar metadata de configuración
    result['vacation_salary_basis'] = company.vacation_salary_basis
    result['vacation_salary_basis_display'] = company.get_vacation_salary_basis_display()
    
    return Response(result)
```

---

## TAREA 4: Actualizar Template PDF

**Archivo**: `templates/vacations/recibo_vacaciones.html`

Modificar para soportar múltiples modos de moneda:

```html
{% if company.vacation_receipt_currency == 'USD' %}
    <!-- Mostrar solo en USD -->
    <td class="amount">$ {{ payment.net_amount|floatformat:2 }}</td>
    
{% elif company.vacation_receipt_currency == 'VES' %}
    <!-- Mostrar solo en VES -->
    <td class="amount">Bs. {{ payment.net_amount_ves|floatformat:2 }}</td>
    
{% else %}
    <!-- Modo DUAL: ambas monedas -->
    <td class="amount">
        $ {{ payment.net_amount|floatformat:2 }}<br>
        <small class="text-muted">Bs. {{ payment.net_amount_ves|floatformat:2 }}</small>
    </td>
{% endif %}
```

---

## TAREA 5: Crear Componente de Configuración Frontend

**Archivo**: `src/features/settings/VacationSettings.jsx`

```jsx
const VacationSettings = () => {
    const [settings, setSettings] = useState({
        vacation_salary_basis: 'BASE_PLUS_COMPLEMENT',
        vacation_receipt_currency: 'USD'
    });
    
    const salaryBasisOptions = [
        { value: 'BASE_ONLY', label: 'Solo Sueldo Base' },
        { value: 'BASE_PLUS_COMPLEMENT', label: 'Sueldo Base + Complemento' }
    ];
    
    const currencyOptions = [
        { value: 'USD', label: 'Dólares ($)' },
        { value: 'VES', label: 'Bolívares (Bs.)' },
        { value: 'DUAL', label: 'Ambas Monedas' }
    ];
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Vacaciones</CardTitle>
            </CardHeader>
            <CardContent>
                {/* Select Base Salarial */}
                <FormField label="Base Salarial para Cálculo">
                    <Select
                        value={settings.vacation_salary_basis}
                        options={salaryBasisOptions}
                        onChange={(value) => setSettings({...settings, vacation_salary_basis: value})}
                    />
                    <FormDescription>
                        Define qué componentes del sueldo inciden en el pago de vacaciones
                    </FormDescription>
                </FormField>
                
                {/* Select Moneda Recibo */}
                <FormField label="Moneda del Recibo">
                    <Select
                        value={settings.vacation_receipt_currency}
                        options={currencyOptions}
                        onChange={(value) => setSettings({...settings, vacation_receipt_currency: value})}
                    />
                </FormField>
            </CardContent>
        </Card>
    );
};
```

---

## TAREA 6: Actualizar Simulación en VacationManager

**Archivo**: `src/features/vacations/VacationManager.jsx`

Modificar la sección de simulación para mostrar montos duales:

```jsx
{/* Simulación Dual Moneda */}
{simulation && (
    <div className="grid grid-cols-2 gap-4">
        {/* Columna USD */}
        <div className="bg-green-50 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-green-600 mb-2">Dólares (USD)</h4>
            <p className="text-2xl font-black text-green-700">
                $ {formatNumber(simulation.net_total)}
            </p>
            <p className="text-xs text-green-500">
                Bruto: $ {formatNumber(simulation.gross_total)}
            </p>
        </div>
        
        {/* Columna VES */}
        <div className="bg-blue-50 p-4 rounded-xl">
            <h4 className="text-xs font-bold text-blue-600 mb-2">Bolívares (Bs.)</h4>
            <p className="text-2xl font-black text-blue-700">
                Bs. {formatNumber(simulation.net_total_ves || 0)}
            </p>
            <p className="text-xs text-blue-500">
                Tasa: {simulation.exchange_rate || 'N/A'} Bs/$
            </p>
        </div>
    </div>
)}

{/* Indicador de base salarial usada */}
{simulation?.vacation_salary_basis_display && (
    <p className="text-[10px] text-gray-400 mt-2">
        Base de cálculo: {simulation.vacation_salary_basis_display}
    </p>
)}
```

---

## TAREA 7: Crear Migración

Después de modificar el modelo Company:

```bash
python manage.py makemigrations payroll_core
python manage.py migrate
```

---

## CRITERIOS DE VALIDACIÓN

1. ✅ Configuración guardada en `Company` persiste correctamente
2. ✅ Si `vacation_salary_basis = BASE_ONLY`, el cálculo usa solo el 30% (o % configurado)
3. ✅ Si `vacation_salary_basis = BASE_PLUS_COMPLEMENT`, usa el paquete total
4. ✅ Simulación retorna `net_total` y `net_total_ves`
5. ✅ PDF respeta la configuración de moneda
6. ✅ UI de configuración permite cambiar ambos settings

---

## EJEMPLO DE CÁLCULO

**Escenario**: Empleado con paquete $1,500 USD, antigüedad 3 años, tasa 36.50 Bs/$

### Modo BASE_ONLY (30%)
```
Salario usado: $1,500 × 30% = $450.00
Salario diario: $450 / 30 = $15.00
Vacaciones (15 días): $225.00
Bono (17 días): $255.00
Total USD: $480.00
Total VES: Bs. 17,520.00
```

### Modo BASE_PLUS_COMPLEMENT (100%)
```
Salario usado: $1,500.00
Salario diario: $1,500 / 30 = $50.00
Vacaciones (15 días): $750.00
Bono (17 días): $850.00
Total USD: $1,600.00
Total VES: Bs. 58,400.00
```

---

## NO HACER

- Modificar cálculos existentes de nómina regular
- Hardcodear porcentajes o tasas de cambio
- Romper compatibilidad con simulaciones existentes (agregar campos, no quitar)
- Olvidar manejar caso cuando no hay tasa de cambio disponible
