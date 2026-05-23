export type CouponType = 'porcentaje' | 'valorFijo';
export type UsageLimitType = 'unaVez' | 'ilimitado';

export interface Coupon {
    id: string;
    businessId: string;
    codigo: string;
    tipo: CouponType;
    valor: number;
    fechaVencimiento: string; // ISO String
    limiteUsos: number; // 0 for unlimited
    usosActuales: number;
    usoPorCliente: UsageLimitType;
    montoMinimo: number;
    activo: boolean;
    createdAt: string;
    updatedAt: string;
}
