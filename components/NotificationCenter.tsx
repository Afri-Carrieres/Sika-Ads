
import React from 'react';
import { Notification } from '../types';
import { Bell, Megaphone, CheckCircle2, Wallet, Info, X } from 'lucide-react';

interface NotificationCenterProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onClose, onMarkAsRead }) => {
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'campaign': return <Megaphone className="text-blue-500" size={16} />;
      case 'status': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'payout': return <Wallet className="text-orange-500" size={16} />;
      default: return <Info className="text-indigo-500" size={16} />;
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] animate-in slide-in-from-top-2 duration-200 overflow-hidden">
      <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-indigo-50/50">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Bell size={18} className="text-indigo-600" />
          Notifications
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={18} />
        </button>
      </div>
      
      <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Bell size={32} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">Pas de nouvelles notifications</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif.id} 
              onClick={() => onMarkAsRead(notif.id)}
              className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${!notif.read ? 'bg-indigo-50/30' : ''}`}
            >
              <div className="flex gap-3">
                <div className="mt-1">{getIcon(notif.type)}</div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-gray-900">{notif.title}</h4>
                    {!notif.read && <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {notifications.length > 0 && (
        <button className="w-full py-3 text-xs font-bold text-indigo-600 hover:bg-gray-50 transition-colors border-t border-gray-50">
          Voir tout l'historique
        </button>
      )}
    </div>
  );
};

export default NotificationCenter;
