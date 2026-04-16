# 🧠 PROMPT PARA IA – Módulo Global de Pasarelas de Pago

### Stack: **React (Next.js) + TypeScript + Firebase + Shadcn UI**

> Actúa como un **desarrollador senior Full Stack** especializado en la creación de aplicaciones SaaS multi-inquilino. Tu misión es implementar una página de **Gestión de Pasarelas de Pago Globales** para el panel del Super Administrador. Esta página centralizará la configuración de todos los métodos de pago que la plataforma ofrecerá a los clientes.

---

## 🎯 Objetivo General

Implementar una página en `/superadmin/payment-methods` que permita al Super Administrador habilitar, deshabilitar y configurar múltiples métodos de pago, incluyendo opciones manuales (QR) y pasarelas de pago automatizadas (API).

---

## 1. Modelos de Datos y Firestore

Tu implementación debe basarse estrictamente en las siguientes interfaces ya existentes en el proyecto:

*   **`src/models/global-payment-config.ts`**:
    *   `GlobalPaymentConfig`: El objeto principal que se guardará en Firestore.
    *   `QRConfig`: Para métodos como Nequi, Bancolombia, Daviplata.
    *   `BreBConfig`: Para la pasarela Bre-B.
    *   `ApiGatewayConfig`: Para pasarelas como Stripe, PayPal, Mercado Pago.
    *   `HotmartPlanLink`: Para los enlaces de pago de Hotmart.
*   **`src/models/subscription-plan.ts`**:
    *   `SubscriptionPlan`: Para obtener la lista de planes a los que se asociarán los enlaces de Hotmart.

**Ubicación en Firestore:**
*   La configuración principal se almacenará en un único documento: `/globalConfig/payment_methods`.
*   Los enlaces de Hotmart se guardarán directamente en cada documento de plan en la colección `/plans/{planId}`.

---

## 2. Implementación Frontend (`/superadmin/payment-methods`)

### `page.tsx` (Componente Principal)

*   **Estado Principal:** Utiliza un estado (`useState<GlobalPaymentConfig>`) para manejar todo el objeto de configuración.
*   **Carga de Datos:** Al montar, usa el hook `useDoc` para cargar la configuración desde `/globalConfig/payment_methods`. Si el documento no existe, inicializa el estado con un objeto por defecto.
*   **Gestión de Cambios:** Implementa una bandera de estado (`hasChanges`) que se active cuando cualquier valor de la configuración cambie. El botón "Guardar" debe estar deshabilitado si no hay cambios.
*   **Función de Guardado (`handleSave`):**
    1.  Llama a `setDocumentNonBlocking` para guardar el objeto de estado completo en `/globalConfig/payment_methods`.
    2.  Utiliza un `writeBatch` de Firestore para recorrer los enlaces de Hotmart modificados y actualizar cada documento de plan correspondiente en la colección `/plans`.
    3.  Muestra un `toast` de éxito al finalizar.
*   **Layout:**
    *   Un encabezado con el título de la página y el botón "Guardar Configuración".
    *   Un layout de dos columnas:
        *   **Columna Izquierda (Selectores):** Una `Card` que contenga un `RadioGroup` para seleccionar el método de pago a configurar (Nequi, Bancolombia, Stripe, etc.).
        *   **Columna Derecha (Formularios):** Muestra dinámicamente el componente de formulario correspondiente al método de pago seleccionado.
        *   **Tarjeta Adicional:** Una `Card` separada para gestionar los enlaces de pago de Hotmart.

### Componentes Reutilizables

Crea estos componentes para mantener el código limpio y modular.

#### `components/pagos/QRForm.tsx`

*   **Props:** `methodName`, `data: QRConfig`, `setData: (data: QRConfig) => void`, `accountLabel`.
*   **Funcionalidad:**
    *   Un `Input` para el nombre del titular.
    *   Un `Input` para el número de cuenta/teléfono (con el `accountLabel` correspondiente).
    *   Un `Textarea` para las instrucciones que verá el cliente.
    *   Un componente para subir la imagen del código QR (usando el flow `uploadMedia`), que muestre la imagen si existe o un área para subirla. Debe permitir eliminar la imagen.

#### `components/pagos/BreBForm.tsx`

*   Similar a `QRForm`, pero con los campos específicos de `BreBConfig`: `holderName`, `keyType` (usando un `Select`), `keyValue`, `commerceCode`.

#### `components/pagos/ApiGatewayForm.tsx`

*   **Props:** `data: ApiGatewayConfig`, `setData: (data: ApiGatewayConfig) => void`, `fields: string[]` (un array con los nombres de las claves a mostrar, ej: `['secretKey', 'publicKey']`).
*   **Funcionalidad:**
    *   Renderiza dinámicamente `Input` de tipo `password` para cada clave especificada en `fields`.
    *   Un `RadioGroup` para seleccionar el modo (`sandbox` o `production`).
    *   Un `Textarea` para las instrucciones.

### Gestión de Enlaces de Hotmart

*   Dentro de `page.tsx`, crea una sección o `Card` separada.
*   Obtén todos los planes de la colección `/plans`.
*   Para cada plan, renderiza un `Input` donde el superadministrador pueda pegar el enlace de checkout de Hotmart.
*   Maneja el estado de estos enlaces en un `useState<HotmartPlanLink[]>`.

---

## 📦 Devuelve

*   El código completo y final para cada archivo nuevo o modificado (`page.tsx` y los componentes de formulario).
*   Asegúrate de que el código sea de calidad de producción, siga las mejores prácticas de React y TypeScript, y maneje correctamente los estados de carga y guardado.

Genera un **código limpio, modular y robusto** que cumpla con todos los requisitos.