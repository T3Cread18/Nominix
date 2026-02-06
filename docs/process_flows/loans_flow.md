# Gestión de Préstamos y Deducciones

Este proceso detalla cómo se otorgan préstamos a empleados y el mecanismo automático de su deducción en nómina.

## Diagrama Visual

![Diagrama de Flujo de Préstamos](loans_management_flow.png)

## Flujo Técnico

1.  **Solicitud de Préstamo**:
    *   **Entidad**: `Loan`
    *   **Datos**: Monto principal, número de cuotas, frecuencia de deducción.
    *   **Estado Inicial**: `REQUESTED`.

2.  **Aprobación y Amortización**:
    *   Al aprobarse (`APPROVED`), el sistema genera automáticamente el plan de pagos.
    *   **Entidad**: `LoanPayment` (Tabla de amortización).
    *   Cada cuota tiene una `date_due` estimada y un estado `PENDING`.

3.  **Ciclo de Nómina (Deducción)**:
    *   Durante el cálculo de nómina (`PayrollEngine`), el sistema busca cuotas pendientes cuya fecha de vencimiento coincida con el periodo actual.
    *   Si encuentra una cuota, inserta un concepto de **Deducción de Préstamo** en el recibo.
    *   Al confirmar el pago de la nómina, la cuota correspondiente pasa a estado `PAID` y el saldo pendiente del préstamo disminuye.

4.  **Cierre**:
    *   Cuando todas las cuotas están `PAID` (o saldo = 0), el préstamo pasa a estado `PAID_OFF`.
