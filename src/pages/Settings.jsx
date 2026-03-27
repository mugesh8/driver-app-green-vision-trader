import { Link } from 'react-router-dom';
import { Shield, ChevronRight, Info } from 'lucide-react';

const SettingItem = ({ icon: Icon, label, to, color = '#10B981' }) => (
  <Link
    to={to}
    className="flex items-center gap-4 py-4 px-4 bg-[#2C2C2C] rounded-2xl mb-3 active:opacity-70 transition-opacity"
  >
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon className="w-5 h-5" style={{ color }} strokeWidth={2} />
    </div>
    <span className="text-white text-sm font-medium flex-1">{label}</span>
    <ChevronRight className="w-4 h-4 text-[#A0A0A0]" strokeWidth={2} />
  </Link>
);

export default function Settings() {
  return (
    <div className="px-4 py-4 pb-24">
      <h1 className="text-white font-bold text-lg mb-6">Settings</h1>

      <p className="text-[#A0A0A0] text-xs uppercase font-semibold mb-3 px-1">Legal</p>
      <SettingItem
        icon={Shield}
        label="Privacy Policy"
        to="/privacy-policy"
        color="#10B981"
      />

      <div className="mt-6 rounded-2xl bg-[#2C2C2C] p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Info className="w-4 h-4 text-[#A0A0A0]" strokeWidth={2} />
          <p className="text-[#A0A0A0] text-xs">Green Vision Trader Driver App</p>
        </div>
        <p className="text-[#606060] text-xs">© 2025 Green Vision Trader. All rights reserved.</p>
      </div>
    </div>
  );
}
