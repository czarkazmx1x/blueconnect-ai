import React, { useState, useEffect } from 'react';
import { VehicleStatus, LocationData, EngineStatus, AIAnalysisStatus, Vehicle } from '../types';
import { BlueLinkyVehicle } from '../services/vehicleService';
import * as GeminiService from '../services/geminiService';
import { Icons } from './Icons';
import { STATUS_STYLES } from '../constants';
import MapVisualization from './MapVisualization';

interface DashboardProps {
  vehicleController: BlueLinkyVehicle;
  onLogout: () => void;
}

const StatusItem = ({ label, isOpen }: { label: string; isOpen: boolean }) => (
  <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${isOpen ? 'bg-rose-900/20 border-rose-500/30 shadow-lg shadow-rose-900/20' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}>
      <div className={`p-2 rounded-full ${isOpen ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
         {isOpen ? <Icons.AlertTriangle size={18} /> : <Icons.ShieldCheck size={18} />}
      </div>
      <div className="text-center">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</span>
          <span className={`text-xs font-bold ${isOpen ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isOpen ? 'OPEN' : 'CLOSED'}
          </span>
      </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ vehicleController, onLogout }) => {
  // We keep a local copy of the data state to render the UI
  const [status, setStatus] = useState<VehicleStatus | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AIAnalysisStatus>('idle');
  const [aiMessage, setAiMessage] = useState<string>('');
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);

  useEffect(() => {
    fetchData();
  }, [vehicleController]);

  // Haptic feedback helper
  const triggerHaptic = (pattern: 'light' | 'success' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      switch (pattern) {
        case 'light': 
          navigator.vibrate(15); 
          break;
        case 'success': 
          navigator.vibrate([50, 50]); 
          break;
        case 'error': 
          navigator.vibrate([50, 100, 50, 100, 50]); 
          break;
      }
    }
  };

  const handleAuthError = (error: any) => {
    if (error.message === 'AUTH_EXPIRED') {
        alert("Session expired. Please log in again.");
        onLogout();
        return true;
    }
    return false;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Use the adapter methods
      const currentData = await vehicleController.data();
      setStatus(currentData.status);
      setLocation(currentData.location);
    } catch (e: any) {
      console.error("Failed to load data", e);
      handleAuthError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'lock' | 'unlock' | 'start' | 'stop') => {
    triggerHaptic('light'); // Feedback on button press
    if (!status) return;
    setActionInProgress(action);
    try {
      if (action === 'lock') await vehicleController.lock();
      if (action === 'unlock') await vehicleController.unlock();
      if (action === 'start') await vehicleController.start({ airCtrl: true, duration: 10 });
      if (action === 'stop') await vehicleController.stop();
      
      triggerHaptic('success'); // Feedback on success

      // Refresh status after action
      const newStatus = await vehicleController.status();
      setStatus(newStatus);
    } catch (error: any) {
      triggerHaptic('error'); // Feedback on error
      console.error("Action failed", error);
      if (!handleAuthError(error)) {
        alert("Command failed. Please try again.");
      }
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRefreshRequest = () => {
    triggerHaptic('light');
    setShowRefreshConfirm(true);
  };

  const performRefresh = async () => {
    triggerHaptic('light');
    setShowRefreshConfirm(false);
    if (!status) return;
    setActionInProgress('refresh');
    try {
      const newStatus = await vehicleController.status({ refresh: true });
      setStatus(newStatus);
      // Also update location on refresh usually
      const newLoc = await vehicleController.location();
      setLocation(newLoc);
      triggerHaptic('success');
    } catch (error: any) {
      triggerHaptic('error');
      console.error("Refresh failed", error);
      handleAuthError(error);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLocate = async () => {
      triggerHaptic('light');
      setActionInProgress('locate');
      try {
        const newLoc = await vehicleController.location();
        setLocation(newLoc);
        triggerHaptic('success');
      } catch (e: any) {
        triggerHaptic('error');
        console.error(e);
        handleAuthError(e);
      } finally {
        setActionInProgress(null);
      }
  };

  const runAIAnalysis = async () => {
    triggerHaptic('light');
    if (!status) return;
    setAiStatus('analyzing');
    const message = await GeminiService.analyzeVehicleHealth(status, vehicleController.modelName);
    setAiMessage(message);
    setAiStatus('complete');
    triggerHaptic('success');
  };

  if (loading || !status || !location) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-blue-400">
        <div className="flex flex-col items-center gap-4">
          <Icons.RefreshCw className="animate-spin w-12 h-12" />
          <p className="text-slate-400 animate-pulse">Connecting to {vehicleController.modelName}...</p>
        </div>
      </div>
    );
  }

  const isLocked = status.doors.locked;
  const isEngineOn = status.engine === EngineStatus.ON;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-20 relative">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-md sticky top-0 z-40 border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Icons.Car className="text-white" size={24} />
             </div>
             <div>
                <h1 className="font-bold text-lg leading-none text-white">BlueConnect</h1>
                <span className="text-xs text-slate-400">{vehicleController.nickname}</span>
             </div>
          </div>
          <button 
            onClick={onLogout}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        
        {/* Hero / Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Car Image & Quick Status */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isLocked ? STATUS_STYLES.success : STATUS_STYLES.warning}`}>
                    {isLocked ? 'SECURE' : 'UNLOCKED'}
                </span>
            </div>
            
            <div className="mt-8 flex justify-center py-8">
                <div className="relative w-64 h-32 bg-gradient-to-b from-blue-500/10 to-transparent rounded-xl flex items-center justify-center border border-blue-500/20">
                    <Icons.Car size={80} className="text-blue-400 opacity-80" />
                    <div className="absolute bottom-2 text-xs text-blue-300 font-mono uppercase tracking-widest">
                        {vehicleController.modelName}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4">
                 <div className="bg-slate-950/50 rounded-xl p-3 text-center border border-slate-800">
                    <Icons.Battery className={`mx-auto mb-1 ${status.battery && status.battery.percentage > 20 ? 'text-emerald-400' : 'text-amber-400'}`} size={20} />
                    <div className="text-lg font-bold text-white">{status.battery?.percentage}%</div>
                    <div className="text-[10px] text-slate-500 uppercase">Battery</div>
                 </div>
                 <div className="bg-slate-950/50 rounded-xl p-3 text-center border border-slate-800">
                    <Icons.Gauge className="mx-auto mb-1 text-blue-400" size={20} />
                    <div className="text-lg font-bold text-white">{status.battery?.range}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Mi Range</div>
                 </div>
                 <div className="bg-slate-950/50 rounded-xl p-3 text-center border border-slate-800">
                    <Icons.Thermometer className="mx-auto mb-1 text-rose-400" size={20} />
                    <div className="text-lg font-bold text-white">{status.climate.temperature}°</div>
                    <div className="text-[10px] text-slate-500 uppercase">Cabin</div>
                 </div>
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-2 gap-4">
             <button 
                disabled={!!actionInProgress}
                onClick={() => handleAction(isLocked ? 'unlock' : 'lock')}
                className={`group relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 overflow-hidden
                  ${isLocked 
                    ? 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-slate-750' 
                    : 'bg-amber-900/20 border-amber-500/30 hover:bg-amber-900/30'}`}
             >
                <div className={`p-3 rounded-full ${isLocked ? 'bg-slate-700 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {actionInProgress === 'lock' || actionInProgress === 'unlock' ? (
                        <Icons.RefreshCw className="animate-spin" size={24} />
                    ) : (
                        isLocked ? <Icons.Lock size={24} /> : <Icons.Unlock size={24} />
                    )}
                </div>
                <span className="font-medium text-sm">{isLocked ? 'Unlock Vehicle' : 'Lock Vehicle'}</span>
             </button>

             <button 
                disabled={!!actionInProgress}
                onClick={() => handleAction(isEngineOn ? 'stop' : 'start')}
                className={`group relative p-4 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center gap-3 overflow-hidden
                  ${isEngineOn 
                    ? 'bg-emerald-900/20 border-emerald-500/30 hover:bg-emerald-900/30' 
                    : 'bg-slate-800 border-slate-700 hover:border-blue-500 hover:bg-slate-750'}`}
             >
                 <div className={`p-3 rounded-full ${isEngineOn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400 group-hover:text-white'}`}>
                    {actionInProgress === 'start' || actionInProgress === 'stop' ? (
                        <Icons.RefreshCw className="animate-spin" size={24} />
                    ) : (
                        <Icons.Power size={24} />
                    )}
                </div>
                <span className="font-medium text-sm">{isEngineOn ? 'Stop Engine' : 'Start Engine'}</span>
             </button>

             <div className="col-span-2">
                <MapVisualization 
                    location={location} 
                    loading={actionInProgress === 'locate'}
                    onRefresh={handleLocate}
                />
             </div>
          </div>
        </div>

        {/* Detailed Energy & Fuel Status */}
        {(status.battery || status.fuel) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {status.battery && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group transition-all hover:border-slate-700">
                    <div className="absolute -right-4 -top-4 text-slate-800/40 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                        <Icons.Zap size={140} />
                    </div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-2 text-emerald-400">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Icons.Battery size={20} />
                                </div>
                                <h3 className="font-semibold text-sm uppercase tracking-wider">Battery Status</h3>
                             </div>
                             {status.battery.charging && (
                                 <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wide animate-pulse">
                                     <Icons.Zap size={12} fill="currentColor" />
                                     <span>Charging</span>
                                 </div>
                             )}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                             <div>
                                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Level</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-white">{status.battery.percentage}</span>
                                    <span className="text-lg text-slate-400">%</span>
                                </div>
                             </div>
                             <div>
                                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Range</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-white">{status.battery.range}</span>
                                    <span className="text-lg text-slate-400">mi</span>
                                </div>
                             </div>
                        </div>
                        
                        <div className="mt-6">
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${status.battery.charging ? 'bg-emerald-400' : 'bg-emerald-500'}`}
                                    style={{ width: `${status.battery.percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
             )}

             {status.fuel && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group transition-all hover:border-slate-700">
                     <div className="absolute -right-4 -top-4 text-slate-800/40 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                        <Icons.Fuel size={140} />
                     </div>
                     
                     <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                             <div className="flex items-center gap-2 text-amber-400">
                                <div className="p-2 bg-amber-500/10 rounded-lg">
                                    <Icons.Fuel size={20} />
                                </div>
                                <h3 className="font-semibold text-sm uppercase tracking-wider">Fuel Status</h3>
                             </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                             <div>
                                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Level</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-white">{status.fuel.level}</span>
                                    <span className="text-lg text-slate-400">%</span>
                                </div>
                             </div>
                             <div>
                                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Range</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-bold text-white">{status.fuel.range}</span>
                                    <span className="text-lg text-slate-400">mi</span>
                                </div>
                             </div>
                        </div>
                        
                        <div className="mt-6">
                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${status.fuel.level}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
             )}
        </div>
        )}

        {/* Detailed Status Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6">
             <div className="flex items-center gap-2 mb-4 text-slate-400">
                <Icons.ShieldCheck size={20} />
                <h3 className="font-semibold text-sm uppercase tracking-wider">Entry Points Status</h3>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <StatusItem label="Hood" isOpen={status.doors.hoodOpen} />
                <StatusItem label="Trunk" isOpen={status.doors.trunkOpen} />
                <StatusItem label="Front Left" isOpen={status.doors.frontLeftOpen} />
                <StatusItem label="Front Right" isOpen={status.doors.frontRightOpen} />
                <StatusItem label="Back Left" isOpen={status.doors.backLeftOpen} />
                <StatusItem label="Back Right" isOpen={status.doors.backRightOpen} />
             </div>
        </div>

        {/* AI Assistant Section */}
        <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-2 text-indigo-400">
                <Icons.Sparkles size={20} />
                <h3 className="font-semibold">AI Health Check</h3>
             </div>
             {aiStatus !== 'idle' && aiStatus !== 'analyzing' && (
                 <button onClick={runAIAnalysis} className="text-xs text-indigo-300 hover:text-indigo-200 underline">Refresh Analysis</button>
             )}
          </div>
          
          {aiStatus === 'idle' ? (
             <button 
                onClick={runAIAnalysis}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
             >
                Run Diagnostics Analysis
             </button>
          ) : aiStatus === 'analyzing' ? (
             <div className="flex items-center gap-3 text-slate-300 animate-pulse">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                <span className="text-sm">Analyzing telemetry data...</span>
             </div>
          ) : (
             <div className="bg-slate-950/50 rounded-xl p-4 border border-indigo-500/10">
                <p className="text-slate-300 text-sm leading-relaxed">
                    {aiMessage}
                </p>
             </div>
          )}
        </div>

        {/* Last Updated Footer */}
        <div className="flex justify-between items-center text-xs text-slate-500 px-2">
            <span>VIN: {vehicleController.vin}</span>
            <div className="flex items-center gap-2">
                <span>Updated: {new Date(status.lastUpdated).toLocaleTimeString()}</span>
                <button onClick={handleRefreshRequest} disabled={!!actionInProgress}>
                    <Icons.RefreshCw size={12} className={actionInProgress === 'refresh' ? 'animate-spin text-blue-400' : 'hover:text-slate-300'} />
                </button>
            </div>
        </div>

      </main>

      {/* Refresh Confirmation Modal */}
      {showRefreshConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                <Icons.RefreshCw size={24} />
              </div>
              <h3 className="text-lg font-bold text-white">Refresh Status?</h3>
            </div>
            
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              This will wake up your vehicle to fetch the latest telemetry data. This process may take a few moments and consume a small amount of vehicle battery.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefreshConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performRefresh}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-lg shadow-blue-500/20"
              >
                Confirm Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;