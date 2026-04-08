import {
  PistolaScanner,
  ConfiguracionScanner
} from '../models/pistolaScanner';

const configDefault: ConfiguracionScanner = {
  codigos1D: true,
  codigosQR: true,
  pdf417: false,
  code39: true,
  gs1128: false,
  autoAgregarProducto: true,
  sonidoConfirmacion: true,
  vibracion: false,
  modoInventarioContinuo: false,
  prefijo: '',
  sufijo: 'Enter (CR)'
};

export const pistolasScannerMock: PistolaScanner[] = [
  {
    id: '1',
    nombre: 'Pistola POS Principal',
    marca: 'Honeywell',
    modelo: 'Honeywell Voyager 1202g',
    numeroSerie: 'HNW-4821-POS1',
    tipoConexion: 'USB HID',
    puerto: 'COM3',
    terminalAsignada: 'POS Principal',
    estado: 'conectado',
    lecturasHoy: 213,
    erroresHoy: 2,
    firmware: 'v5.2.1',
    bateria: null,
    ultimaLectura: new Date(),
    configuracion: { ...configDefault },
    creadoEn: new Date('2024-01-15')
  },
  {
    id: '2',
    nombre: 'Pistola Inventario',
    marca: 'Zebra',
    modelo: 'Zebra DS2208-SR',
    numeroSerie: 'ZBR-9034-INV',
    tipoConexion: 'USB HID',
    puerto: 'COM4',
    terminalAsignada: 'Inventario',
    estado: 'conectado',
    lecturasHoy: 87,
    erroresHoy: 0,
    firmware: 'v3.1.0',
    bateria: null,
    ultimaLectura: new Date(),
    configuracion: { ...configDefault },
    creadoEn: new Date('2024-02-10')
  },
  {
    id: '3',
    nombre: 'Pistola Móvil',
    marca: 'Datalogic',
    modelo: 'Datalogic QuickScan QD2430',
    numeroSerie: 'DTL-1156-MOV',
    tipoConexion: 'Bluetooth SPP',
    puerto: 'BT-CH1',
    terminalAsignada: 'Móvil / Tablet',
    estado: 'desconectado',
    lecturasHoy: 0,
    erroresHoy: 0,
    firmware: 'v2.4.3',
    bateria: 63,
    ultimaLectura: null,
    configuracion: { ...configDefault },
    creadoEn: new Date('2024-03-05')
  },
  {
    id: '4',
    nombre: 'Pistola Recepción',
    marca: 'Newland',
    modelo: 'Newland NLS-HR3280',
    numeroSerie: 'NWL-7723-REC',
    tipoConexion: 'RS-232 Serial',
    puerto: 'COM2',
    terminalAsignada: 'Recepción',
    estado: 'configurando',
    lecturasHoy: 34,
    erroresHoy: 5,
    firmware: 'v1.9.2',
    bateria: null,
    ultimaLectura: new Date(Date.now() - 86400000),
    configuracion: { ...configDefault, codigos1D: true, codigosQR: false },
    creadoEn: new Date('2024-03-20')
  }
];

export const codigosSimulados: string[] = [
  '7702091030057',
  '7750201040043',
  'ACE-5W30-1L',
  'FLT-AIR-001',
  'BUJ-NGK-001',
  '7501031313006',
  '194252137239',
  'FRN-DEL-001'
];
