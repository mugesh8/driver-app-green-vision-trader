import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plane, ShoppingBag, Loader2 } from 'lucide-react';
import Card from '../components/Card';
import { useDriverOrders } from '../hooks/useDriverOrders';

function isCompletedStatus(status) {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === 'completed' || s === 'complete';
}

export default function Orders() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('assigned');
  const {
    stage1Orders = [],
    stage3Orders = [],
    localOrders = [],
    loading,
    error,
    updateStage1,
    updateStage3,
  } = useDriverOrders();
  const [updatingId, setUpdatingId] = useState(null);

  const allLocal = [...stage1Orders, ...localOrders];

  const localAssigned = allLocal.filter((o) => !isCompletedStatus(o.status));
  const localCompleted = allLocal.filter((o) => isCompletedStatus(o.status));

  const airportAssigned = stage3Orders.filter((o) => !isCompletedStatus(o.status));
  const airportCompleted = stage3Orders.filter((o) => isCompletedStatus(o.status));

  const showAssigned = activeTab === 'assigned';
  const localList = showAssigned ? localAssigned : localCompleted;
  const airportList = showAssigned ? airportAssigned : airportCompleted;

  const hasAny = localList.length > 0 || airportList.length > 0;

  const handleLocalView = async (order) => {
    if (!order?.id) return;
    try {
      setUpdatingId(order.id);
      await updateStage1(order.id);
    } finally {
      setUpdatingId(null);
      navigate(`/local-order-view-info?orderId=${order.id}`, { state: { order } });
    }
  };

  const handleAirportView = async (order) => {
    if (!order?.id) return;
    try {
      setUpdatingId(order.id);
      await updateStage3(order.id);
    } finally {
      setUpdatingId(null);
      navigate(`/airport-order-view-info?orderId=${order.id}`, { state: { order } });
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex gap-2 p-1 bg-[#2C2C2E] rounded-xl mb-2">
        <button
          type="button"
          onClick={() => setActiveTab('assigned')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm ${
            activeTab === 'assigned'
              ? 'bg-[#34C759] text-white'
              : 'text-white'
          }`}
        >
          Assigned Orders
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm ${
            activeTab === 'completed'
              ? 'bg-[#34C759] text-white'
              : 'text-white'
          }`}
        >
          Completed Orders
        </button>
      </div>

      {error && (
        <div className="py-3 px-4 rounded-xl bg-red-500/20 border border-red-500/50">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {loading && !hasAny ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#34C759] animate-spin" strokeWidth={2} />
        </div>
      ) : !hasAny ? (
        <p className="text-[#A0A0A0] text-center py-12">
          {showAssigned
            ? 'No assigned orders yet. Pull down to refresh.'
            : 'No completed orders yet.'}
        </p>
      ) : (
        <div className="space-y-6">
          {/* Local Pickups section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#34C759]/20 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-[#34C759]" strokeWidth={2} />
              </div>
              <h2 className="text-white font-semibold text-base">Local Pickups</h2>
            </div>
            {localList.length === 0 ? (
              <p className="text-[#A0A0A0] text-sm ml-1">
                {showAssigned ? 'No local pickups assigned.' : 'No local pickups completed yet.'}
              </p>
            ) : (
              <div className="space-y-4">
                {localList.map((order) => (
                  <Card key={order.id}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 rounded-lg bg-[#F9A825] text-white text-xs font-bold uppercase">
                        {order.status || (showAssigned ? 'PENDING' : 'COMPLETED')}
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
                              {order.fromAddress || order.fromDetail}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLocalView(order)}
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
                          <Package className="w-5 h-5 text-[#D9882F]" strokeWidth={2} />
                          <span className="text-white text-sm truncate">
                            {order.product}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Line Airport section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#34C759]/20 flex items-center justify-center">
                <Plane className="w-4 h-4 text-[#34C759]" strokeWidth={2} />
              </div>
              <h2 className="text-white font-semibold text-base">Line Airport</h2>
            </div>
            {airportList.length === 0 ? (
              <p className="text-[#A0A0A0] text-sm ml-1">
                {showAssigned
                  ? 'No line airport orders assigned.'
                  : 'No line airport orders completed yet.'}
              </p>
            ) : (
              <div className="space-y-4">
                {airportList.map((order) => (
                  <Card key={order.id}>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`px-3 py-1 rounded-lg ${
                          order.statusColor || 'bg-[#34C759]'
                        } text-white text-xs font-bold uppercase`}
                      >
                        {order.status || (showAssigned ? 'PENDING' : 'COMPLETED')}
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
                            onClick={() => handleAirportView(order)}
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
                          <Package className="w-5 h-5 text-[#D9882F]" strokeWidth={2} />
                          <span className="text-white text-sm truncate">
                            {order.product}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
