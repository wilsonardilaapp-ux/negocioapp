export type Product = {
    id: string;
    businessId: string;
    name: string;
    description: string; // Puede contener HTML
    price: number;
    stock: number;
    category: string;
    images: string[]; // URLs de las imágenes
    rating: number; // Calificación promedio (ej. 4.5)
    ratingCount: number; // Número de valoraciones
};

    