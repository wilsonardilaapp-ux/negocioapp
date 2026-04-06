# 🧠 PROMPT PARA IA – Módulo de Bandeja de Entrada de Notificaciones (Cliente SaaS)

### Stack: **React (Next.js) + TypeScript + Firebase + Shadcn UI**

> Actúa como un **desarrollador senior Full Stack** con experiencia en la creación de aplicaciones SaaS multi-inquilino. Tu objetivo es implementar una **Bandeja de Entrada de Notificaciones** para el panel del **Administrador de Negocio (cliente SaaS)**, donde pueda ver los mensajes enviados por el Super Administrador de la plataforma.

---

## 🎯 Objetivo General

Implementar una página en `/dashboard/messages` que funcione como una bandeja de entrada para el cliente, permitiéndole leer, gestionar y responder a las notificaciones y recordatorios enviados por el Super Administrador.

---

## 1. Modelo de Datos y Firestore

*   **Interfaz de Origen:** `AdminNotification` de `models/notification.ts`.
*   **Colección de Origen:** `/businesses/{businessId}/notifications/{notificationId}`. El `businessId` corresponde al ID del usuario/negocio autenticado.
*   **Interfaz de Destino (para respuestas):** `ContactMessage` de `models/notification.ts`.
*   **Colección de Destino (para respuestas):** `/contactMessages/{messageId}`.

---

## 2. Implementación Frontend (`/dashboard/messages`)

Crea la estructura de archivos necesaria dentro de la ruta `/dashboard/messages`:
*   `page.tsx`: Componente principal que obtiene los datos y renderiza la lista de mensajes.
*   `components/MessageList.tsx`: Componente que renderiza la lista de notificaciones con toda la lógica de UI.

### `page.tsx` (Página Principal)

*   **Hook de Datos:** Usa el hook `useCollection` para obtener en tiempo real las notificaciones de la subcolección `notifications` del usuario/negocio actual, ordenadas por fecha de creación (`createdAt`) de forma descendente.
*   **Renderizado:** Renderiza el componente `MessageList`, pasándole los datos de notificaciones y el estado de carga (`isLoading`).

### `components/MessageList.tsx` (Componente de Lista y Detalle)

Este componente manejará toda la interactividad.

*   **Estado Local:**
    *   Gestiona el filtro actual (`'all'`, `'unread'`, `'payment_reminder'`).
    *   Gestiona el término de búsqueda.
    *   Gestiona la notificación actualmente seleccionada para ver en detalle.
    *   Gestiona el estado de apertura del modal de respuesta.
    *   Gestiona los IDs de los mensajes seleccionados para acciones en lote.
*   **Barra de Herramientas:**
    *   Un `Input` de búsqueda para filtrar mensajes por asunto o contenido.
    *   Botones de `Filtro` ("Todos", "No Leídos", "Recordatorios"). El botón "No Leídos" debe mostrar un `Badge` con la cantidad de mensajes sin leer.
    *   Una barra de acciones en lote que aparece cuando se seleccionan mensajes, con un botón para "Eliminar seleccionados".
*   **Lista de Mensajes:**
    *   Renderiza una lista de notificaciones. Cada item debe tener una `Checkbox` para selección.
    *   Cada item debe mostrar el asunto, un extracto del cuerpo, la fecha (`formatDistanceToNow`) y un indicador visual (ej. punto azul) si no está leído.
    *   Al hacer clic en un item, se debe abrir un `Dialog` con el detalle y marcar la notificación como `read: true` en Firestore de forma no bloqueante (`updateDocumentNonBlocking`).
*   **`Dialog` de Detalle del Mensaje:**
    *   Muestra el asunto y el cuerpo completo del mensaje (renderizando el HTML del cuerpo de forma segura).
    *   Muestra la fecha de envío.
    *   Debe incluir un botón "Responder", que abre el `Dialog` de respuesta (`ReplyForm`).
*   **`Dialog` de Respuesta (`ReplyForm` - puede ser un subcomponente):**
    *   Un formulario con un `Textarea` para escribir el mensaje de respuesta.
    *   Al enviar, debe crear un nuevo documento `ContactMessage` en la colección global `/contactMessages`.
    *   El nuevo documento debe tener `source: 'client_reply'` y el `userId` del cliente actual.
    *   Debe mostrar un `toast` de confirmación.
*   **Acciones en Lote:**
    *   Implementa `handleDeleteSelected` que use un `writeBatch` de Firestore para eliminar los documentos seleccionados de la subcolección de notificaciones del cliente.

---

## 📦 Devuelve

*   El código completo y final para los archivos `page.tsx` y `components/MessageList.tsx` dentro de la ruta `/dashboard/messages`.
*   Asegúrate de que el código sea robusto, siga las mejores prácticas de React y TypeScript, y no contenga errores de compilación ni de tipado.
