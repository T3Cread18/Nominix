# PROMPT PARA AGENTE: Frontend - Módulo de Pagos de Vacaciones

---
role: frontend-developer
stack: React 18, Vite, TailwindCSS, TanStack Query, Axios
workspace: c:\Desarrollo\RRHH\nominix-web
---

## OBJETIVO

Implementar componentes de UI para procesar pagos de vacaciones y descargar recibos PDF en el sistema Nóminix.

## CONTEXTO

El frontend del módulo de vacaciones ya existe con:
- `VacationManager.jsx` - Componente principal con tabs
- `VacationRequestsList.jsx` - Lista de solicitudes de vacaciones
- `EmployeeVacationKardex.jsx` - Historial de vacaciones del empleado
- `vacation.service.js` - Servicio API

**DEPENDENCIA DEL BACKEND**: Esta implementación requiere los endpoints del backend:
- `GET /api/vacations/{id}/simulate-complete/`
- `POST /api/vacations/{id}/process-payment/`
- `GET /api/vacations/{id}/export-pdf/`

## ARCHIVOS A MODIFICAR

| Archivo | Acción |
|---------|--------|
| `src/services/vacation.service.js` | MODIFICAR - Agregar nuevos métodos API |
| `src/features/vacations/VacationRequestsList.jsx` | MODIFICAR - Agregar botones de acción |
| `src/features/vacations/VacationPaymentModal.jsx` | CREAR |
| `src/features/vacations/VacationPaymentPreview.jsx` | CREAR |
| `src/features/vacations/VacationManager.jsx` | MODIFICAR - Actualizar visualización de simulación |
| `src/features/vacations/index.js` | MODIFICAR - Exportar nuevos componentes |

## TAREA 1: Actualizar vacation.service.js

**Archivo**: `src/services/vacation.service.js`

Agregar métodos:

```javascript
// Simular pago completo con días de descanso/feriados
async simulateCompletePayment(requestId) {
    const response = await axiosClient.get(`/vacations/${requestId}/simulate-complete/`);
    return response.data;
}

// Procesar pago para solicitud aprobada
async processPayment(requestId) {
    const response = await axiosClient.post(`/vacations/${requestId}/process-payment/`);
    return response.data;
}

// Descargar recibo PDF
async downloadReceiptPdf(requestId) {
    const response = await axiosClient.get(`/vacations/${requestId}/export-pdf/`, {
        responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `recibo_vacaciones_${requestId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}
```

## TAREA 2: Crear Componente VacationPaymentPreview

**Archivo**: `src/features/vacations/VacationPaymentPreview.jsx`

**Props**:
```typescript
{
    simulation: {
        daily_salary: number,
        vacation_days: number,
        rest_days: number,
        holiday_days: number,
        bonus_days: number,
        vacation_amount: number,
        rest_amount: number,
        holiday_amount: number,
        bonus_amount: number,
        gross_total: number,
        ivss_amount: number,
        faov_amount: number,
        rpe_amount: number,
        total_deductions: number,
        net_total: number
    },
    employeeName: string,
    period: { start: string, end: string }
}
```

**Estructura**:
1. Encabezado con nombre del empleado y período
2. Tabla de devengados (4 filas: vacaciones, descanso, feriados, bono)
3. Fila de total bruto (resaltada)
4. Sección de deducciones (IVSS, FAOV, RPE)
5. Total neto (fondo verde, fuente grande)

**Estilos**: Usar clases existentes de Card y tablas del proyecto.

## TAREA 3: Crear Componente VacationPaymentModal

**Archivo**: `src/features/vacations/VacationPaymentModal.jsx`

**Props**:
```typescript
{
    isOpen: boolean,
    onClose: () => void,
    vacationRequest: object,
    onSuccess: () => void
}
```

**Comportamiento**:
1. Al montar (cuando isOpen cambia a true), llamar `simulateCompletePayment(requestId)`
2. Mostrar spinner de carga mientras se obtienen datos
3. Mostrar `VacationPaymentPreview` con datos de simulación
4. Dos botones: "Cancelar" y "Procesar Pago"
5. Al hacer clic en "Procesar Pago":
   - Llamar `processPayment(requestId)`
   - En éxito: llamar `onSuccess()`, luego `onClose()`
   - En error: mostrar mensaje de error

**Usar componentes existentes**: `Modal` de `../../components/ui/Modal`

## TAREA 4: Actualizar VacationRequestsList

**Archivo**: `src/features/vacations/VacationRequestsList.jsx`

Agregar a la tabla:

1. **Nueva columna "Acciones"** después de la columna de estado

2. **Para estado APPROVED**: Mostrar botón "Procesar Pago"
   - Icono: `DollarSign` de lucide-react
   - Variante: "electric"
   - Abre `VacationPaymentModal`

3. **Para estado PROCESSED**: Mostrar botón "Descargar Recibo"
   - Icono: `Download` de lucide-react
   - Variante: "secondary"
   - Llama `downloadReceiptPdf()`

4. **Agregar estado**:
   ```javascript
   const [selectedRequest, setSelectedRequest] = useState(null);
   const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
   const [downloadingId, setDownloadingId] = useState(null);
   ```

5. **Agregar handlers**:
   ```javascript
   const handleOpenPaymentModal = (request) => {
       setSelectedRequest(request);
       setIsPaymentModalOpen(true);
   };
   
   const handleDownloadReceipt = async (requestId) => {
       setDownloadingId(requestId);
       try {
           await vacationService.downloadReceiptPdf(requestId);
       } catch (error) {
           // Mostrar toast de error
       } finally {
           setDownloadingId(null);
       }
   };
   ```

## TAREA 5: Actualizar Simulación en VacationManager

**Archivo**: `src/features/vacations/VacationManager.jsx`

Encontrar la sección de visualización de simulación (alrededor de línea 616-660) y mejorar:

**Visualización actual**: Solo muestra monto de vacaciones y monto de bono.

**Nueva visualización**: Mostrar 4 cajas en una grilla:
1. Días Hábiles (vacation_amount, vacation_days)
2. Días Descanso (rest_amount, rest_days) 
3. Días Feriados (holiday_amount, holiday_days)
4. Bono Vacacional (bonus_amount, bonus_days)

Agregar sección colapsable de deducciones debajo.

Agregar comparación bruto vs neto al final.

**Manejar compatibilidad hacia atrás**: Si la simulación no tiene rest_days/holiday_days (backend antiguo), usar 0 por defecto.

## TAREA 6: Exportar Componentes

**Archivo**: `src/features/vacations/index.js`

Agregar exports:
```javascript
export { default as VacationPaymentModal } from './VacationPaymentModal';
export { default as VacationPaymentPreview } from './VacationPaymentPreview';
```

## CRITERIOS DE VALIDACIÓN

1. ✅ Botón "Procesar Pago" aparece solo para solicitudes APPROVED
2. ✅ Botón "Descargar Recibo" aparece solo para solicitudes PROCESSED
3. ✅ Modal muestra estado de carga mientras obtiene simulación
4. ✅ Vista previa muestra los 4 tipos de devengados con formato correcto
5. ✅ PDF se descarga con nombre de archivo correcto
6. ✅ Después de procesar, la lista se actualiza para mostrar estado actualizado
7. ✅ Visualización de simulación muestra rest_days y holiday_days (o 0 si faltan)

## PATRONES DE UI A SEGUIR

Usar patrones existentes del proyecto de:
- `src/components/ui/Card.jsx` para layouts de tarjetas
- `src/components/ui/Button.jsx` para botones
- `src/components/ui/Modal.jsx` para modales
- `src/utils/cn.js` para combinar classNames
- `formatCurrency()` de vacationUtils para mostrar dinero

## FORMATO DE MONEDA

Usar `formatCurrency` existente o implementar:
```javascript
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount || 0);
};
```

## NO HACER

- Instalar nuevas dependencias (usar paquetes existentes del proyecto)
- Modificar archivos fuera de src/features/vacations y src/services
- Eliminar funcionalidad existente
- Romper compatibilidad hacia atrás con endpoint de simulación actual
