import React from 'react';
import { AlertTriangle, Bell, X } from 'lucide-react';

interface Alert {
  _id: string;
  mensaje: string;
  fecha: string;
  desviacion?: number;
  categoria?: string;
}

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null;

  const latestAlert = alerts[0];

  return (
    <div className="relative overflow-hidden mb-8 rounded-xl border border-zinc-800 bg-[#f4f4f5] text-[#09090b] p-5 shadow-2xl animate-fade-in">
      <div className="flex items-start md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-4">
          <div className="p-2 bg-black text-white rounded-lg flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest bg-black text-white px-2 py-0.5 rounded">
                ALERTA FINANCIERA
              </span>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1 font-mono">
                <Bell className="h-3 w-3" /> {new Date(latestAlert.fecha).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-1 text-sm md:text-base font-bold tracking-tight">
              {latestAlert.mensaje}
            </p>
          </div>
        </div>
        
        <button 
          onClick={onDismiss}
          className="p-1.5 hover:bg-black/5 text-[#09090b]/80 hover:text-black rounded-lg transition-colors border border-transparent"
          aria-label="Dismiss alert"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
