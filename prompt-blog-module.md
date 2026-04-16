# 🧠 PROMPT PARA IA – Módulo de Blog Completo (SaaS)

### Stack: **React (Next.js) + Firebase**

> Actúa como un **desarrollador senior Full Stack** especializado en **React (Next.js), TypeScript y Firebase**. Tu objetivo es implementar un **módulo de Blog completo** para una plataforma SaaS. El sistema debe permitir tanto a un **Super Administrador** como a los **Clientes** gestionar publicaciones.

---

## 🎯 Objetivo General

Implementar un sistema de Blog con tres interfaces principales:
1.  **Panel de Super Admin:** Para gestionar **TODAS** las publicaciones de la plataforma.
2.  **Panel de Cliente:** Para que cada cliente gestione **SUS PROPIAS** publicaciones.
3.  **Páginas Públicas:** Para que los visitantes lean las publicaciones.

---

## 🔩 Stack Tecnológico y Guías

*   **Framework:** Next.js 14+ con App Router.
*   **Lenguaje:** TypeScript (`strict: true`).
*   **Base de Datos:** Firebase Firestore.
*   **Backend Logic:** Usar **Server Actions** de Next.js para crear, actualizar y eliminar posts.
*   **UI:** Componentes de **Shadcn UI** (`Card`, `Button`, `Table`, `Dialog`, `Input`, `Label`, `Switch`, etc.).
*   **Iconos:** `lucide-react`.
*   **Editor de Texto:** `react-quill` para el contenido de los posts.

---

## 1. Modelo de Datos y Firestore

**Colección:** `blog_posts`

**Interfaz TypeScript (`models/blog-post.ts`):**
```typescript
export type BlogPost = {
  id: string;              // ID autogenerado por Firestore
  title: string;           // Título del artículo
  slug: string;            // URL amigable (ej: "mi-nuevo-post")
  content: string;         // Contenido en formato HTML desde el editor
  imageUrl: string;        // URL de la imagen destacada
  isActive: boolean;       // `true` para publicado, `false` para borrador
  createdAt: string;       // Fecha de creación en formato ISO
  updatedAt: string;       // Fecha de última actualización en formato ISO
  businessId?: string;     // ID del negocio (cliente) si el post le pertenece. Opcional.
  
  // Campos SEO
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
};
```

**Reglas de Seguridad (`firestore.rules`):**
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /blog_posts/{postId} {
      // Cualquiera puede leer los posts (para las páginas públicas)
      allow read: if true;

      // Solo usuarios autentificados pueden escribir/modificar
      // (Se puede refinar para que solo el dueño o un superadmin pueda editar/borrar)
      allow write: if request.auth != null;
    }
  }
}
```

---

## 2. Server Actions (`actions/blog.ts`)

Crea un archivo para las acciones del servidor que interactuarán con Firestore.

### `createPost(formData: FormData)`
*   Recibe los datos del formulario.
*   Valida que los campos requeridos no estén vacíos.
*   Genera un `slug` a partir del `title`.
*   Crea un nuevo documento en la colección `blog_posts`.
*   Asigna el `businessId` si se proporciona en el `formData`.
*   Usa `revalidatePath` para invalidar la caché de las páginas del blog (`/blog`, `/dashboard/blog`, `/superadmin/blog`).
*   Devuelve `{ success: true }` o `{ success: false, error: '...' }`.

### `updatePost(formData: FormData)`
*   Similar a `createPost`, pero busca el documento por `id`.
*   Usa `updateDoc` para actualizar los campos.
*   Vuelve a generar el `slug` si el título cambia.
*   Usa `revalidatePath` para las páginas relevantes.

---

## 3. Implementación Frontend

### a) Panel de Super Admin (`/superadmin/blog`)

*   **`page.tsx`**:
    *   Debe mostrar una `Table` (usando `components/ui/table`) con **TODAS** las publicaciones de la colección `blog_posts`.
    *   Columnas: Título, Estado (Activo/Borrador), Fecha de Creación, Negocio (mostrar "Global" si no tiene `businessId`, o el nombre del negocio si lo tiene).
    *   Debe tener un botón "Crear Nuevo Post" que lleve a `/superadmin/blog/create`.
*   **`create/page.tsx`**:
    *   Un formulario para crear un post "global" (sin `businessId`).
    *   Debe usar la Server Action `createPost`.
*   **`edit/[id]/page.tsx`**:
    *   Un formulario pre-cargado con los datos del post a editar.
    *   Debe usar la Server Action `updatePost`.

### b) Panel de Cliente (`/dashboard/blog`)

*   **`page.tsx`**:
    *   Primero, debe verificar si el "Módulo de Blog" está activado para el cliente. Si no, mostrar un mensaje indicando que la función no está disponible.
    *   Si está activo, mostrar una `Table` con **SOLO** los posts donde `businessId` coincida con el ID del usuario/negocio actual.
    *   Debe tener un botón "Crear Nuevo Post" que lleve a `/dashboard/blog/create`.
*   **`create/page.tsx`**:
    *   Formulario para crear un post. Al enviar, debe incluir el `businessId` del cliente en el `formData`.
    *   Debe usar la Server Action `createPost`.
*   **`edit/[id]/page.tsx`**:
    *   Formulario para editar un post, asegurándose de que el cliente solo pueda editar sus propios posts.
    *   Debe usar la Server Action `updatePost`.

### c) Páginas Públicas

*   **`/blog/page.tsx` (Página de Listado)**:
    *   Debe obtener **TODOS** los posts donde `isActive === true`.
    *   Renderizar los posts en una grilla de `Card`.
    *   Cada `Card` debe mostrar la imagen destacada, título, un extracto del contenido y un enlace a la página de detalle.
*   **`/blog/[slug]/page.tsx` (Página de Detalle)**:
    *   Componente de servidor que recibe el `slug` como parámetro.
    *   Busca en Firestore el post que coincida con el `slug`.
    *   Si no lo encuentra, debe devolver `notFound()`.
    *   Si lo encuentra, debe renderizar el `title`, `imageUrl` y el `content` (usando `dangerouslySetInnerHTML`).
    *   Añadir navegación al post anterior y siguiente.

---

## 📦 Devuelve

*   El código completo para cada archivo creado o modificado.
*   Asegura que el código sea de calidad de producción, sin errores de tipado y que siga la estructura del proyecto existente.
*   No incluyas comentarios innecesarios, solo el código funcional.