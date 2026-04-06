# 🧠 PROMPT PARA IA – Módulo de Contacto a Soporte (Dashboard del Cliente)

### Stack: **React (Next.js) + TypeScript + Firebase + Shadcn UI**

> Actúa como un **desarrollador senior Full Stack** con experiencia en la creación de aplicaciones SaaS multi-inquilino. Tu objetivo es implementar una página de **Contacto a Soporte** dentro del panel del **Administrador de Negocio (cliente SaaS)**, permitiéndole enviar mensajes directamente al equipo de soporte de la plataforma.

---

## 🎯 Objetivo General

Implementar una página en `/dashboard/contacto` que funcione como un formulario de contacto para que los clientes puedan reportar problemas, hacer preguntas o solicitar ayuda al Super Administrador de la plataforma.

---

## 1. Modelo de Datos y Firestore

*   **Interfaz de Destino:** `ContactMessage` de `models/notification.ts`.
*   **Colección de Destino:** `/contactMessages/{messageId}`. Esta es la bandeja de entrada global del Super Administrador.

---

## 2. Implementación Frontend (`/dashboard/contacto`)

Crea el archivo `page.tsx` dentro de la ruta `/dashboard/contacto`.

### `page.tsx` (Página Principal)

*   **Hook de Autenticación:** Usa el hook `useUser` para obtener los datos del usuario autenticado (`user`, `profile`).
*   **Formulario:**
    *   Utiliza `react-hook-form` y `zod` para la validación del formulario.
    *   El formulario debe estar dentro de un componente `Card`.
    *   Debe mostrar los campos **"Tu Nombre"** y **"Tu Correo"** como `Input` de solo lectura, pre-llenados con `profile.name` y `user.email`.
    *   Incluye un campo de `Input` para el **"Asunto"** del mensaje (requerido).
    *   Incluye un `Textarea` para el **"Mensaje"** (requerido, con un mínimo de 10 caracteres).
*   **Lógica de Envío:**
    *   Al enviar el formulario, se debe crear un nuevo objeto que cumpla con la interfaz `ContactMessage`.
    *   El objeto debe tener los siguientes valores:
        *   `name`: El nombre del perfil del usuario.
        *   `email`: El email del usuario.
        *   `subject`: El asunto del formulario.
        *   `body`: El cuerpo del mensaje del formulario.
        *   `read`: `false`.
        *   `replied`: `false`.
        *   `createdAt`: La fecha actual en formato ISO.
        *   `source`: `'client_contact'` para identificar que viene del panel del cliente.
        *   `userId`: El `uid` del usuario que envía el mensaje.
    *   Utiliza la función `addDocumentNonBlocking` para guardar el nuevo documento en la colección `/contactMessages` de Firestore.
    *   Muestra un `toast` de confirmación de "Mensaje Enviado" al finalizar con éxito.
    *   Muestra un `toast` de error si falla el envío.
    *   El botón de envío debe mostrar un estado de carga (`Loader2` animado) mientras se procesa la solicitud.

---

## 📦 Devuelve

*   El código completo y final para el archivo `page.tsx` dentro de la ruta `/dashboard/contacto`.
*   Asegúrate de que el código sea robusto, siga las mejores prácticas de React y TypeScript, y no contenga errores de compilación ni de tipado.
