
export type StorageType = 'LOCAL' | 'S3' | 'GCS' | 'AZURE' | 'FTP' | 'DROPBOX' | 'GDRIVE';

export interface StorageConfig {
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
}

export interface BackupSchedule {
  id: string;
  businessId: string;
  name: string;
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  backupType: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL';
  storageType: StorageType;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Backup {
  id: string;
  businessId: string;
  name: string;
  type: 'FULL' | 'INCREMENTAL' | 'DIFFERENTIAL' | 'SELECTIVE';
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  storageType: StorageType;
  sizeBytes: number;
  filePath: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface BackupRestore {
  id: string;
  backupId: string;
  businessId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ROLLBACK';
  restoreMode: 'FULL' | 'SELECTIVE';
  initiatedBy: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
}
