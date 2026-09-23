const fs = require('fs');
const path = require('path');

function backupAndEdit(filePath, modifier) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }
  const original = fs.readFileSync(absPath, 'utf8');
  const bakPath = `${absPath}.bak`;
  if (!fs.existsSync(bakPath)) {
    fs.writeFileSync(bakPath, original, 'utf8');
    console.log(`🛡️ Respaldo creado: ${filePath}.bak`);
  }
  const modified = modifier(original);
  if (modified !== original) {
    fs.writeFileSync(absPath, modified, 'utf8');
    console.log(`✅ Modificado exitosamente (aditivo): ${filePath}`);
  } else {
    console.log(`ℹ️ Sin cambios requeridos: ${filePath}`);
  }
}

// 1. ACTUALIZAR src/constants/pricingPlans.ts
backupAndEdit('src/constants/pricingPlans.ts', (content) => {
  if (content.includes('COMISIONES')) return content;

  return `/**
 * @fileOverview Constante central única y funciones de cálculo de precios (v5).
 * Reglas de negocio:
 * - Plan FIJO: comisión 0% en todo canal. El cliente paga basePrice exacto.
 * - Plan HÍBRIDO en Mesa (QR): 3% universal de tarifa de servicio en todos los planes híbridos.
 * - Plan HÍBRIDO en Domicilio: % según plan (15% Arranque / 12% Crecimiento / 10% Profesional / 9% Unlimited).
 * - Redondeo a múltiplo de $100 hacia arriba cuando hay recargo. El restaurante SIEMPRE recibe 100% de su precio base.
 */

export type CanalPedido = 'domicilio' | 'mesa';
export type PlanType = 'fijo' | 'hibrido';

export const COMISIONES = {
  hibridos: {
    "arranque-digital": { domicilio: 0.15, mesa: 0.03, baseMensual: 0 },
    "crecimiento":      { domicilio: 0.12, mesa: 0.03, baseMensual: 39000 },
    "profesional":      { domicilio: 0.10, mesa: 0.03, baseMensual: 69000 },
    "unlimited":        { domicilio: 0.09, mesa: 0.03, baseMensual: 199000 }
  },
  fijos: { domicilio: 0, mesa: 0 }
} as const;

export const COMISION_MESA_DEFAULT = 0.03; // 3% universal en mesa para todos los híbridos

export const PORCENTAJES_HIBRIDOS = {
  arranque: 0.15,
  crecimiento: 0.12,
  profesional: 0.10,
  unlimited: 0.09,
} as const;

export const PLANES_FIJOS = {
  comision: 0,
} as const;

export type PricingContext = {
  planType?: PlanType;
  comisionRate?: number; // Para domicilio si viene configurada en el plan
  tableCommissionRate?: number; // Para mesa si viene configurada en el plan (default 3%)
  planSlug?: string;
  planName?: string;
  channel?: CanalPedido;
};

/**
 * Redondeo a múltiplo de $100 hacia arriba con normalización de precisión de punto flotante
 */
export function roundUp100(value: number): number {
  if (!value || isNaN(value) || value <= 0) return 0;
  const cleanValue = Math.round(value * 100) / 100;
  return Math.ceil(cleanValue / 100) * 100;
}

/**
 * Obtiene la tasa de comisión híbrida según el canal (domicilio vs mesa)
 */
export function obtenerTasaComisionHibrida(
  context?: PricingContext | null,
  canal: CanalPedido = 'domicilio'
): number {
  if (!context || context.planType === 'fijo') return 0;

  // Canal Mesa: 3% universal en TODOS los planes híbridos (o el configurado en el plan)
  if (canal === 'mesa') {
    if (context.tableCommissionRate !== undefined && context.tableCommissionRate !== null) {
      const rate = Number(context.tableCommissionRate);
      return rate > 1 ? rate / 100 : rate;
    }
    return COMISION_MESA_DEFAULT; // 0.03 (3%)
  }

  // Canal Domicilio: según plan configurado o constantes centrales
  if (context.comisionRate !== undefined && context.comisionRate !== null) {
    const rate = Number(context.comisionRate);
    return rate > 1 ? rate / 100 : rate;
  }

  const identifier = (context.planSlug || context.planName || '').toLowerCase();
  if (identifier.includes('arranque')) return PORCENTAJES_HIBRIDOS.arranque;
  if (identifier.includes('crecimiento')) return PORCENTAJES_HIBRIDOS.crecimiento;
  if (identifier.includes('profesional')) return PORCENTAJES_HIBRIDOS.profesional;
  if (identifier.includes('unlimited') || identifier.includes('ilimitado')) return PORCENTAJES_HIBRIDOS.unlimited;

  return PORCENTAJES_HIBRIDOS.arranque; // 15% por defecto en domicilio
}

/**
 * Función central única: calcularPrecioCliente
 * - Fijo: retorna basePrice idéntico (0% comisión en todo canal).
 * - Híbrido Mesa: basePrice + 3% redondeado a $100 arriba.
 * - Híbrido Domicilio: basePrice + % plan redondeado a $100 arriba.
 */
export function calcularPrecioCliente(
  basePrice: number | undefined | null,
  context?: PricingContext | null,
  canal: CanalPedido = 'domicilio'
): number {
  const safeBase = Number(basePrice) || 0;
  if (safeBase <= 0) return 0;

  if (context?.planType === 'fijo') {
    return safeBase;
  }

  if (context?.planType === 'hibrido') {
    const activeCanal = context.channel || canal;
    const tasa = obtenerTasaComisionHibrida(context, activeCanal);
    const precioCalculado = safeBase * (1 + tasa);
    return roundUp100(precioCalculado);
  }

  return safeBase;
}

/**
 * Calcula la Tarifa de Servicio en pesos (monto exacto a mostrar en el checkout/resumen)
 */
export function calcularTarifaServicio(
  basePrice: number | undefined | null,
  context?: PricingContext | null,
  canal: CanalPedido = 'domicilio'
): number {
  const safeBase = Number(basePrice) || 0;
  if (safeBase <= 0 || context?.planType === 'fijo') return 0;

  const precioFinal = calcularPrecioCliente(safeBase, context, canal);
  return Math.max(0, precioFinal - safeBase);
}
`;
});

// 2. ACTUALIZAR src/models/order.ts (ADITIVO)
backupAndEdit('src/models/order.ts', (content) => {
  if (content.includes('channel?:')) return content;

  return content.replace(
    /origin\?: string;[\s\S]*?\/\/[^\n]*/,
    `origin?: string;              // Canal de origen (ej. 'qr', 'whatsapp', 'web')\n  channel?: 'domicilio' | 'mesa'; // ADITIVO v5: Canal unificado del pedido\n  serviceFee?: number;          // ADITIVO v5: Tarifa de servicio aplicada en el pedido`
  );
});

// 3. ACTUALIZAR src/models/hybrid-plan.ts (ADITIVO)
backupAndEdit('src/models/hybrid-plan.ts', (content) => {
  if (content.includes('tableCommissionRate:')) return content;

  let updated = content.replace(
    /commissionType: z\.enum\(\['fixed', 'percent'\]\),/,
    `commissionType: z.enum(['fixed', 'percent']),\n  tableCommissionRate: z.number().min(0).default(3).optional(), // ADITIVO v5: % Comisión en Mesa (QR)\n  tableCommissionType: z.enum(['fixed', 'percent']).default('percent').optional(),`
  );

  return updated;
});

console.log('\n🎉 Fase 1 aplicada.');
