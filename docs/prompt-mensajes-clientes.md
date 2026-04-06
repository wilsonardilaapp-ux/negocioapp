# 🧠 PROMPT PARA IA – Módulo de Bandeja de Entrada del Cliente (Dashboard)

### Stack: **React (Next.js) + TypeScript + Firebase + Shadcn UI**

> Actúa como un **desarrollador senior Full Stack** con experiencia en la creación de aplicaciones SaaS multi-inquilino. Tu objetivo es implementar una **Bandeja de Entrada** para el panel del **Administrador de Negocio (cliente SaaS)**, donde se centralicen los mensajes provenientes de los formularios de contacto de su landing page pública.

---

## 🎯 Objetivo General

Implementar una página en `/dashboard/mensajes-clientes` que funcione como una bandeja de entrada para el negocio, permitiendo al administrador leer, gestionar y eliminar los mensajes recibidos desde su formulario de contacto público.

---

## 1. Modelo de Datos y Firestore

Utiliza la interfaz `ContactSubmission` ya existente en `models/contact-submission.ts`.

**Colección de Origen:**
*   `/businesses/{businessId}/contactSubmissions/{submissionId}`: Los mensajes para un negocio específico se almacenan en esta subcolección. El `{businessId}` corresponde al ID del usuario/negocio autenticado.

---

## 2. Implementación Frontend (`/dashboard/mensajes-clientes`)

Crea la estructura de archivos necesaria dentro de la ruta `/dashboard/mensajes-clientes`:
*   `page.tsx`: Componente principal que obtiene los datos y renderiza la tabla.
*   `columns.tsx`: Define las columnas para la tabla de mensajes.
*   `data-table.tsx`: Componente reutilizable que renderiza la tabla de datos.

### `page.tsx` (Página Principal)

*   **Hook de Datos:** Usa el hook `useCollection` para obtener en tiempo real los mensajes de la subcolección `contactSubmissions` del usuario actual, ordenados por fecha (`date`) de forma descendente.
*   **Gestión de Estado:** Maneja los estados de carga (`isLoading`).
*   **Función de Eliminación:** Implementa la función `handleDeleteSubmission(submissionId)` que interactúe con Firestore (usando `deleteDocumentNonBlocking`) para eliminar un mensaje específico y pásala como prop a `columns`.
*   **Renderizado:** Renderiza el componente `DataTable` pasándole las columnas y los datos.

### `columns.tsx` (Definición de Columnas)

Define las siguientes columnas para la tabla (`@tanstack/react-table`):

1.  **Remitente (`sender`):** Muestra el nombre del remitente del mensaje.

2.  **Mensaje (`message`):** Muestra un extracto del cuerpo del mensaje. Debe truncar el texto si es muy largo para no romper el layout de la tabla.

3.  **Fecha (`date`):** Muestra la fecha en un formato legible (ej. `dd/MM/yyyy HH:mm`).

4.  **Acciones:**
    *   Un `DropdownMenu` (`MoreHorizontal`) por cada fila.
    *   **Ver Mensaje:**
        *   Debe abrir un `Dialog` que muestre toda la información del mensaje (Nombre, Email, WhatsApp (si existe), Asunto, Cuerpo completo, Fecha).
    *   **Eliminar:**
        *   Debe mostrar un `AlertDialog` de confirmación antes de llamar a la función `handleDeleteSubmission` para eliminar el documento de Firestore.

### `data-table.tsx` (Componente de Tabla)

*   Un componente genérico que renderiza la tabla usando los componentes de `Table` de Shadcn UI.
*   Debe mostrar un estado de carga (`Loader2` animado) mientras `isLoading` es `true`.
*   Debe mostrar un estado vacío (con un icono de `Inbox` y un mensaje como "No hay mensajes recibidos") si no hay datos.

---

## 📦 Devuelve

*   El código completo y final para los archivos `page.tsx`, `columns.tsx` y `data-table.tsx` dentro de la ruta `/dashboard/mensajes-clientes`.
*   Asegúrate de que el código sea robusto, siga las mejores prácticas de React y TypeScript, y no contenga errores de compilación ni de tipado.
