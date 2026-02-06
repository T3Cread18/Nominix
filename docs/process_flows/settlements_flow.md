# Liquidación de Prestaciones Sociales

Este proceso describe el cálculo final de haberes cuando finaliza la relación laboral (Renuncia o Despido).

## Diagrama Visual

![Diagrama de Flujo de Liquidación](settlements_flow.png)

## Flujo Técnico

1.  **Inicio del Proceso**:
    *   **Entidad**: `Settlement`
    *   **Datos**: Fecha de egreso, motivo (Renuncia, Despido Justificado/Injustificado), preaviso dado/omitido.

2.  **Cálculo de Garantía**:
    *   El sistema recupera el historial de acumulados trimestrales (`SocialBenefitHistory`).
    *   Suma la garantía acumulada hasta la fecha de corte.

3.  **Intereses**:
    *   Calcula los intereses sobre prestaciones sociales según la tasa del BCV definida en el sistema.

4.  **Conceptos Pendientes (Devengados)**:
    *   **Vacaciones Fraccionadas**: Días ganados no disfrutados.
    *   **Bono Vacacional Fraccionado**: Proporcional al tiempo trabajado.
    *   **Utilidades Fraccionadas**: Proporcional a los meses trabajados en el año fiscal.

5.  **Deducciones Finales**:
    *   **Préstamos**: Busca `Loan` con saldo > 0 y los resta del total.
    *   **Anticipos**: Deduce cualquier anticipo de prestaciones otorgado.

6.  **Resultado Final**:
    *   Genera un recibo de liquidación (`Payslip` tipo `LIQUIDACION`) con el neto a pagar al trabajador.
    *   Inactiva el Contrato Laboral.
