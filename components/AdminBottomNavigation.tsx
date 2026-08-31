import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Megaphone, CheckCircle2, Wallet, Menu } from 'lucide-react';

interface AdminBottomNavigationProps {
  currentTab: string;
  onMenuClick: () => void;
}

const AdminBottomNavigation: React.FC<AdminBottomNavigationProps> = ({ currentTab, onMenuClick }) => {
  const navItems = [
    { id: 'admin-dashboard', label: 'Vue d\u2019ensemble', icon: LayoutDashboard, route: '/app/admin-dashboard' },
    { id: 'admin-campaigns', label: 'Campagnes', icon: Megaphone, route: '/app/admin-campaigns' },
    { id: 'admin-validation', label: 'Validations', icon: CheckCircle2, route: '/app/admin-validation' },
    { id: 'admin-withdrawals', label: 'Retraits', icon: Wallet, route: '/app/admin-withdrawals' },
  ];

  const isTabActive = (itemId: string) => {
    return currentTab === itemId;
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F172A] border-t border-indigo-800/30 shadow-lg"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Navigation administrateur"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = isTabActive(item.id);
          return (
            <Link
              key={item.id}
              to={item.route}
              className={`
                flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[44px] px-1 py-2 rounded-lg transition-all duration-200
                ${isActive
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
                }
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-200 ${isActive ? 'bg-indigo-600' : ''}`}>
                <item.icon
                  size={20}
                  className={isActive ? 'stroke-[2.5]' : 'stroke-[2]'}
                />
              </div>
              <span className={`text-[10px] leading-tight text-center truncate max-w-full ${isActive ? 'font-bold text-white' : 'font-medium text-slate-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 min-h-[44px] px-1 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-all duration-200"
          aria-label="Ouvrir le menu"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg">
            <Menu size={20} className="stroke-[2]" />
          </div>
          <span className="text-[10px] leading-tight font-medium text-slate-400">Menu</span>
        </button>
      </div>
    </nav>
  );
};

export default AdminBottomNavigation;
