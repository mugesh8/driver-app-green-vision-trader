import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, MoreVertical, Loader2 } from 'lucide-react';
import Card from '../components/Card';
import { useDriverOrders } from '../hooks/useDriverOrders';

export default function AirportOrderView() {
  const navigate = useNavigate();
  const { stage3Orders, loading, error, updateStage3 } = useDriverOrders();
  const [updatingId, setUpdatingId] = useState(null);

  const handleViewClick = async (e, order) => {
    e.preventDefault();
    if (!order?.id) return;
    setUpdatingId(order.id);
    await updateStage3(order.id);
    setUpdatingId(null);
    navigate(`/airport-order-view-info?orderId=${order.id}`, { state: { order } });
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/" className="p-2 text-white">
          <ArrowLeft className="w-6 h-6" strokeWidth={2} />
        </Link>
        <h1 className="text-white font-bold text-lg flex-1 text-center -ml-10">
          Line Airport
        </h1>
        <button type="button" className="p-2 text-white">
          <MoreVertical className="w-6 h-6" strokeWidth={2} />
        </button>
      </div>

      {error && (
        <div className="py-3 px-4 rounded-xl bg-red-500/20 border border-red-500/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#34C759] animate-spin" strokeWidth={2} />
        </div>
      ) : stage3Orders.length === 0 ? (
        <p className="text-[#A0A0A0] text-center py-12">
          No airport delivery orders assigned. Pull down to refresh.
        </p>
      ) : (
        <div className="space-y-4">
          {stage3Orders.map((order) => (
            <Card key={order.id}>
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-3 py-1 rounded-lg ${order.statusColor} text-white text-xs font-bold uppercase`}
                >
                  {order.status}
                </span>
                <span className="text-[#34C759] text-sm font-medium">
                  Order #{order.id}
                </span>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-[#34C759]" />
                  <div className="w-0.5 flex-1 min-h-[40px] border-l-2 border-dashed border-[#34C759] my-1" />
                  <div className="w-3 h-3 rounded-full bg-[#34C759]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-white font-bold text-sm">From: {order.fromName}</p>
                      <p className="text-white text-xs text-[#A0A0A0] mt-0.5">
                        {order.fromDetail || order.fromAddress}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleViewClick(e, order)}
                      disabled={updatingId === order.id}
                      className="px-4 py-2 rounded-lg bg-[#34C759] text-white text-sm font-medium flex-shrink-0 disabled:opacity-70"
                    >
                      {updatingId === order.id ? (
                        <Loader2 className="w-4 h-4 animate-spin inline" strokeWidth={2} />
                      ) : (
                        'View'
                      )}
                    </button>
                  </div>
                  <p className="text-white font-bold text-sm mt-3">To: {order.toName}</p>
                  <p className="text-white text-xs text-[#A0A0A0]">{order.toDetail}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Package className="w-5 h-5 text-[#D9882F] flex-shrink-0" strokeWidth={2} />
                    <span className="text-white text-sm">{order.product}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
