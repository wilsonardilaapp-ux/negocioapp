# 🧠 PROMPT PARA IA – Módulo de Editor de Factura Visual (SaaS)

### Stack: **React (Next.js) + TypeScript + Firebase + Shadcn UI**

> Actúa como un **desarrollador senior Full Stack** especializado en herramientas administrativas para negocios. Tu objetivo es implementar un **Editor de Factura Visual** completo que permita a los usuarios personalizar la apariencia de sus recibos térmicos y ver los cambios en tiempo real antes de imprimir.

---

## 🎯 Objetivo General

Implementar una página de configuración en `/dashboard/configuracion/factura` que conste de un panel de edición (controles) y una previsualización interactiva (template). El sistema debe manejar carga de logos, generación de QR dinámicos, códigos de barras y una lógica de impresión que respete el formato de impresoras térmicas (58mm/80mm).

---

## 1. Modelo de Datos y Configuración (`models/invoice-settings.ts`)

La interfaz debe ser estrictamente tipada:

```typescript
export interface InvoiceSettings {
  header: { businessName: string; address: string; phone: string; nit: string; };
  logo: { url: string | null; size: string; position: 'center' | 'left' | 'right'; };
  qr: { show: boolean; linkType: string; url: string; labelText: string; qrImageUrl: string | null; };
  socialMedia: { show: boolean; instagram: string; whatsapp: string; facebook: string; website?: string; };
  fields: { 
    showInvoiceNumber: boolean; showDateTime: boolean; showClientAddress: boolean; 
    showClientPhone: boolean; showPaymentMethod: boolean; showDeliveryFee: boolean; 
    showPackaging: boolean; showEstimatedDelivery: boolean; 
  };
  style: { paperSize: '58mm' | '80mm' | 'A4'; font: 'monospace' | 'arial' | 'sans-serif'; separatorStyle: 'dashed' | 'solid' | 'none'; fontSize: string; textScale: number; };
  bold: { allBold: boolean; zones: Record<string, boolean>; };
  promo: { show: boolean; text: string; };
  footer: { message: string; repeatBusinessName: boolean; };
  barcode: { show: boolean; value: string; displayValue: boolean; position: 'header' | 'footer'; };
}
```

---

## 2. Componentes Clave

### A. Editor de Configuración (`InvoiceEditor.tsx`)
*   Usar un **Accordion** de Shadcn UI para organizar las secciones:
    1.  **Encabezado:** Inputs para datos legales.
    2.  **Logo:** Uploader de imagen con previsualización, selector de tamaño y posición.
    3.  **Código QR:** Switch para mostrar/ocultar, uploader para imagen propia o generador automático basado en URL.
    4.  **Redes Sociales:** Campos para perfiles sociales.
    5.  **Campos Visibles:** Switche para cada dato dinámico (N° factura, fecha, etc.).
    6.  **Estilo de Negrita:** Control granular por zonas de la factura.
    7.  **Papel y Fuente:** Selectores para tamaño de papel (58/80mm), fuentes y escala de texto (Slider de 70% a 130%).
    8.  **Promoción y Pie:** Textareas para mensajes personalizados.

### B. Previsualización y Template (`InvoiceTemplate.tsx`)
*   Debe renderizar un componente que simule el papel térmico.
*   **Lógica de Formateo de Texto:** Implementar funciones `rpad` y `lpad` para alinear columnas (Cantidad, Producto, Total) según el ancho de caracteres del papel seleccionado.
*   **Negrita Dinámica:** Aplicar clases condicionales de Tailwind según los permisos de `settings.bold.zones`.
*   **Escala de Texto:** Usar `transform: scale()` o `zoom` para la previsualización en pantalla.

### C. Lógica de Impresión (`InvoicePreview.tsx`)
*   Al presionar "Imprimir", debe abrir una ventana nueva (`window.open`).
*   Inyectar un HTML completo con estilos `@media print` específicos que fuercen el tamaño del papel y eliminen márgenes del navegador.
*   Generar el QR y Barcode en el acto (usando librerías como `qrcode` y `jsbarcode`).

---

## 3. Funcionalidades Requeridas

1.  **Persistencia en Firestore:** Guardar y cargar la configuración desde la ruta `businesses/{userId}/invoiceSettings/main`.
2.  **Subida de Medios:** Usar un servicio (como Cloudinary) para subir el logo y el código QR personalizado.
3.  **Sincronización en Tiempo Real:** Los cambios en el editor deben reflejarse instantáneamente en la tarjeta de previsualización lateral.
4.  **Ajuste de Caracteres por Línea:** 32 caracteres para 58mm y 42 caracteres para 80mm aproximadamente.

---

## 📦 Devuelve

*   El código completo y final para la página principal y los tres subcomponentes del módulo de factura.
*   Asegura que el diseño sea profesional y adaptado para entornos de punto de venta (POS).
