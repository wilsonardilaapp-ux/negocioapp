export interface Printer {
  id: string;
  name: string;
  type: 'thermal' | 'inkjet' | 'laser';
  connection: 'usb' | 'network' | 'bluetooth' | 'wifi';
  ipAddress?: string;
  port?: number;
  paperWidth: 58 | 80;
  isDefault: boolean;
  status: 'online' | 'offline' | 'error';
  lastUsed?: string; // Storing date as ISO string
}
