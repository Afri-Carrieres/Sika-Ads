import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, Megaphone, CheckCircle2, User, Menu } from 'lucide-react';

interface BottomNavigationProps {
  currentTab: string;
  onMenuClick: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentTab, onMenuClick }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, route: '/app/dashboard' },
    { id: 'marketplace', label: 'Campagnes', icon: Megaphone, route: '/app/marketplace' },
    { id: 'tasks', label: 'Preuves', icon: CheckCircle2, route: '/app/tasks' },
    { id: 'profile', label: 'Profil', icon: User, route: '/profile' },
  ];

  // Determine active state - group campaign-related tabs under "Campagnes"
  const isTabActive = (itemId: string) => {
    if (itemId === 'marketplace') {
      return currentTab === 'marketplace' || currentTab === 'create-campaign' || currentTab === 'my-campaigns';
    }
    return currentTab === itemId;
  };

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = isTabActive(item.id);
          return (
            <Link
              key={item.id}
              to={item.route}
              className={`
                flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-2 py-2 rounded-lg transition-all duration-200
                ${isActive
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon
                size={22}
                className={isActive ? 'stroke-[2.5]' : 'stroke-[2]'}
              />
              <span className={`text-[11px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
        
        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] px-2 py-2 rounded-lg text-gray-500 hover:text-gray-700 transition-all duration-200"
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} className="stroke-[2]" />
          <span className="text-[11px] font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;
