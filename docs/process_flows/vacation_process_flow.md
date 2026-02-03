# Flujo de Procesamiento de Pago de Vacaciones

Este documento detalla el flujo técnico extremo a extremo que ocurre cuando un usuario hace clic en el botón **"Procesar Pago"** dentro del módulo de vacaciones.

## Diagrama Visual

![Diagrama de Flujo de Pago de Vacaciones](file:///C:/Users/Ing%20Pablo/.gemini/antigravity/brain/1aa61d63-b1f4-45f3-a1f8-e0cd0b920515/vacation_flow_diagram_1769896185323.png)

## Diagrama de Secuencia (Técnico)

```mermaid
sequenceDiagram
    actor User as Usuario (RRHH)
    participant FE as Frontend (Modal)
    participant API as API (Django View)
    participant Calc as VacationEngine
    participant DB as Base de Datos
    participant Auto as Automator (Option B)

    User->>FE: Click "Procesar Pago"
    FE->>API: POST /api/vacations/{id}/process_payment/
    Note right of FE: Payload: { payment_date: "YYYY-MM-DD" }
    
    activate API
    API->>DB: Get VacationRequest & Contract
    
    rect rgb(240, 248, 255)
        note right of API: 1. Cálculo de Nómina
        API->>Calc: calculate_vacation_payment()
        Calc->>DB: Get Concepts & Formulas
        Calc-->>API: Result (Gross, Net, Deductions)
    end
    
    rect rgb(255, 248, 240)
        note right of API: 2. Persistencia
        API->>DB: BEGIN TRANSACTION
        API->>DB: INSERT VacationPayment
        API->>DB: INSERT VacationPaymentDetail (Items)
        API->>DB: UPDATE VacationRequest (Status='PROCESSED')
    end

    rect rgb(240, 255, 240)
        note right of API: 3. Automatización Opción B
        API->>Auto: generate_vacation_novelties()
        Auto->>DB: Find/Create Future PayrollPeriods
        Auto->>DB: INSERT PayrollNovelty (ANTICIPO_VAC)
        Auto->>DB: INSERT PayrollNovelty (LUNES_VACACIONES)
    end
    
    API->>DB: COMMIT TRANSACTION
    API-->>FE: 201 Created (JSON Resumen)
    deactivate API
    
    FE->>User: Muestra "¡Pago Procesado!"
```

## Detalle Técnico del Proceso

### 1. Frontend: Disparo de la Acción
*   **Archivo**: `VacationPaymentModal.jsx`
*   **Evento**: `onClick={handleProcessPayment}`
*   **Servicio**: Llamada a `vacationService.processPayment(requestId, paymentDate)`

### 2. Backend: Recepción (API View)
*   **Archivo**: `vacations/views.py`
*   **Método**: `VacationRequestViewSet.process_payment`
*   **Acción**:
    1.  Recibe el `POST`.
    2.  Valida que la solicitud exista y esté en estado `APPROVED`.
    3.  Abre una transacción atómica de base de datos (`transaction.atomic()`).

### 3. Motor de Cálculo (Calculation Engine)
*   **Archivo**: `vacations/services/vacation_calculator.py`
*   **Función**: `VacationEngine.calculate_vacation_payment`

### 4. Persistencia en Base de Datos
1.  **Tabla `VacationPayment`**: Registro maestro.
2.  **Tabla `VacationPaymentDetail`**: Detalles por concepto.
3.  **Tabla `VacationRequest`**: Estado a `'PROCESSED'`.

### 5. Automatización "Opción B" (Novedades Futuras)
*   **Archivo**: `vacations/services/vacation_novelties.py`
*   **Función**: `generate_vacation_novelties`
*   **Lógica**: Inserta `ANTICIPO_VAC` y `LUNES_VACACIONES` en periodos futuros.

### 6. Finalización
*   `COMMIT` de la transacción.
*   Retorna respuesta HTTP `201 Created`.
