import { Vehicle, EngineStatus } from './types';

export const MOCK_VEHICLE: Vehicle = {
  vin: 'KNAH2348571029384',
  nickname: 'My IONIQ 5',
  modelName: 'IONIQ 5',
  year: 2024,
  color: 'Gravity Gold Matte',
  status: {
    engine: EngineStatus.OFF,
    doors: {
      locked: true,
      hoodOpen: false,
      trunkOpen: false,
      frontLeftOpen: false,
      frontRightOpen: false,
      backLeftOpen: false,
      backRightOpen: false,
    },
    climate: {
      active: false,
      temperature: 72,
      defrost: false,
    },
    battery: {
      percentage: 82,
      range: 246,
      charging: false,
    },
    odometer: 12450,
    lastUpdated: new Date().toISOString(),
  },
  location: {
    latitude: 37.7749,
    longitude: -122.4194,
    address: '123 Innovation Dr, Tech City, CA',
    updatedAt: new Date().toISOString(),
  }
};

// Tailwind classes for status badges
export const STATUS_STYLES = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  neutral: 'bg-slate-700/30 text-slate-300 border-slate-600/30',
};