# 🧠 PROMPT PARA IA – Implementación del Modal "Gestionar Negocio"

### Stack: **React (Next.js) + TypeScript + Firebase + Shadcn UI**

> Actúa como un **desarrollador senior Full Stack** con experiencia en la creación de aplicaciones SaaS multi-inquilino. Tu misión es implementar una funcionalidad completa para "Gestionar Negocio" dentro de una página de administración existente, de forma quirúrgica y sin introducir regresiones.

---

## 🎯 Objetivo General

En una página que ya lista negocios en una tabla (`/superadmin/negocios/page.tsx`), debes añadir la lógica y la UI para un botón "Gestionar" que abrirá un modal. Este modal permitirá a un superadministrador modificar los límites, módulos, servicios y estado de un negocio específico.

---

## 🔒 INSTRUCCIONES CRÍTICAS DE PRESERVACIÓN

**LA PRIORIDAD ABSOLUTA ES NO ROMPER NADA.** Esta tarea es puramente **ADITIVA**.

-   **NO ELIMINES NI MODIFIQUES** lógica existente, botones, filtros o columnas en la tabla principal.
-   La nueva funcionalidad debe ser **autocontenida** dentro del botón "Gestionar" y el modal que este abre.
-   Céntrate **ÚNICAMENTE** en añadir el botón y el modal con su lógica asociada.
-   Utiliza las interfaces y modelos de datos proporcionados. No inventes nuevas estructuras.

---

## 1. Modelos de Datos Requeridos

Asegúrate de que tu implementación utilice estas interfaces para la consistencia de tipos.

```typescript
// src/models/business.ts
export type EntityStatus = 'active' | 'inactive' | 'suspended' | 'pending_payment';
export type Business = {
    id: string;
    name: string;
    ownerName: string;
    ownerEmail: string;
    status: EntityStatus;
    planName?: string;
    phone?: string;
    productLimit?: number | null;
    imageLimit?: number | null;
};

// src/models/module.ts
export type Module = {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'inactive';
};

// src/models/system-service.ts
export type SystemService = {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    limit: number;
};
```

---

## 2. Implementación Detallada

### Paso 2.1: Añadir el Botón "Gestionar" en `negocios/page.tsx`

En el componente de la página que renderiza la tabla de negocios (asumimos `page.tsx`):

1.  Añade un estado para controlar el modal y el negocio seleccionado:
    ```typescript
    const [showManageModal, setShowManageModal] = useState(false);
    const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
    ```

2.  Crea la función `openManageBusiness(business: Business)`. Esta función debe:
    -   Recibir el objeto `business` de la fila de la tabla.
    -   Establecer `selectedBusiness` con los datos de ese negocio.
    -   Establecer `setShowManageModal(true)`.

3.  En la columna "Acciones" de tu tabla, añade el nuevo botón "Gestionar" y conéctalo a la función `openManageBusiness`.

    ```tsx
    <Button size="sm" variant="outline" onClick={() => openManageBusiness(business)}>
      <Eye className="w-4 h-4 mr-1" />
      Gestionar
    </Button>
    ```

### Paso 2.2: Crear el Componente del Modal (`ManageBusinessModal.tsx`)

Crea un nuevo componente para el modal. Este componente será complejo y manejará su propio estado.

-   **Props:**
    -   `isOpen: boolean`
    -   `onClose: () => void`
    -   `business: Business | null`
    -   `allModules: Module[]` (Lista global de módulos disponibles)
    -   `allServices: SystemService[]` (Lista global de servicios disponibles)

-   **Estado Interno:**
    -   `isLoading: boolean`: Para mostrar un loader mientras se cargan los datos específicos del negocio.
    -   `assignedModules: string[]`: IDs de los módulos activos para este negocio.
    -   `assignedServices: string[]`: IDs de los servicios activos para este negocio.
    -   `editedBusiness: Partial<Business>`: Para manejar cambios en los campos de límites y estado.

-   **Lógica de Carga de Datos (`useEffect`):**
    -   Cuando el modal se abra (`isOpen` y `business` no es nulo), ejecuta un `useEffect`.
    -   Dentro del `useEffect`, haz lo siguiente:
        1.  Establece `isLoading(true)`.
        2.  Usa `getDocs` de Firestore para obtener los documentos de las subcolecciones:
            -   `businesses/{business.id}/modules`
            -   `businesses/{business.id}/services`
        3.  Filtra los que tengan `status: 'active'` y guarda sus IDs en `assignedModules` y `assignedServices`.
        4.  Inicializa `editedBusiness` con los datos del `business` recibido en las props.
        5.  Establece `isLoading(false)`.

-   **Lógica de Guardado (`handleSave`):**
    -   Esta función se llamará al hacer clic en "Guardar Cambios".
    -   Debe usar un `writeBatch` de Firestore para realizar todas las actualizaciones de forma atómica.
    1.  **Actualizar el documento principal del negocio:**
        -   `batch.update(doc(firestore, 'businesses', business.id), editedBusiness);`
    2.  **Desactivar todos los módulos y servicios existentes:**
        -   Obtén de nuevo los `modules` y `services` del negocio y, para cada uno, añade una operación de `update` al `batch` para poner su `status` en `'inactive'`. Esto asegura que las deselecciones se apliquen.
    3.  **Activar los módulos y servicios seleccionados:**
        -   Recorre `assignedModules` y `assignedServices` y, para cada ID, añade una operación `set` (con `{ merge: true }`) al `batch` para crear/actualizar el documento en la subcolección correspondiente con `{ status: 'active' }`.
    4.  **Ejecutar el batch:**
        -   `await batch.commit();`
    5.  Muestra un `toast` de éxito y cierra el modal (`onClose()`).

-   **UI del Modal (usando componentes Shadcn):**
    -   Un `Dialog` con `DialogHeader`, `DialogContent` y `DialogFooter`.
    -   Dentro del `DialogContent`, muestra un `Loader2` si `isLoading` es `true`.
    -   Si no, muestra:
        -   Una sección con la información básica del negocio (nombre, email, plan).
        -   **Límites Personalizados:** `Input` de tipo `number` para `productLimit` y `imageLimit`. Explica que estos campos anulan los límites del plan.
        -   **Módulos Asignados:** Mapea `allModules` y renderiza un `Checkbox` para cada uno. El estado `checked` debe depender de si el `id` del módulo está en el array `assignedModules`. El `onClick` debe añadir o quitar el ID de ese array.
        -   **Servicios Adicionales:** Idéntico a los módulos, pero para `allServices` y `assignedServices`.
        -   **Cambiar Estado:** Un `Select` para cambiar el `status` del negocio (`active`, `inactive`, `suspended`, etc.).

---

## 3. Resultado Esperado

Debes entregar el código completo y final para los siguientes archivos:

1.  **`src/app/(admin)/superadmin/negocios/page.tsx`**: Modificado para incluir el estado del modal, la función `openManageBusiness` y el botón "Gestionar".
2.  **`src/components/negocios/ManageBusinessModal.tsx`** (o una ruta similar): Un nuevo archivo que contenga el componente del modal con toda su lógica de carga, estado y guardado.