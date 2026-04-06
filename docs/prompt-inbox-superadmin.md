# 🧠 PROMPT PARA IA – Módulo de Bandeja de Entrada Global (Super Admin)

### Stack: **React (Next.js) + TypeScript + Firebase + Shadcn UI**

> Actúa como un **desarrollador senior Full Stack** con experiencia en la creación de aplicaciones SaaS multi-inquilino. Tu objetivo es implementar una **Bandeja de Entrada Global** para el panel del **Super Administrador**, donde se centralicen todos los mensajes provenientes de los clientes y los formularios de contacto públicos.

---

## 🎯 Objetivo General

Implementar una página en `/superadmin/contacto` que funcione como una bandeja de entrada centralizada, permitiendo al Super Administrador leer, gestionar y eliminar los mensajes recibidos desde diversas fuentes.

---

## 1. Modelo de Datos y Firestore

Utiliza la interfaz `ContactMessage` ya existente en `models/notification.ts`.

**Colección de Origen:**
*   `/contactMessages/{messageId}`: Todos los mensajes, sin importar su origen (formulario público, respuesta de cliente, etc.), se almacenan en esta colección principal.

---

## 2. Implementación Frontend (`/superadmin/contacto`)

Crea la estructura de archivos necesaria dentro de la ruta `/superadmin/contacto`:
*   `page.tsx`: Componente principal que obtiene los datos y renderiza la tabla.
*   `columns.tsx`: Define las columnas para la tabla de mensajes.
*   `data-table.tsx`: Componente reutilizable que renderiza la tabla.

### `page.tsx` (Página Principal)

*   **Hook de Datos:** Usa el hook `useCollection` para obtener en tiempo real los mensajes de la colección `contactMessages`, ordenados por fecha de creación (`createdAt`) de forma descendente.
*   **Gestión de Estado:** Maneja los estados de carga (`isLoading`).
*   **Funciones de Acción:** Implementa las funciones `handleDeleteMessage` y `handleUpdateMessage` que interactúen con Firestore (usando `deleteDocumentNonBlocking` y `updateDocumentNonBlocking`) y pasarlas como props a `columns`.
*   **Renderizado:** Renderiza el componente `DataTable` pasándole las columnas y los datos.

### `columns.tsx` (Definición de Columnas)

Define las siguientes columnas para la tabla (`@tanstack/react-table`):

1.  **Estado:**
    *   Un indicador visual (ej. un círculo azul `🔵`) si `message.read === false`.
    *   Un icono de respuesta (ej. `CornerDownRight` de `lucide-react`) si `message.replied === true`.
    *   Usa `Tooltip` para mostrar "No leído" o "Respondido" al pasar el cursor.

2.  **Remitente (`sender`):** Muestra el nombre del remitente.

3.  **Asunto (`subject`):** Muestra el asunto del mensaje. Trunca el texto si es muy largo.

4.  **Fecha (`createdAt`):** Muestra la fecha en formato `dd/MM/yyyy`.

5.  **Origen (`source`):**
    *   Usa un componente `Badge` de Shadcn.
    *   Muestra un texto y color diferente según el valor de `source`:
        *   `webform` -> "Formulario Web" (variante `secondary`)
        *   `client_reply` -> "Respuesta de Cliente" (variante `default`)
        *   `client_contact` -> "Panel de Cliente" (variante `outline`)

6.  **Acciones:**
    *   Un `DropdownMenu` (`MoreHorizontal`) por cada fila.
    *   **Ver Mensaje:**
        *   Abre un `Dialog` que muestra toda la información del mensaje (Nombre, Email, WhatsApp, Asunto, Cuerpo, Fecha).
        *   **Importante:** Al abrir el `Dialog` para ver un mensaje, debe llamar a la función `handleUpdateMessage` para marcarlo como `read: true`.
    *   **Marcar como Respondido/No Respondido:**
        *   Una opción que cambia el estado booleano de `replied` en Firestore.
    *   **Eliminar:**
        *   Debe mostrar un `AlertDialog` de confirmación antes de llamar a `handleDeleteMessage` para eliminar el documento.

### `data-table.tsx` (Componente de Tabla)

*   Un componente genérico que renderiza la tabla usando los componentes de `Table` de Shadcn UI.
*   Debe mostrar un estado de carga (`Loader2` animado) mientras `isLoading` es `true`.
*   Debe mostrar un estado vacío (con un icono de `Inbox` y un mensaje) si no hay datos.

---

## 📦 Devuelve

*   El código completo y final para los archivos `page.tsx`, `columns.tsx` y `data-table.tsx` dentro de la ruta `/superadmin/contacto`.
*   Asegúrate de que el código sea robusto, siga las mejores prácticas de React y TypeScript, y no contenga errores de compilación ni de tipado.
