import { Link } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { USER } from '../constants';
import { useNotifications } from '../hooks/useNotifications';

export default function Header({ onMenuClick }) {
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="px-4 py-3 bg-[#1A1A1A]">
      <div className="flex items-start justify-between">
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={onMenuClick}
            className="p-2 -ml-2 text-white flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" strokeWidth={2} />
          </button>
          <div className="w-11 h-11 rounded-full bg-[#D9D9D9] flex items-center justify-center flex-shrink-0">
            <span className="text-[#34C759] font-bold text-base">
              {USER.initials}
            </span>
          </div>
          <div>
            <p className="text-white text-sm">Hello 👋</p>
            <p className="text-white font-bold text-base">{USER.name}</p>
            <div className="flex items-center gap-1 mt-1">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#333333]">
                <span className="text-[#34C759] text-xs">✓</span>
                <span className="text-[#A0A0A0] text-xs">{USER.driverId}</span>
              </div>
            </div>
          </div>
        </div>
        <Link to="/notifications" className="relative block">
          <span className="w-11 h-11 rounded-full bg-[#D9D9D9] flex items-center justify-center">
            <Bell className="w-5 h-5 text-gray-700" strokeWidth={2} />
          </span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold border-2 border-[#1A1A1A]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
