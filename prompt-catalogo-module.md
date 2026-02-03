# 🧠 PROMPT PARA IA – Módulo de Catálogo de Productos (SaaS)

### Stack: **React (Next.js) + Firebase**

> Actúa como un **desarrollador senior Full Stack** especializado en **React (Next.js), TypeScript y Firebase**. Tu objetivo es implementar un **módulo de Catálogo de Productos completo** para una plataforma SaaS.

---

## 🎯 Objetivo General

Implementar un sistema de Catálogo de Productos con dos interfaces principales:
1.  **Panel de Cliente (`/dashboard/catalogo`):** Para que cada cliente gestione sus productos, configure la apariencia del catálogo y genere un QR para compartirlo.
2.  **Página Pública (`/catalog/{businessId}`):** Una página pública y personalizable donde los visitantes pueden ver los productos, iniciar un proceso de compra a través de WhatsApp y calificar los productos.

---

## 🔩 Stack Tecnológico y Guías

*   **Framework:** Next.js 14+ con App Router.
*   **Lenguaje:** TypeScript (`strict: true`).
*   **Base de Datos:** Firebase Firestore.
*   **UI:** Componentes de **Shadcn UI** (`Card`, `Button`, `Dialog`, `Input`, `Label`, `Carousel`, `Tabs`, etc.).
*   **Iconos:** `lucide-react`.
*   **Formularios:** `react-hook-form` con `zod` para validación.
*   **Estilos:** Tailwind CSS.
*   **Interacción con Backend:** Usar funciones no bloqueantes para la escritura en Firestore (`setDocumentNonBlocking`, `deleteDocumentNonBlocking`) y Genkit/Server Actions para lógica más compleja (ej. calificar producto).

---

## 1. Modelo de Datos y Firestore

### Colecciones

1.  `/businesses/{businessId}/products/{productId}`
2.  `/businesses/{businessId}/landingConfig/header` (Para la configuración del encabezado del catálogo)
3.  `/businesses/{businessId}/publicData/catalog` (Documento denormalizado para la página pública)
4.  `/businesses/{businessId}/orders/{orderId}` (Para registrar los pedidos)
5.  `/paymentSettings/{businessId}` (Para los métodos de pago)

### Interfaces TypeScript

**`models/product.ts`:**
```typescript
export type Product = {
    id: string;
    businessId: string;
    name: string;
    description: string; // Puede contener HTML
    price: number;
    stock: number;
    category: string;
    images: string[]; // URLs de imágenes o videos
    rating: number; // Calificación promedio (ej. 4.5)
    ratingCount: number; // Número de valoraciones
};
```

**`models/landing-page.ts` (reutilizar `LandingHeaderConfigData`):**
```typescript
export type LandingHeaderConfigData = {
    banner: { mediaUrl: string | null; mediaType: 'image' | 'video' | null; };
    businessInfo: { name: string; address: string; phone: string; email?: string; deliveryFee?: number; vatRate?: number; };
    socialLinks: { tiktok: string; instagram: string; facebook: string; whatsapp: string; twitter: string; };
    carouselItems: CarouselItem[];
};
```

**`models/order.ts`:**
```typescript
export type OrderStatus = "Pendiente" | "En proceso" | "Enviado" | "Entregado" | "Cancelado";

export type Order = {
    id: string;
    businessId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerAddress: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    paymentMethod: string;
    orderDate: string; // ISO 8601
    orderStatus: OrderStatus;
};
```

---

## 2. Implementación Frontend

### a) Panel de Cliente (`/dashboard/catalogo`)

*   **`page.tsx`**:
    *   Verificar si el módulo "Catálogo" está activo. Si no, mostrar un mensaje de "Módulo desactivado".
    *   **Componente `CatalogHeaderForm`**: Formulario para editar la `LandingHeaderConfigData`.
    *   **Componente `CatalogQRGenerator`**: Generar y mostrar un código QR que enlaza a `/catalog/{user.uid}`.
    *   **Listado de Productos**: Mostrar los productos en una grilla de `ProductCard`.
    *   **Botón "Añadir Producto"**: Abre un `Dialog` con el `ProductForm`. Debe estar deshabilitado si se alcanza el límite de productos definido en `systemServices/product_limit`.
    *   Cada `ProductCard` debe tener botones para "Editar" (abre `ProductForm` con datos) y "Eliminar" (con `AlertDialog` de confirmación).

*   **`components/catalogo/ProductForm.tsx`**:
    *   Formulario completo para crear/editar un `Product`.
    *   Incluir un `RichTextEditor` para la descripción.
    *   Implementar un `MediaUploader` para subir hasta 5 imágenes/videos del producto, usando un Genkit Flow (`uploadMedia`) para subirlos a Cloudinary.
    *   Al guardar, usar `setDocumentNonBlocking` o `addDocumentNonBlocking`.

*   **`components/catalogo/CatalogHeaderForm.tsx`**:
    *   Formulario para editar la información del negocio, banner, carrusel y redes sociales.
    *   Debe persistir los cambios en `businesses/{uid}/landingConfig/header`.

*   **Sincronización de Datos Públicos**:
    *   Cada vez que se guarda un producto o la configuración del encabezado, una función `updatePublicCatalog` debe actualizar el documento `businesses/{uid}/publicData/catalog` con la lista completa de productos y la configuración del encabezado. Esto denormaliza los datos para lecturas rápidas y seguras en la página pública.

### b) Página Pública (`/catalog/[businessId]`)

*   **`page.tsx`**:
    *   Componente de servidor que obtiene el `businessId` de los parámetros.
    *   Leer el documento `businesses/{businessId}/publicData/catalog`.
    *   Si no existe, mostrar un mensaje de "Catálogo no encontrado".
    *   Renderizar el `CatalogHeader` con la configuración obtenida.
    *   Renderizar una grilla de `PublicProductCard` con los productos.

*   **`components/catalogo/PublicProductCard.tsx`**:
    *   Tarjeta que muestra la imagen principal, nombre, precio y calificación del producto.
    *   Un botón "Ver Producto" que abre el `ProductViewModal`.

*   **`components/catalogo/ProductViewModal.tsx`**:
    *   Modal que muestra todos los detalles del producto: galería de imágenes/videos, descripción, stock, etc.
    *   Sistema de calificación por estrellas que llama al Genkit Flow `rateProduct` para actualizar la calificación promedio.
    *   Botón "Comprar" que:
        1.  Llama al Genkit Flow `getSuggestion` para ver si hay una oferta.
        2.  Si hay sugerencia, muestra el `SuggestionModal`.
        3.  Si no, o si el usuario rechaza la sugerencia, abre el `PurchaseModal` con el producto seleccionado.

*   **`components/catalogo/PurchaseModal.tsx`**:
    *   Modal para finalizar la compra.
    *   Muestra el carrito de compras.
    *   Formulario para que el cliente ingrese sus datos (nombre, email, WhatsApp, dirección).
    *   Tabs para mostrar los métodos de pago habilitados por el negocio (obtenidos de `paymentSettings/{businessId}`).
    *   Botón "Confirmar y Enviar Pedido" que:
        1.  Guarda un nuevo documento en la colección `orders`.
        2.  Genera un mensaje pre-llenado con los detalles del pedido.
        3.  Abre una nueva pestaña de WhatsApp con el mensaje para que el cliente lo envíe al negocio.

---

## 3. Lógica de Backend (Genkit Flows / Server Actions)

*   **`rateProduct(productId, rating)`**:
    *   Actualiza la calificación (`rating` y `ratingCount`) de un producto de forma segura usando una transacción de Firestore.
*   **`uploadMedia(mediaDataUri)`**:
    *   Recibe una imagen/video en Base64.
    *   La sube a Cloudinary.
    *   Devuelve la `secure_url`.
*   **`getSuggestion(productId)`**:
    *   Llama al motor de sugerencias para determinar si hay una oferta para el producto actual.
*   **Firestore Rules**:
    *   La colección `publicData` debe ser de lectura pública.
    *   Las colecciones `products`, `orders`, `landingConfig` y `paymentSettings` solo deben ser escribibles por el dueño del negocio (`request.auth.uid == businessId`).

---

## 📦 Devuelve

*   El código completo para cada archivo creado o modificado.
*   Asegura que el código sea de calidad de producción, sin errores de tipado y que siga la estructura del proyecto existente.

Genera un **código limpio, modular y robusto** que cumpla con todos los requisitos.