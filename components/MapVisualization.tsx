import React from 'react';
import { LocationData } from '../types';
import { Icons } from './Icons';

interface MapVisualizationProps {
  location: LocationData;
  loading: boolean;
  onRefresh: () => void;
}

const MapVisualization: React.FC<MapVisualizationProps> = ({ location, loading, onRefresh }) => {
  return (
    <div className="relative w-full h-64 bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 group">
      {/* Abstract Map Background */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full bg-slate-900" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Decorative paths to look like roads */}
          <path d="M0 100 Q 150 50 300 150 T 600 100" fill="none" stroke="#475569" strokeWidth="8" />
          <path d="M100 300 Q 250 200 400 300" fill="none" stroke="#475569" strokeWidth="6" />
        </svg>
      </div>

      {/* Pin */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
        <div className="relative">
          <div className="absolute -inset-4 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50 text-white z-10">
            <Icons.Car size={16} />
          </div>
        </div>
        <div className="mt-2 bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-slate-700 text-xs font-medium text-slate-300 whitespace-nowrap shadow-xl">
          {location.address}
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4">
        <button 
          onClick={onRefresh}
          disabled={loading}
          className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg shadow-lg transition-all disabled:opacity-50"
          aria-label="Refresh Location"
        >
          <Icons.RefreshCw size={20} className={`${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-slate-700">
         Updated: {new Date(location.updatedAt).toLocaleTimeString()}
      </div>
    </div>
  );
};

export default MapVisualization;