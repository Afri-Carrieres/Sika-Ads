import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // in ms, 0 = persistent
}

interface ToastProps extends ToastMessage {
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, title, message, type, duration = 5000, onClose }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const bgColor = {
    success: 'bg-green-600 border-green-500/20',
    error: 'bg-red-600 border-red-500/20',
    warning: 'bg-amber-600 border-amber-500/20',
    info: 'bg-indigo-600 border-indigo-500/20'
  }[type];

  const icon = {
    success: <CheckCircle2 size={24} />,
    error: <AlertCircle size={24} />,
    warning: <AlertTriangle size={24} />,
    info: <Info size={24} />
  }[type];

  return (
    <div 
      className={`fixed top-24 right-4 z-[200] px-6 py-4 rounded-2xl shadow-xl border flex items-start gap-3 animate-in slide-in-from-right duration-300 max-w-sm w-full ${bgColor} text-white`}
    >
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="font-black uppercase text-xs tracking-widest mb-1">{title}</p>
        <p className="text-sm font-medium leading-snug opacity-95">{message}</p>
      </div>
      <button 
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export default Toast;
