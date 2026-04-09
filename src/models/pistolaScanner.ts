
export interface PistolaScanner {
  id: string;
  nombre: string;
  marca: MarcaScanner;
  modelo: ModeloScanner;
  numeroSerie: string;
  tipoConexion: TipoConexion;
  puerto: string;
  terminalAsignada: TerminalAsignada;
  estado: EstadoDispositivo;
  lecturasHoy: number;
  erroresHoy: number;
  firmware: string;
  bateria: number | null;
  ultimaLectura: Date | null;
  configuracion: ConfiguracionScanner;
  creadoEn: Date;
}

export interface ConfiguracionScanner {
  codigos1D: boolean;
  codigosQR: boolean;
  pdf417: boolean;
  code39: boolean;
  gs1128: boolean;
  autoAgregarProducto: boolean;
  sonidoConfirmacion: boolean;
  vibracion: boolean;
  modoInventarioContinuo: boolean;
  prefijo: string;
  sufijo: SufijoTrama;
}

export interface FormularioPistolaScanner {
  nombre: string;
  marca: MarcaScanner;
  modelo: ModeloScanner;
  numeroSerie: string;
  tipoConexion: TipoConexion;
  puerto: string;
  terminalAsignada: TerminalAsignada;
}

export interface ResumenDispositivos {
  total: number;
  conectados: number;
  desconectados: number;
  configurando: number;
}

export type MarcaScanner =
  | 'Honeywell'
  | 'Zebra'
  | 'Datalogic'
  | 'Newland'
  | 'Opticon'
  | 'Metrologic'
  | 'Otro';

export type ModeloScanner =
  | 'Honeywell Voyager 1202g'
  | 'Honeywell Xenon 1900'
  | 'Honeywell Granit 1981i'
  | 'Honeywell Genesis 7580g'
  | 'Zebra DS2208-SR'
  | 'Zebra DS8178'
  | 'Zebra LI3678'
  | 'Zebra CS6080'
  | 'Datalogic QuickScan QD2430'
  | 'Datalogic Gryphon GD4430'
  | 'Datalogic Heron HD3430'
  | 'Newland NLS-HR3280'
  | 'Newland BS80 Piranha'
  | 'Newland NLS-FR40'
  | 'Opticon OPI-3601'
  | 'Opticon OPR-3301'
  | 'Otro';

export type TipoConexion =
  | 'USB HID'
  | 'Bluetooth SPP'
  | 'RS-232 Serial'
  | 'Wi-Fi';

export type TerminalAsignada =
  | 'POS Principal'
  | 'Inventario'
  | 'Móvil / Tablet'
  | 'Recepción';

export type EstadoDispositivo =
  | 'conectado'
  | 'desconectado'
  | 'configurando';

export type SufijoTrama =
  | 'Enter (CR)'
  | 'Tab'
  | 'Ninguno'
  | 'CR + LF';

export type FiltroEstado = EstadoDispositivo | 'todos';
