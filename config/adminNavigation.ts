import { LayoutDashboard, Megaphone, CheckCircle2, Wallet, CreditCard, Crown, Users, ShieldCheck, Check, User } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  route: string;
  permission?: 'ADMIN' | 'MODERATOR';
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const getAdminNavigation = (userRole: 'ADMIN' | 'MODERATOR' | null): NavGroup[] => {
  const principal: NavGroup = {
    id: 'principal',
    label: 'PRINCIPAL',
    collapsible: false,
    defaultOpen: true,
    items: [
      { id: 'admin-dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard, route: '/app/admin-dashboard' },
      { id: 'admin-campaigns', label: 'Campagnes', icon: Megaphone, route: '/app/admin-campaigns' },
      { id: 'admin-validation', label: 'Validations', icon: CheckCircle2, route: '/app/admin-validation' },
      { id: 'admin-withdrawals', label: 'Retraits', icon: Wallet, route: '/app/admin-withdrawals' },
    ],
  };

  const gestion: NavGroup = {
    id: 'gestion',
    label: 'GESTION',
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: 'admin-campaign-payments', label: 'Paiements Campagnes', icon: CreditCard, route: '/app/admin-campaign-payments', permission: 'ADMIN' },
      { id: 'admin-create-vip', label: 'Création VIP', icon: Crown, route: '/app/admin-create-vip', permission: 'ADMIN' },
      { id: 'admin-payouts', label: 'Finances', icon: CreditCard, route: '/app/admin-payouts', permission: 'ADMIN' },
    ],
  };

  const utilisateurs: NavGroup = {
    id: 'utilisateurs',
    label: 'UTILISATEURS',
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: 'admin-users', label: 'Utilisateurs', icon: Users, route: '/app/admin-users', permission: 'ADMIN' },
      { id: 'admin-team', label: 'Mon Équipe', icon: ShieldCheck, route: '/app/admin-team', permission: 'ADMIN' },
    ],
  };

  const outils: NavGroup = {
    id: 'outils',
    label: 'OUTILS',
    collapsible: true,
    defaultOpen: true,
    items: [
      { id: 'admin-gombo-status', label: 'Vérif GomboPlus', icon: Check, route: '/app/admin-gombo-status', permission: 'ADMIN' },
    ],
  };

  const compte: NavGroup = {
    id: 'compte',
    label: 'COMPTE',
    collapsible: false,
    defaultOpen: true,
    items: [
      { id: 'profile', label: 'Mon Profil', icon: User, route: '/profile' },
    ],
  };

  const groups: NavGroup[] = [principal];

  if (userRole === 'ADMIN') {
    groups.push(gestion, utilisateurs, outils, compte);
  } else {
    groups.push(compte);
  }

  return groups;
};

export const getAdminNavItemRoute = (itemId: string): string => {
  return itemId === 'profile' ? '/profile' : `/app/${itemId}`;
};
