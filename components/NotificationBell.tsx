import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase';
import { Notification } from '../types';
import { Bell, BellOff, CheckCircle2, AlertCircle, Info, XCircle, Megaphone, Wallet, FlashlightIcon } from 'lucide-react';

const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [personalNotifs, setPersonalNotifs] = useState<Notification[]>([]);
  const [globalNotifs, setGlobalNotifs] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPersonalNotifs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('userId', session.user.id)
      .order('createdAt', { ascending: false });

    if (error) {
      console.warn("Error fetching personal notifications:", error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setPersonalNotifs(data.map(d => ({
        id: d.id,
        title: d.title,
        message: d.message,
        type: d.type,
        read: d.read,
        createdAt: d.createdAt,
        isPersonal: true
      })) as any);
    }
    setLoading(false);
  };

  const fetchGlobalAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(5);

    if (error) {
      // announcements might not exist or be disabled, log but don't crash
      console.log("Global notifications/announcements not active or table missing:", error.message);
      return;
    }

    if (data) {
      const readAnnouncements = JSON.parse(localStorage.getItem('read_announcements') || '[]');
      setGlobalNotifs(data.map(d => ({
        id: d.id,
        title: d.title,
        message: d.content,
        type: 'announcement',
        read: readAnnouncements.includes(d.id),
        createdAt: d.createdAt,
        isGlobalAnnouncement: true
      })) as any);
    }
  };

  // Écouteurs temps réel Supabase
  useEffect(() => {
    fetchPersonalNotifs();
    fetchGlobalAnnouncements();

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications'
      }, () => {
        fetchPersonalNotifs();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'announcements'
      }, () => {
        fetchGlobalAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Merge and sort notifications
  useEffect(() => {
    const getTimestamp = (notif: Notification) => {
      const raw = notif.createdAt as any;
      const d = new Date(raw || 0);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    };

    const combined = [...personalNotifs, ...globalNotifs].sort((a, b) => {
      return getTimestamp(b) - getTimestamp(a);
    });
    setNotifications(combined);
  }, [personalNotifs, globalNotifs]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Handler stable pour marquer comme lu
  const handleMarkAsRead = useCallback(async (notification: Notification) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (notification.read || !session?.user) return;

    const isGlobal = (notification as any).isGlobalAnnouncement === true;
    const { id } = notification;

    if (isGlobal) {
      const readAnnouncements = JSON.parse(localStorage.getItem('read_announcements') || '[]');
      if (!readAnnouncements.includes(id)) {
        readAnnouncements.push(id);
        localStorage.setItem('read_announcements', JSON.stringify(readAnnouncements));
        setGlobalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } else {
      // Optimistic state update
      setPersonalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('userId', session.user.id);

      if (error) {
        console.error("Error marking notification as read:", error.message);
      }
    }
  }, [personalNotifs]);

  const markAllAsRead = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const unreadPersonal = personalNotifs.filter(n => !n.read);
      if (unreadPersonal.length > 0) {
        setPersonalNotifs(prev => prev.map(n => ({ ...n, read: true })));
        
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('userId', session.user.id)
          .eq('read', false);

        if (error) {
          console.warn("Error marking all notifications as read:", error.message);
        }
      }

      const unreadGlobal = globalNotifs.filter(n => !n.read);
      if (unreadGlobal.length > 0) {
        const readAnnouncements = JSON.parse(localStorage.getItem('read_announcements') || '[]');
        const newIds = unreadGlobal.map(n => n.id);
        const updatedRead = [...new Set([...readAnnouncements, ...newIds])];
        localStorage.setItem('read_announcements', JSON.stringify(updatedRead));
        setGlobalNotifs(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error("Erreur générale lors du marquage:", error);
    }
  }, [personalNotifs, globalNotifs]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "À l'instant";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Date inconnue";
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationStyle = (type: Notification['type']) => {
    switch (type) {
      case 'status':
        return {
          icon: <CheckCircle2 size={18} className="text-green-500" />,
          bg: 'bg-green-50/50 hover:bg-green-50',
          border: 'border-green-100'
        };
      case 'payout':
        return {
          icon: <Wallet size={18} className="text-orange-500" />,
          bg: 'bg-orange-50/50 hover:bg-orange-50',
          border: 'border-orange-100'
        };
      case 'campaign':
        return {
          icon: <Megaphone size={18} className="text-[#128686]" />,
          bg: 'bg-[#E7F4F4]/50 hover:bg-[#E7F4F4]',
          border: 'border-[#128686]/20'
        };
      case 'rejected':
        return {
          icon: <XCircle size={18} className="text-red-500" />,
          bg: 'bg-red-50/50 hover:bg-red-50',
          border: 'border-red-100'
        };
      case 'announcement':
        return {
          icon: <Megaphone size={18} className="text-[#0E6B6B]" />,
          bg: 'bg-[#0E6B6B]/10 hover:bg-[#0E6B6B]/20',
          border: 'border-[#0E6B6B]/20'
        };
      default:
        return {
          icon: <Info size={18} className="text-[#2BA8A8]" />,
          bg: 'bg-[#2BA8A8]/10 hover:bg-[#2BA8A8]/20',
          border: 'border-[#2BA8A8]/20'
        };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-3 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all relative ${unreadCount > 0 ? 'ring-2 ring-[#9ED0D0]' : ''}`}
      >
        <Bell size={20} className={unreadCount > 0 ? 'animate-bounce' : ''} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white translate-x-1/3 -translate-y-1/3 shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[100] animate-in slide-in-from-top-2 duration-200 overflow-hidden origin-top-right">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="bg-[#D9ECEC] text-[#0E6B6B] text-[10px] px-2 py-0.5 rounded-full">
                  {unreadCount} nouvelles
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-[#128686] hover:text-[#0A4F50] transition-colors"
              >
                Tout lire
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50 scrollbar-hide">
            {loading ? (
              <div className="p-8 text-center text-gray-400">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-gray-300 flex flex-col items-center gap-3">
                <BellOff size={32} strokeWidth={1.5} />
                <p className="text-sm font-medium">Aucune notification</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const style = getNotificationStyle(notif.type);
                return (
                  <div
                    key={notif.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMarkAsRead(notif);
                    }}
                    className={`p-4 cursor-pointer transition-all border-l-4 ${!notif.read ? `${style.bg} ${style.border} border-l-[#128686]` : 'bg-white hover:bg-gray-50 border-l-transparent border-transparent'}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 shrink-0">{style.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-sm font-bold truncate ${!notif.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notif.title}
                          </h4>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-red-500 rounded-full shrink-0 mt-1.5 shadow-sm"></span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 leading-relaxed ${!notif.read ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium flex items-center gap-1">
                          {formatDate(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
