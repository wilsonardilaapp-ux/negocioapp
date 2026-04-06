# 🧠 PROMPT PARA IA – Módulo de Notificaciones y Mensajería (SaaS Multi-inquilino)

### Stack: **React (Next.js) + TypeScript + Firebase + Shadcn UI**

> Actúa como un **desarrollador senior Full Stack** con experiencia en la creación de aplicaciones SaaS multi-inquilino complejas. Tu objetivo es implementar un **Centro de Notificaciones y Mensajería** completo y robusto. El sistema debe tener dos interfaces principales: una para el **Super Administrador** (control total) y otra para el **Administrador del Negocio** (cliente del SaaS).

---

## 🎯 Objetivo General

Implementar un sistema de comunicación bidireccional que permita:
1.  **A los administradores de negocios (clientes SaaS):** Recibir notificaciones del Super Admin y responderlas.
2.  **Al Super Administrador:** Enviar notificaciones masivas o individuales, recibir y gestionar mensajes de los formularios de contacto, y administrar recordatorios de pago.

---

## 1. Modelo de Datos y Firestore (`models/notification.ts`)

Asegúrate de que estas interfaces estén bien definidas y se usen en todo el código.

```typescript
// Define el tipo de una notificación, que puede ser general, un recordatorio, etc.
export type NotificationType = 'general' | 'payment_reminder' | 'promotion' | 'alert';

// Interfaz para notificaciones enviadas POR el Super Admin A un negocio.
export interface AdminNotification {
  id: string;
  fromSuperAdmin: boolean; // Siempre true para este tipo
  subject: string;
  body: string;
  read: boolean;
  createdAt: string; // ISO String
  type: NotificationType;
}

// Interfaz para mensajes que llegan A la bandeja de entrada del Super Admin.
export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    whatsapp?: string;
    subject: string;
    body: string;
    read: boolean;
    replied: boolean;
    createdAt: string; // ISO String
    // Indica el origen del mensaje para poder filtrarlo o tratarlo de forma diferente.
    source: 'webform' | 'client_reply' | 'admin_form' | 'client_contact';
    userId?: string; // ID del negocio/usuario que envía (si está autenticado)
}

// Interfaz para recordatorios de pago programados.
export interface ScheduledReminder {
  id: string;
  clientId: string; // ID del negocio
  clientName: string;
  scheduledDate: string; // ISO String
  channel: "panel" | "whatsapp" | "both";
  message: string;
  status: "pending" | "sent" | "failed";
  createdAt: string; // ISO String
  sentAt: string | null; // ISO String
}
```

### Estructura de Firestore

*   **Notificaciones a Clientes:** `/businesses/{businessId}/notifications/{notificationId}` (Usa la interfaz `AdminNotification`)
*   **Mensajes al Super Admin:** `/contactMessages/{messageId}` (Usa la interfaz `ContactMessage`)
*   **Recordatorios Programados:** `/businesses/{businessId}/reminders/{reminderId}` (Usa la interfaz `ScheduledReminder`)

---

## 2. Lógica de Backend (`actions/notifications.ts`)

Crea una Server Action para que el Super Admin envíe notificaciones.

### `sendAdminNotification(args: SendNotificationArgs)`

*   **Argumentos:** `{ recipients: string[], subject: string, body: string }`
*   **Lógica:**
    *   Recibe un array de `businessId` (los destinatarios).
    *   Usa un `writeBatch` de Firestore para crear un nuevo documento en la subcolección `/notifications` de cada `businessId` destinatario.
    *   El documento debe cumplir con la interfaz `AdminNotification`.
    *   Debe manejar errores de forma robusta y devolver `{ success: true }` o `{ success: false, error: '...' }`.

---

## 3. Implementación Frontend

### a) Panel del Cliente (`/dashboard/messages`)

Esta página es la **bandeja de entrada del cliente**, donde ve los mensajes del Super Admin.

*   **`page.tsx`**:
    *   Debe obtener y mostrar la lista de `AdminNotification` desde `/businesses/{user.uid}/notifications`.
    *   Usa un componente `MessageList` para renderizar los mensajes.
*   **`components/MessageList.tsx`**:
    *   Muestra cada notificación con su asunto, un extracto del cuerpo y la fecha.
    *   Los mensajes no leídos deben tener un indicador visual.
    *   Al hacer clic en un mensaje, debe abrir un `Dialog` con el detalle completo y marcar el mensaje como `read: true` en Firestore de forma no bloqueante.
    *   Debe incluir filtros para ver "Todos", "No Leídos" y "Recordatorios".
    *   Debe tener una función de búsqueda.
    *   Debe incluir un sistema de selección múltiple con checkboxes para eliminar mensajes en lote (`handleDeleteSelected`).
    *   El `Dialog` de detalle debe tener un botón "Responder", que abre otro `Dialog` (`ReplyForm`). Al enviar la respuesta, se debe crear un nuevo documento `ContactMessage` en la colección `/contactMessages` del Super Admin, con `source: 'client_reply'`.

### b) Panel del Super Administrador (`/superadmin/notifications`)

Esta página es el **centro de control total** y debe usar `Tabs` de Shadcn.

*   **`page.tsx`**:
    *   Componente principal que renderiza la estructura de `Tabs` con las siguientes pestañas: "Mensajes Entrantes", "Enviar Notificación" y "Recordatorios de Pago".
*   **Pestaña 1: "Mensajes Entrantes" (`components/InboxTab.tsx`)**:
    *   Idéntica en funcionalidad a la bandeja de entrada del cliente, pero lee los datos de la colección principal `/contactMessages`.
    *   Debe mostrar y permitir filtrar por `source` para saber de dónde vino el mensaje.
    *   La acción "Responder" debe enviar una `AdminNotification` de vuelta al `userId` (negocio) que originó el mensaje (si existe).
*   **Pestaña 2: "Enviar Notificación" (`components/SendNotificationTab.tsx`)**:
    *   Un formulario de dos columnas.
    *   **Columna 1 (Selección):** Muestra una lista de todos los negocios (`businesses`) con checkboxes para seleccionar los destinatarios. Debe haber una opción para "Seleccionar Todos".
    *   **Columna 2 (Mensaje):** Campos para "Asunto" y un `RichTextEditor` para el "Cuerpo del Mensaje".
    *   Un botón "Enviar Notificación" que llama a la Server Action `sendAdminNotification` con los datos del formulario.
*   **Pestaña 3: "Recordatorios de Pago" (`components/PaymentRemindersTab.tsx`)**:
    *   **Tabla de Clientes Manuales:** Muestra una lista de clientes con suscripciones de pago manual (no Stripe). Para cada uno, debe mostrar el estado del pago ("Al día", "Por vencer", "Vencido") y un botón para "Enviar Recordatorio Manual".
    *   **Tabla de Recordatorios Programados:** Muestra una lista de todos los recordatorios programados (`ScheduledReminder`) para todos los negocios. Debe permitir "Editar" o "Eliminar" un recordatorio.
    *   **Botón "Programar Recordatorio":** Abre un `Dialog` (`ScheduleReminderModal`) que permite seleccionar un cliente, una fecha/hora de envío, el canal (Panel, WhatsApp o ambos) y personalizar el mensaje. El mensaje debe soportar variables como `{nombre}`, `{plan}`, `{monto}`, etc.
    *   **Lógica Automática (Concepto):** Implementa un `useEffect` que detecte los recordatorios cuya `scheduledDate` ya pasó y cuyo `status` es 'pending'. Este `useEffect` deberá simular el envío (marcando el estado como 'sent' y mostrando un `toast`).

---

## 📦 Devuelve

*   El código completo y final para cada archivo creado o modificado, siguiendo estrictamente todas las reglas de preservación de código.
*   Asegúrate de que la implementación sea robusta, segura y esté lista para producción.
*   No incluyas comentarios innecesarios, solo el código funcional.
