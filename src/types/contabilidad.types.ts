export type TipoCuenta = 'Activo' | 'Pasivo' | 'Patrimonio' | 'Ingresos' | 'Costos' | 'Gastos';

export interface Cuenta {
  id: string;
  codigo: string;
  nombre: string;
  tipo: TipoCuenta;
  saldo: number;
  esCuentaMayor: boolean; // Indicates if it's a main account or a sub-account
  permiteMovimientos: boolean; // If transactions can be posted to this account
}
