import { Link } from 'react-router-dom';
import { ArrowLeft, Phone, Package } from 'lucide-react';
import Card from '../components/Card';

export default function RouteInformation() {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Link
          to="/orders"
          className="p-2 text-white"
        >
          <ArrowLeft className="w-6 h-6" strokeWidth={2} />
        </Link>
        <h1 className="text-white font-bold text-lg flex-1 text-center -ml-10">
          Route Information
        </h1>
      </div>

      <Card>
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-[#27C97F]" />
            <div className="w-0.5 flex-1 border-l-2 border-dashed border-[#27C97F] my-1" />
            <div className="w-3 h-3 bg-[#27C97F] rounded-sm" />
          </div>
          <div className="flex-1">
            <p className="text-[#27C97F] text-xs font-semibold uppercase mb-2">
              PICKUP FROM
            </p>
            <p className="text-white font-bold text-base">DINESH</p>
            <p className="text-white text-sm text-[#A0A0A0]">
              SUGAR MILL, SUGAR MILL, Tamil Nadu - 636001
            </p>
            <div className="flex items-center gap-2 mt-2 text-white text-sm">
              <Phone className="w-4 h-4 text-[#27C97F]" strokeWidth={2} />
              <span>+91 98765 12345</span>
            </div>
            <p className="text-[#27C97F] text-sm mt-2">12.5 km • 25 mins</p>

            <p className="text-[#27C97F] text-xs font-semibold uppercase mt-6 mb-2">
              DELIVER
            </p>
            <p className="text-white font-bold text-base">Warehouse</p>
            <p className="text-white text-sm text-[#A0A0A0]">Packing Center</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-white font-bold text-base mb-4">Items to Collect</h3>
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-[#D9882F]" strokeWidth={2} />
          <span className="text-white text-sm">
            RAW MANGO (பச்சை மாங்காய்) - 0 kg
          </span>
        </div>
      </Card>

      <Card>
        <h3 className="text-white font-bold text-base mb-4">Collection Status</h3>
        <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#171717] border border-[#27C97F]">
          <span className="text-white">Picked and Packed</span>
          <span className="text-[#27C97F]">▼</span>
        </div>
      </Card>
    </div>
  );
}
