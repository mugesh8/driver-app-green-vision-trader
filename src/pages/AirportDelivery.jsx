import { Link } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import Card from '../components/Card';

export default function AirportDelivery() {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/orders" className="p-2 text-white">
          <ArrowLeft className="w-6 h-6" strokeWidth={2} />
        </Link>
        <h1 className="text-white font-bold text-lg flex-1 text-center -ml-10">
          Airport Delivery Information
        </h1>
      </div>

      <Card>
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-[#00CC66]" />
            <div className="w-0.5 flex-1 border-l-2 border-dashed border-[#00CC66] my-1" />
            <div className="w-3 h-3 bg-[#00CC66] rounded-sm" />
          </div>
          <div className="flex-1">
            <p className="text-[#00CC66] text-xs font-semibold uppercase mb-2">
              PICKUP FROM
            </p>
            <p className="text-white font-bold text-base">Warehouse</p>
            <p className="text-[#A0A0A0] text-sm">Packing Center</p>

            <p className="text-[#00CC66] text-xs font-semibold uppercase mt-6 mb-2">
              DELIVER TO
            </p>
            <p className="text-white font-bold text-base">TN21 MADURAI AIRPORT</p>
            <p className="text-[#A0A0A0] text-sm">Madurai</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-base">Order Details</h3>
          <span className="text-[#00CC66] text-sm">#GVT_06-02-2026</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">Product</span>
            <span className="text-white">DRUMSTICK (முருங்கைக்காய்)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">Gross Weight</span>
            <span className="text-white">105.00 kg</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">No. of Packages</span>
            <span className="text-white">10</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">Labour</span>
            <span className="text-white">Raju</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">CT</span>
            <span className="text-white">1-10</span>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-base">Delivery Status</h3>
          <div className="py-2 px-3 rounded-lg bg-[#4A4A4A] text-white text-sm flex items-center gap-1">
            Pending ▼
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 py-4 rounded-xl bg-[#F9A825]">
          <MoreHorizontal className="w-5 h-5 text-white" strokeWidth={2} />
          <span className="text-white font-medium">Waiting to start delivery</span>
        </div>
      </Card>
    </div>
  );
}
