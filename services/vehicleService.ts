import { Vehicle as VehicleData, VehicleStatus, LocationData } from '../types';

// Safely handle import.meta.env for both Vite and raw browser environments
const getBaseUrl = () => {
  // Vite exposes env vars through import.meta.env
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback for development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';
  }
  // Production fallback
  return 'https://blueconnect-backend.onrender.com/api';
};

const API_BASE_URL = getBaseUrl();

export class BlueLinkyVehicle {
  vin: string;
  nickname: string;
  modelName: string;
  
  constructor(data: VehicleData) {
    this.vin = data.vin;
    this.nickname = data.nickname;
    this.modelName = data.modelName;
  }

  // Helper for fetch requests
  private async request(endpoint: string, method: string = 'GET', body?: any) {
    const headers = { 'Content-Type': 'application/json' };
    const config: RequestInit = { method, headers };
    if (body) config.body = JSON.stringify(body);

    const res = await fetch(`${API_BASE_URL}/vehicles/${this.vin}${endpoint}`, config);
    
    if (res.status === 401) {
        throw new Error('AUTH_EXPIRED');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `Request failed: ${res.statusText}`);
    }
    return res.json();
  }

  // Fetch fresh data (combining status and location for the UI)
  async data(): Promise<VehicleData> {
    // In a real app, we might run these in parallel
    const status = await this.status({ refresh: false }); // Don't force refresh by default on load
    let location = { latitude: 0, longitude: 0, address: 'Unknown', updatedAt: new Date().toISOString() };
    
    try {
        location = await this.location();
    } catch (e) {
        console.warn("Could not fetch location", e);
    }

    return {
        vin: this.vin,
        nickname: this.nickname,
        modelName: this.modelName,
        year: 2024, 
        color: 'N/A',
        status,
        location
    };
  }

  async status(config?: { refresh: boolean }): Promise<VehicleStatus> {
    return this.request('/status', 'POST', { refresh: config?.refresh });
  }

  async location(): Promise<LocationData> {
    return this.request('/location', 'GET');
  }

  async lock(): Promise<string> {
    const res = await this.request('/lock', 'POST');
    return res.result;
  }

  async unlock(): Promise<string> {
    const res = await this.request('/unlock', 'POST');
    return res.result;
  }

  async start(config?: { airCtrl: boolean; duration: number }): Promise<string> {
    const res = await this.request('/start', 'POST', config);
    return res.result;
  }

  async stop(): Promise<string> {
    const res = await this.request('/stop', 'POST');
    return res.result;
  }
}

export default class BlueLinkyClient {
  constructor(private credentials: { username?: string; password?: string; region?: string; pin?: string }) {}

  async login(): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.credentials)
    });

    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Login failed');
    }
  }

  async getVehicles(): Promise<BlueLinkyVehicle[]> {
    const res = await fetch(`${API_BASE_URL}/vehicles`);
    
    if (res.status === 401) throw new Error('AUTH_EXPIRED');
    if (!res.ok) throw new Error('Failed to fetch vehicles');
    
    const data = await res.json();
    return data.map((v: any) => new BlueLinkyVehicle(v));
  }
}