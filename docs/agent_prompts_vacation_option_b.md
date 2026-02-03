# Prompts para Implementación de Vacaciones Opción B (Pago Completo + Anticipo)

## Contexto
El usuario requiere implementar la **Opción B** para el manejo de vacaciones en la nómina regular de regreso.
- **Opción B**: En la nómina regular se carga el periodo completo (ej. 15 días de salario), pero se agrega un concepto de **Deducción** llamado "Anticipo de Vacaciones" por los días que el empleado estuvo de vacaciones (ya pagados).
- **Cestaticket**: Se paga completo (Art. 190 LOTTT).
- **Deducciones de Ley (IVSS/FAOV/RPE)**: Solo deben calcularse sobre los días *efectivamente trabajados* (es decir, Salario - Anticipo), para evitar doble tributación (ya se descontó en el recibo de vacaciones).

---

## Prompt 1: Configuración de Conceptos (Backend)

**Objetivo**: Crear los conceptos necesarios y ajustar las fórmulas de deducciones de ley.

```python
# Tarea: Configurar Conceptos para Vacaciones Opción B
# Archivos: payroll_core/models/concepts.py, payroll_core/fixtures/initial_concepts.json (o script de carga)

"""
Necesitamos crear/actualizar los siguientes conceptos en la base de datos (puedes crear un script de migración de datos o un comando `management command`):

1.  **ANTICIPO_VACACIONES (Deducción)**
    -   **Código**: `ANTICIPO_VAC`
    -   **Tipo**: `DEDUCTION`
    -   **Comportamiento**: `DYNAMIC` (o `FIXED_AMOUNT` con multiplicador de días)
    -   **Fórmula**: `SUELDO_BASE_DIARIO * ANTICIPO_VAC_CANT` (El sistema inyectará la cantidad de días).
    -   **Incidencias**: Debe tener un Tag especial, ej: `DEDUCCION_BASE_LEY`, para poder restarlo de las bases imponible de IVSS/FAOV.
    -   **Notas**: No debe marcar `deducts_from_base_salary=True` porque queremos que el Salario salga completo en el recibo.

2.  **Ajuste de Fórmulas IVSS, FAOV, RPE**
    -   Actualmente, estos conceptos calculan sobre el Salario Integral o Base Mensual.
    -   Debemos modificar sus fórmulas (o lógica en `PayrollEngine`) para que resten el monto de `ANTICIPO_VAC`.
    
    **Requerimiento para IVSS (Sueldo * 12 / 52 * Lunes):**
    -   El cálculo estándar asume que se cotizan todos los lunes del mes.
    -   Debemos introducir una variable `LUNES_VACACIONES` (inyectada como novedad) para restar los lunes ya cotizados en el recibo de vacaciones.
    -   Nueva Lógica IVSS: `BASE_SEMANAL * (LUNES - LUNES_VACACIONES) * TASA`.
    
    **Requerimiento para FAOV/RPE (Porcentaje del Salario):**
    -   Nueva Fórmula: `(TOTAL_ASIGNACIONES_SALARIALES - ANTICIPO_VAC) * TASA`.
    -   Asegúrate de que la base imponible descuente el anticipo.
"""
```

---

## Prompt 2: Lógica de Inyección de Novedades (Backend)

**Objetivo**: Automatizar la creación de novedades de Anticipo y Ajuste de Lunes cuando se procesa un pago de vacaciones.

```python
# Tarea: Automatizar Novedades de Retorno de Vacaciones
# Archivo: vacations/services/vacation_calculator.py, vacations/views.py

"""
Extender el método `VacationEngine.process_payment` (o donde se finalice el pago) para realizar lo siguiente:

1.  **Detectar Periodos de Nómina Afectados**:
    -   Dada la fecha de inicio y fin de las vacaciones (`vacation_request.start_date`, `end_date`), identificar qué `PayrollPeriod` (futuros o actuales) se solapan.
    -   Ejemplo: Vacaciones del 20-Ene al 05-Feb. Afecta la 2da Quincena de Enero y la 1ra Quincena de Febrero.

2.  **Calcular Intersección (Días de Anticipo)**:
    -   Para cada periodo afectado, calcular cuántos **Días Hábiles** (o días calendario según la empresa, generalmente calendario para el descuento de salario mensual) caen dentro del periodo de nómina.
    -   Ej: En la 2da Quincena Enero (16-31), hay 12 días de vacaciones (20 al 31).
    -   Ej: En la 1ra Quincena Febrero (01-15), hay 5 días de vacaciones (01 al 05).

3.  **Calcular Lunes de Vacaciones (Para IVSS)**:
    -   Para cada periodo, contar cuántos lunes caen dentro de la intersección de vacaciones.

4.  **Crear Novedades (PayrollNovelty)**:
    -   Generar registros en `PayrollNovelty` para el empleado y el periodo correspondiente:
        -   Concepto `ANTICIPO_VAC`: Cantidad = Días de intersección.
        -   Concepto `LUNES_VACACIONES` (o variable auxiliar): Cantidad = Número de lunes en la intersección.

**Consideraciones Técnicas**:
-   Usar `transaction.atomic()` para asegurar integridad.
-   Si los periodos de nómina futuros no existen aún, se deben crear o guardar las novedades en una tabla de "Novedades Diferidas" (o simplemente asumir que el usuario genera los periodos antes, o crearlos al vuelo). *Recomendación*: Si el sistema lo permite, crear las novedades asociadas a la fecha o buscar el periodo; si no existe, lanzar advertencia o crearlo.
"""
```

---

## Prompt 3: Validación en Motor de Nómina (Backend)

**Objetivo**: Asegurar que el `PayrollEngine` procese correctamente estas nuevas variables.

```python
# Tarea: Validar Variables en PayrollEngine
# Archivo: payroll_core/engine.py

"""
1.  Verificar que `_build_eval_context` cargue correctamente las novedades `ANTICIPO_VAC` y `LUNES_VACACIONES`.
2.  Asegurar que las fórmulas de IVSS/FAOV tengan acceso a `LUNES_VACACIONES` (por defecto 0 si no existe).
3.  Validar que el monto de `ANTICIPO_VAC` se reste correctamente del Neto a Pagar.
"""
```
