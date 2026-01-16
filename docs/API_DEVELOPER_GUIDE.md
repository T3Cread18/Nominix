# 🚀 Guía del Desarrollador (API Nóminix)

Bienvenido a la referencia técnica para integraciones competitivas con Nóminix. Esta guía detalla cómo interactuar con nuestro backend multi-tenant.

---

## 🔐 Autenticación y Seguridad

Nóminix utiliza una arquitectura de **esquemas aislados**. La identificación de la empresa se realiza mediante el **subdominio** de la petición.

### 1. El Flujo de Conexión
Toda petición debe dirigirse al subdominio del cliente (ej. `empresa-abc.nominix.com.ve`).

### 2. Login de Usuario
Nóminix utiliza autenticación basada en sesiones (Session Cookies).

**Ejemplo con cURL:**
```bash
curl -X POST https://tu-empresa.nominix.com.ve/api/auth/login/ \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "tu_password"}' \
     -c cookies.txt
```

> [!IMPORTANT]
> Para métodos de escritura (POST, PUT, DELETE), Django requiere el envío de la cabecera `X-CSRFToken` que se obtiene de la cookie `csrftoken`.

---

## 📈 Casos de Uso Comunes

### A. Simular un Recibo de Pago
Permite proyectar cálculos antes de cerrar la nómina.
```bash
curl -X POST https://tu-empresa.nominix.com.ve/api/employees/123/simulate-payslip/ \
     -b cookies.txt \
     -H "Content-Type: application/json" \
     -d '{"OVERTIME_HOURS": 10, "BONO_PRODUCTIVIDAD": 50.00}'
```

### B. Obtener Tasa BCV Oficial
```bash
curl -G https://tu-empresa.nominix.com.ve/api/exchange-rates/latest/ \
     -d "currency=USD"
```

---

## ⚠️ Manejo de Errores

Nóminix utiliza códigos HTTP estándar:

| Código | Razón | Solución |
|:--- |:--- |:--- |
| `401` | No Autenticado | Verifique que las cookies de sesión se envíen correctamente. |
| `403` | Permiso Denegado | El usuario no tiene permisos sobre este tenant/objeto. |
| `400` | Error de Validación | Revise el cuerpo del JSON. Se detallan los campos fallidos. |
| `404` | No Encontrado | Recurso inexistente o dominio mal especificado. |

---

## 📦 SDK de Ejemplo (JavaScript/Axios)

Recomendamos configurar una instancia de Axios centralizada:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: `https://${window.location.hostname}/api`,
  withCredentials: true,
});

// Middleware para CSRF
api.interceptors.request.use(config => {
  const token = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
  if (token) config.headers['X-CSRFToken'] = token;
  return config;
});

export const getEmployeeSim = (id, novelties) => 
  api.post(`/employees/${id}/simulate-payslip/`, novelties);
```

---

## 📚 Especificación Completa
Puede importar el archivo [openapi.yaml](./openapi.yaml) en herramientas como Swagger Editor, Postman o Insomnia para explorar todos los endpoints disponibles.

---

© 2026 NÓMINIX - API Engineering Team.
