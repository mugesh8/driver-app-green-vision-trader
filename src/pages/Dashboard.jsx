import { Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, MoreHorizontal, Plane } from 'lucide-react';
import { useDriverOrders } from '../hooks/useDriverOrders';
import Card from '../components/Card';

export default function Dashboard() {
  const { stage1Orders, stage3Orders, loading } = useDriverOrders();

  const totalOrders = stage1Orders.length + stage3Orders.length;
  const completedOrders = [...stage1Orders, ...stage3Orders].filter(
    order => order.status?.toLowerCase() === 'completed'
  ).length;
  const pendingOrders = totalOrders - completedOrders;
  return (
    <div className="px-4 py-4 space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <div className="flex flex-col items-center">
            <ShoppingBag className="w-8 h-8 text-[#34C759] mb-2" strokeWidth={2} />
            <p className="text-[#34C759] text-2xl font-bold">{loading ? '...' : totalOrders}</p>
            <p className="text-white text-sm">Today&apos;s Orders</p>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center">
            <CheckCircle className="w-8 h-8 text-[#34C759] mb-2" strokeWidth={2} />
            <p className="text-[#34C759] text-2xl font-bold">{loading ? '...' : completedOrders}</p>
            <p className="text-white text-sm">Completed</p>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col items-center">
            <MoreHorizontal className="w-8 h-8 text-[#FACC15] mb-2" strokeWidth={2} />
            <p className="text-[#FACC15] text-2xl font-bold">{loading ? '...' : pendingOrders}</p>
            <p className="text-white text-sm">Pending</p>
          </div>
        </Card>
      </div>

      <div>
        <h2 className="text-white font-bold text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/local-order-view" className="block no-underline">
            <Card className="cursor-pointer hover:bg-[#333333] transition-colors">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#34C759]/30 flex items-center justify-center mb-2">
                  <ShoppingBag className="w-6 h-6 text-[#34C759]" strokeWidth={2} />
                </div>
                <p className="text-white font-medium">Local Pickups</p>
              </div>
            </Card>
          </Link>
          <Link to="/airport-order-view" className="block no-underline">
            <Card className="cursor-pointer hover:bg-[#333333] transition-colors">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#34C759]/30 flex items-center justify-center mb-2">
                  <Plane className="w-6 h-6 text-[#34C759]" strokeWidth={2} />
                </div>
                <p className="text-white font-medium">Line Airport</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
