export interface User {
  email: string;
  name: string;
}

export enum LockStatus {
  LOCKED = 'LOCKED',
  UNLOCKED = 'UNLOCKED',
}

export enum EngineStatus {
  OFF = 'OFF',
  ON = 'ON',
}

export interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
  updatedAt: string;
}

export interface VehicleStatus {
  engine: EngineStatus;
  doors: {
    locked: boolean;
    hoodOpen: boolean;
    trunkOpen: boolean;
    frontLeftOpen: boolean;
    frontRightOpen: boolean;
    backLeftOpen: boolean;
    backRightOpen: boolean;
  };
  climate: {
    active: boolean;
    temperature: number;
    defrost: boolean;
  };
  battery?: {
    percentage: number;
    range: number;
    charging: boolean;
  };
  fuel?: {
    level: number;
    range: number;
  };
  odometer: number;
  lastUpdated: string;
}

export interface Vehicle {
  vin: string;
  nickname: string;
  modelName: string;
  year: number;
  color: string;
  imageUrl?: string;
  status: VehicleStatus;
  location: LocationData;
}

export type AIAnalysisStatus = 'idle' | 'analyzing' | 'complete' | 'error';