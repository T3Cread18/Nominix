# 📚 Documentación Nóminix Suite

> Índice central de documentación técnica del sistema de gestión de nómina y recursos humanos.
> **Versión:** 2.0.0 | **Última Actualización:** Enero 2026

---

## 📖 Documentos Principales

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [📘 PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) | Vista general del sistema y guía rápida | Todos |
| [🏗️ ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitectura, stack tecnológico, flujos | Arquitectos, DevOps |
| [⚙️ PAYROLL_ENGINE.md](./PAYROLL_ENGINE.md) | Motor de nómina, fórmulas, variables | Desarrolladores |
| [📊 SOCIAL_BENEFITS.md](./SOCIAL_BENEFITS.md) | Prestaciones Sociales (LOTTT Art. 142) | RRHH, Desarrolladores |
| [💰 SALARY_ENGINEERING.md](./SALARY_ENGINEERING.md) | Ingeniería Salarial, SalarySplitter | RRHH, Configuradores |
| [🗃️ DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Modelos, relaciones, esquema ER | Desarrolladores, DBAs |

---

## 🔌 Documentación de API

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [API_DEVELOPER_GUIDE.md](./API_DEVELOPER_GUIDE.md) | Guía de integración, autenticación, ejemplos | Integradores |
| [openapi.yaml](./openapi.yaml) | Especificación OpenAPI 3.0 | Integradores |

---

## 🎨 Documentación Frontend

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [hooks.md](./hooks.md) | Referencia de React Query hooks | Frontend Devs |
| [ui_components.md](./ui_components.md) | Sistema de diseño y componentes | Frontend Devs, Diseñadores |

---

## 📋 Documentación de Tenants

| Documento | Descripción |
|-----------|-------------|
| [tenants/README.md](./tenants/README.md) | Índice de tenants registrados |
| [tenants/public.md](./tenants/public.md) | Tenant público (sistema) |
| [tenants/*.md](./tenants/) | Documentación por tenant |

---

## 🗂️ Estructura de Archivos

```
docs/
├── README.md                    # Este índice
├── PROJECT_DOCUMENTATION.md     # Documento principal (Hub)
├── ARCHITECTURE.md              # Arquitectura del sistema
├── PAYROLL_ENGINE.md            # Motor de nómina
├── SOCIAL_BENEFITS.md           # Prestaciones Sociales
├── SALARY_ENGINEERING.md        # Ingeniería Salarial
├── DATABASE_SCHEMA.md           # Esquema de base de datos
├── API_DEVELOPER_GUIDE.md       # Guía de API
├── openapi.yaml                 # OpenAPI 3.0 spec
├── hooks.md                     # React Query hooks
├── ui_components.md             # Componentes UI
└── tenants/                     # Documentación de tenants
    ├── README.md
    ├── public.md
    └── [schema_name].md
```

---

## 🚀 Guía de Inicio Rápido

### Para Desarrolladores Backend

1. Leer [ARCHITECTURE.md](./ARCHITECTURE.md) para entender la estructura
2. Revisar [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) para los modelos
3. Estudiar [PAYROLL_ENGINE.md](./PAYROLL_ENGINE.md) para la lógica de nómina
4. Consultar [SOCIAL_BENEFITS.md](./SOCIAL_BENEFITS.md) para prestaciones

### Para Desarrolladores Frontend

1. Revisar [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) para contexto
2. Estudiar [hooks.md](./hooks.md) para manejo de datos
3. Consultar [ui_components.md](./ui_components.md) para la UI
4. Ver [API_DEVELOPER_GUIDE.md](./API_DEVELOPER_GUIDE.md) para endpoints

### Para Integradores

1. Leer [API_DEVELOPER_GUIDE.md](./API_DEVELOPER_GUIDE.md) completo
2. Importar [openapi.yaml](./openapi.yaml) en Postman/Insomnia
3. Revisar autenticación y ejemplos cURL

### Para RRHH / Configuradores

1. Leer [SALARY_ENGINEERING.md](./SALARY_ENGINEERING.md) para estrategias salariales
2. Revisar [SOCIAL_BENEFITS.md](./SOCIAL_BENEFITS.md) para cumplimiento LOTTT
3. Consultar [PAYROLL_ENGINE.md](./PAYROLL_ENGINE.md) para fórmulas

---

## 📝 Convenciones de Documentación

### Formato

- **Markdown** con soporte para GitHub Flavored Markdown
- **Mermaid** para diagramas
- **Alertas GitHub** para notas importantes

### Alertas Utilizadas

> [!NOTE]
> Información complementaria o contexto adicional.

> [!TIP]
> Sugerencias de mejores prácticas o atajos.

> [!IMPORTANT]
> Información crítica que debe conocerse.

> [!WARNING]
> Advertencias sobre posibles problemas.

> [!CAUTION]
> Acciones que pueden causar pérdida de datos o errores graves.

---

## 🔄 Regenerar Documentación

### Documentación de Tenants

```powershell
$env:PGCLIENTENCODING='UTF8'
python generate_tenant_docs.py
```

### OpenAPI Spec

La especificación OpenAPI se mantiene manualmente en `openapi.yaml`.

---

## 📞 Contribuir

Para actualizar la documentación:

1. Editar el archivo `.md` correspondiente
2. Actualizar la fecha de "Última Actualización"
3. Si es un documento nuevo, agregarlo a este índice
4. Commit con mensaje descriptivo

---

*© 2026 NÓMINIX Suite — Documentación V2.0.0*
