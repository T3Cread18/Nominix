# 🏖️ Sistema de Vacaciones (Backend)

Documentación técnica del subsistema de gestión de vacaciones, adaptado a la legislación venezolana (LOTTT).

## 1. Visión General

El sistema gestiona el ciclo de vida completo de las vacaciones:
1.  **Cálculo de Derechos**: Determinación de días correspondientes según antigüedad.
2.  **Control de Saldos**: Tracking de días acumulados vs. días disfrutados.
3.  **Calendario Laboral**: Cálculo preciso usando días hábiles y feriados.
4.  **Ejecución de Nómina**: Pago y deducción correctos durante el periodo de disfrute.

---

## 2. Modelos de Datos

### 2.1 `VacationBalance`
Tabla transaccional que almacena el saldo de un empleado para un año de servicio específico.

| Campo | Tipo | Descripción |
|---|---|---|
| `employee` | FK | Empleado titular |
| `service_year` | Int | Año de antigüedad (1, 2, 3...) |
| `entitled_vacation_days` | Int | Días hábiles de disfrute correspondientes |
| `used_vacation_days` | Int | Días ya disfrutados (acumulativo) |
| `bonus_paid` | Bool | Indica si el Bono Vacacional ya fue pagado |

### 2.2 `Holiday`
Registro de días no laborables para cálculos de fecha.

| Campo | Descripción |
|---|---|
| `date` | Fecha del feriado |
| `is_recurring` | Si se repite anualmente (ej: 1 de Mayo) |
| `active` | Si debe considerarse para cálculos |

### 2.3 `PayrollPolicy` (Configuración)
Nuevos campos agregados a la política de empresa:
- `vacation_days_base`: Días base (Default: 15)
- `vacation_days_per_year`: Días adicionales/año (Default: 1)
- `vacation_days_max`: Tope legal (Default: 30)

---

## 3. Servicios Principales

### 3.1 `VacationService` (`payroll_core/services/vacation.py`)
Encapsula la lógica de negocio de la LOTTT.

- **`calculate_entitled_days(seniority)`**: Aplica la fórmula `15 + (antigüedad - 1)`.
- **`generate_annual_balance(employee)`**: Crea el registro de saldo al cumplir aniversario.
- **`consume_days_from_variation(variation)`**: Descuenta días de los saldos disponibles (FIFO: consume primero el saldo más antiguo).

### 3.2 `BusinessCalendarService` (`payroll_core/services/calendar.py`)
Motor de cálculo temporal.

- **`count_business_days(start, end)`**: Retorna días laborables en un rango.
- **`add_business_days(start, days)`**: Proyecta fecha fin saltando fines de semana y feriados.

### 3.3 `VariationsEngine` (Integración)
El motor de variaciones ahora detecta eventos de tipo `VACATION`:
- **Calcula Pago**: Usa `count_business_days` para determinar cuántos días pagar en el recibo.
- **Hook de Consumo**: Al crear una variación, llama a `consume_days_from_variation` para actualizar el saldo.

---

## 4. API Endpoints

### Gestión de Saldos
```http
GET /api/vacation-balances/?employee={id}
POST /api/vacation-balances/generate/ { employee_id, service_year }
POST /api/vacation-balances/generate-missing/ { employee_id }
```

### Utilidades de Variación
```http
POST /api/employee-variations/calculate-end-date/
Body: { "start_date": "2024-10-01", "days": 15 }
Response:
{
    "end_date": "2024-10-22",
    "calendar_days": 21,
    "return_to_work": "2024-10-23"
}
```

---

## 5. Flujos de Proceso

### A. Generación de Saldo (Aniversario)
1.  El sistema (o usuario manual) detecta aniversario.
2.  Llama a `generate_annual_balance`.
3.  Se crea registro `VacationBalance` con 15 días disponibles (ejemplo año 1).

### B. Solicitud de Vacaciones
1.  Usuario selecciona fecha inicio y cantidad de días hábiles.
2.  Backend calcula fecha fin real (`calculate-end-date`).
3.  Se crea `EmployeeVariation`.
4.  **Automáticamente**:
    - Se descuentan los días del saldo (UPDATE `used_vacation_days`).
    - Se genera novedad en el periodo de nómina correspondiente.

---

## 6. Comandos de Gestión

- **`python manage.py seed_holidays`**: Carga los feriados nacionales de Venezuela.
