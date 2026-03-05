import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  FileText,
  Fuel,
  Route,
  Wallet,
  User,
  MessageSquare,
  LogOut,
} from 'lucide-react';
import { USER } from '../constants';

function getInitials(name) {
  if (!name) return USER.initials;
  const parts = String(name).trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  const initials = (first + last).toUpperCase();
  return initials || USER.initials;
}

export default function Drawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const displayName =
    user?.driver_name ||
    user?.name ||
    user?.fullName ||
    USER.name;

  const displayDriverId =
    user?.driver_id ||
    user?.driverId ||
    user?.did ||
    USER.driverId;

  const displayInitials = getInitials(displayName);

  if (!isOpen) return null;

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutGrid, label: 'Dashboard' },
    { path: '/orders', icon: FileText, label: 'My Orders' },
    { path: '/expenses', icon: Fuel, label: 'Expenses' },
    { path: '/kilometer', icon: Route, label: 'Excess KM' },
    { path: '/advance-pay', icon: Wallet, label: 'Advance Pay' },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  const secondaryItems = [
    { path: '/remarks', icon: MessageSquare, label: 'Remarks' },
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-label="Close drawer"
      />
      <div className="fixed left-0 top-0 h-full w-[80%] max-w-[320px] bg-[#242424] z-50 overflow-y-auto flex flex-col">
        <div className="p-6 flex flex-col items-center pt-12 flex-1">
          <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4">
            <span className="text-[#34C759] font-bold text-xl">
              {displayInitials}
            </span>
          </div>
          <h2 className="text-white font-bold text-lg text-center mb-1">
            {displayName}
          </h2>
          <p className="text-white text-sm text-center mb-4">
            ID: {displayDriverId}
          </p>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#34C759] mb-8">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="text-white font-medium">Active</span>
          </div>

          <nav className="w-full flex-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#333333] rounded-lg"
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span>{label}</span>
              </NavLink>
            ))}

            <div className="border-t border-[#424242] my-4" />

            {secondaryItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-white hover:bg-[#333333] rounded-lg"
              >
                <Icon className="w-5 h-5" strokeWidth={2} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-[#EF4444] text-white font-bold text-base mt-6"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
            Logout
          </button>
        </div>
      </div>
    </>
  );
}
