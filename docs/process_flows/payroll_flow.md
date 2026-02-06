# Proceso de Nómina Regular

El núcleo del sistema. Describe cómo se procesa un periodo de pago estándar (Quincenal/Semanal).

## Diagrama Visual

![Diagrama de Flujo de Nómina Regular](file:///C:/Users/Ing%20Pablo/.gemini/antigravity/brain/1aa61d63-b1f4-45f3-a1f8-e0cd0b920515/payroll_process_flow_1769896458920.png)

## Flujo Técnico

1.  **Inicio**: Usuario selecciona periodo y empleados.
2.  **Inicialización**: `PayrollEngine` carga el contrato y novedades del periodo.
3.  **Split Salarial**: Se divide el paquete anual en Base y Complemento (`SalarySplitter`).
4.  **Bucle de Conceptos**: Se iteran los conceptos activos por orden (`receipt_order`).
    *   **Asignaciones**: Salarios, Bonos, Primas.
    *   **Deducciones**: IVSS, FAOV, Préstamos.
5.  **Persistencia**: Se guardan `Payslip` (Recibo) y `PayslipDetail` (Líneas) en la base de datos.
6.  **Generación PDF**: Se emite el comprobante de pago.
