import { NavLink } from 'react-router-dom';
import {
  Home,
  FileText,
  Fuel,
  Route,
  Wallet,
  User,
} from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/orders', icon: FileText, label: 'Orders' },
  { path: '/expenses', icon: Fuel, label: 'Expenses' },
  { path: '/kilometer', icon: Route, label: 'Kilometer' },
  { path: '/advance-pay', icon: Wallet, label: 'Advance' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#333333] rounded-t-2xl px-2 py-2 flex items-center justify-around">
      {navItems.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-colors ${
              isActive
                ? 'bg-[#34C759] text-white'
                : 'text-white'
            }`
          }
        >
          <Icon className="w-5 h-5" strokeWidth={2} />
          <span className="text-xs font-medium">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
