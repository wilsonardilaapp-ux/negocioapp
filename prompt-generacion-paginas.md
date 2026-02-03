
# Prompt para IA Generativa de Código

**Rol:** Actúa como un desarrollador experto en Next.js, TypeScript y Firebase.

**Objetivo General:** Implementar tres páginas de administración para un panel de "Super Admin" dentro de una aplicación SaaS existente. Estas páginas gestionarán "Servicios", "Módulos" e "Integraciones". El código debe ser de calidad de producción, estrictamente tipado (TypeScript `strict: true`), y seguir la arquitectura y estilo existentes.

**Stack Tecnológico y Guías:**

*   **Framework:** Next.js 14+ con App Router.
*   **Lenguaje:** TypeScript (modo estricto).
*   **Base de Datos:** Firebase Firestore. Utiliza los hooks personalizados `useCollection`, `useDoc`, y las funciones `setDocumentNonBlocking`, `updateDocumentNonBlocking`, `deleteDocumentNonBlocking` que ya existen en el proyecto para todas las interacciones con la base de datos.
*   **UI:** Componentes de Shadcn UI (`Card`, `Button`, `Dialog`, `Switch`, `Input`, `Label`, `Badge`, `Table`, `DropdownMenu`, etc.).
*   **Iconos:** `lucide-react`.
*   **Validación de Formularios:** Zod y React Hook Form.
*   **Notificaciones:** Utiliza el hook `useToast` para feedback al usuario.

---

### **Instrucciones Detalladas por Página**

#### **Página 1: Gestión de Servicios del Sistema**

*   **Ruta:** `/superadmin/servicios`
*   **Modelo de Datos (`SystemService`):**
    ```typescript
    type SystemService = {
      id: string;
      name: string;
      status: 'active' | 'inactive';
      limit: number;
      lastUpdate: string; // ISO 8601 date string
    };
    ```
*   **Funcionalidad:**
    1.  **Listar Servicios:**
        *   Obtén todos los documentos de la colección `systemServices` de Firestore.
        *   Muestra cada servicio en un componente `Card`.
        *   Dentro de cada `Card`, muestra el `name`, `lastUpdate` y un `Badge` para el `status` ('Activo' o 'Inactivo').
    2.  **Control de Estado y Límite:**
        *   Añade un componente `Switch` para cambiar el `status` del servicio. La actualización en Firestore debe ser inmediata y no bloqueante.
        *   Añade un `Slider` para ajustar el `limit` del servicio. La actualización debe ser inmediata.
    3.  **Añadir Nuevo Servicio:**
        *   Implementa un `Button` principal en la página ("Añadir Servicio") que abra un `Dialog`.
        *   El `Dialog` debe contener un formulario para crear un nuevo servicio con campos para `name` y `limit`.
        *   El ID del nuevo documento debe generarse a partir del `name` (en minúsculas y reemplazando espacios por guiones).
    4.  **Eliminar Servicio:**
        *   En cada `Card`, añade un botón de "Eliminar".
        *   Al hacer clic, muestra un `AlertDialog` de confirmación antes de eliminar el documento de Firestore.
    5.  **UX:** Muestra un estado de carga (`Loader2`) mientras se obtienen los datos. Si no hay servicios, muestra un mensaje amigable con un icono.

---

#### **Página 2: Gestión de Módulos de la Plataforma**

*   **Ruta:** `/superadmin/modulos`
*   **Modelo de Datos (`Module`):**
    ```typescript
    type Module = {
      id: string;
      name: string;
      description: string;
      status: 'active' | 'inactive';
      createdAt: string; // ISO 8601 date string
      limit?: number; // Límite opcional
    };
    ```
*   **Funcionalidad:**
    1.  **Listar Módulos:**
        *   Obtén todos los documentos de la colección `modules` de Firestore.
        *   Muestra cada módulo en una `Card` individual.
        *   La `Card` debe mostrar `name`, `description`, y un `Badge` para el `status`.
    2.  **Añadir y Editar Módulos:**
        *   Implementa un `Dialog` que sirva tanto para crear como para editar módulos.
        *   El formulario (usando Zod y React Hook Form) debe tener campos para `name`, `description` y `limit`.
        *   Un botón "Añadir Módulo" en la página abre el `Dialog` en modo de creación.
        *   Un botón "Configurar" en cada `Card` de módulo abre el `Dialog` en modo de edición, pre-cargando los datos existentes.
    3.  **Control de Estado y Eliminación:**
        *   Añade un `Switch` en cada `Card` para activar o desactivar el `status` del módulo.
        *   Añade un botón "Eliminar Módulo" con un `AlertDialog` de confirmación.
    4.  **UX:** Maneja los estados de carga y vacío de manera similar a la página de Servicios.

---

#### **Página 3: Gestión de Integraciones**

*   **Ruta:** `/superadmin/integraciones`
*   **Modelo de Datos (`Integration`):**
    ```typescript
    type Integration = {
      id: string;
      name: string;
      fields: string; // JSON string con las credenciales
      status: 'active' | 'inactive';
    };
    ```
*   **Funcionalidad:**
    1.  **Listar Integraciones Predeterminadas:**
        *   Esta página se centrará en dos integraciones: `cloudinary` y `chatbot-integrado-con-whatsapp-para-soporte-y-ventas`.
        *   Al cargar la página, comprueba si los documentos con estos IDs existen en la colección `integrations`. Si no existen, créalos con un estado `inactive` y `fields` como un JSON vacío (`{}`).
    2.  **Visualización:**
        *   Muestra cada integración en una `Card` con su `name`, una breve descripción, un `Badge` de `status`, y un `Badge` que indique si las credenciales están configuradas o no.
    3.  **Configuración:**
        *   Añade un `Button` "Editar Configuración" en cada `Card` que abra un `Dialog`.
        *   El `Dialog` debe mostrar un formulario específico según la integración:
            *   **Para Cloudinary:** Campos para `cloud_name`, `api_key`, y `api_secret` (este último como `type="password"` con un botón para mostrar/ocultar).
            *   **Para el Chatbot IA:** Sub-secciones (`Card` dentro del `Dialog`) para `Google AI`, `OpenAI` y `Groq`. Cada una con un campo para la `API Key` (de tipo `password`) y un botón "Probar Conexión".
    4.  **Flujo de Prueba de API Key:**
        *   El botón "Probar Conexión" debe llamar a una Server Action (un `flow` de Genkit ya existente) llamada `testApiKey`, que valida la clave contra la API del proveedor correspondiente y devuelve un resultado de éxito o error.
        *   Muestra el resultado de la prueba en un `AlertDialog` o `Toast`.
    5.  **Dependencia de Módulos:** El botón "Editar Configuración" y el `Switch` de estado deben estar deshabilitados si el módulo correspondiente (ej. `cloudinary` o `chatbot-integrado-con-whatsapp-para-soporte-y-ventas`) no está activo en la colección `modules`.

