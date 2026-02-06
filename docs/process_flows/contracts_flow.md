# Gestión de Contratos y Hiring

Este proceso describe el alta de un nuevo trabajador y la formalización de su relación laboral en el sistema.

## Diagrama Visual

![Diagrama de Flujo de Contratación](contracts_hiring_flow.png)

## Flujo Técnico

1.  **Creación de Ficha (Empleado)**:
    *   **Entidad**: `Employee`
    *   **Datos**: Información personal, RIF, correo, fecha de nacimiento.
    *   **Validación**: El sistema verifica que el RIF no esté duplicado en el Tenant actual.

2.  **Formalización (Contrato)**:
    *   **Entidad**: `LaborContract`
    *   **Vinculación**: Se asigna al `Employee` creado.
    *   **Definicón Salarial**:
        *   Tipos: `BASE_ONLY` (Sueldo Mínimo/Tabular) o `INTEGRAL` (Paquete Anual).
        *   Moneda: Se define la moneda del contrato (USD/VES).
    *   **Fechas**: Inicio de relación laboral (Antigüedad).

3.  **Configuración de Conceptos Personales**:
    *   Se asocian conceptos recurrentes específicos al empleado (ej: Primas por Responsabilidad, Bonos por Desempeño) que no son generales para toda la nómina.

4.  **Activación**:
    *   El contrato pasa a estado `ACTIVE`.
    *   El motor de nómina (`PayrollEngine`) comenzará a incluir a este empleado en los periodos cuya fecha abarque la vigencia del contrato.
