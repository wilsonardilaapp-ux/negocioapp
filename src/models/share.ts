
export interface QRConfig {
  size: number;
  foregroundColor: string;
  backgroundColor: string;
  logoUrl?: string | null;
  logoSize: number;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  style: 'squares' | 'dots';
}

export interface MenuShare {
  id: string;
  businessId: string;
  slug: string;
  qrConfig: QRConfig;
  totalViews: number;
  totalScans: number;
  totalShares: number;
  lastViewedAt?: string; // ISO string
  isActive: boolean;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
