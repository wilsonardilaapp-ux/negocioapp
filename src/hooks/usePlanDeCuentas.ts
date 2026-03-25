'use client';

import { useState } from 'react';
import type { Cuenta, TipoCuenta } from '@/types/contabilidad.types';

const getInitialCuentas = (): Cuenta[] => [
  { id: '1', codigo: '1', nombre: 'ACTIVO', tipo: 'Activo', saldo: 250000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '2', codigo: '11', nombre: 'ACTIVO CORRIENTE', tipo: 'Activo', saldo: 150000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '3', codigo: '1105', nombre: 'CAJA', tipo: 'Activo', saldo: 25000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '4', codigo: '110505', nombre: 'Caja General', tipo: 'Activo', saldo: 25000000, esCuentaMayor: false, permiteMovimientos: true },
  { id: '5', codigo: '1110', nombre: 'BANCOS', tipo: 'Activo', saldo: 75000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '6', codigo: '111005', nombre: 'Bancolombia', tipo: 'Activo', saldo: 75000000, esCuentaMayor: false, permiteMovimientos: true },
  { id: '7', codigo: '13', nombre: 'DEUDORES', tipo: 'Activo', saldo: 50000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '8', codigo: '1305', nombre: 'Clientes', tipo: 'Activo', saldo: 50000000, esCuentaMayor: false, permiteMovimientos: true },
  { id: '9', codigo: '2', nombre: 'PASIVO', tipo: 'Pasivo', saldo: 80000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '10', codigo: '22', nombre: 'PROVEEDORES', tipo: 'Pasivo', saldo: 30000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '11', codigo: '2205', nombre: 'Proveedores Nacionales', tipo: 'Pasivo', saldo: 30000000, esCuentaMayor: false, permiteMovimientos: true },
  { id: '12', codigo: '4', nombre: 'INGRESOS', tipo: 'Ingresos', saldo: 500000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '13', codigo: '41', nombre: 'INGRESOS OPERACIONALES', tipo: 'Ingresos', saldo: 500000000, esCuentaMayor: true, permiteMovimientos: false },
  { id: '14', codigo: '4135', nombre: 'Venta de productos', tipo: 'Ingresos', saldo: 500000000, esCuentaMayor: false, permiteMovimientos: true },
];

export function usePlanDeCuentas() {
  const [cuentas, setCuentas] = useState<Cuenta[]>(getInitialCuentas);

  return {
    cuentas
  };
}
