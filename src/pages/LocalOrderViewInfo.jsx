import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Phone, Package } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { get, put, patch } from '../api/client';
import Card from '../components/Card';

export default function LocalOrderViewInfo() {
  const { state } = useLocation();
  const order = state?.order ?? {};
  const { token, user } = useAuth();
  const [collectionStatus, setCollectionStatus] = useState(order.status || 'Select...');
  const [updating, setUpdating] = useState(false);

  // DEBUG: log full order object to understand available ID fields
  console.log('LocalOrderViewInfo order object:', JSON.stringify(order, null, 2));

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setCollectionStatus(newStatus);

    if (newStatus === 'Select...') return;

    try {
      setUpdating(true);

      const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;

      const updateAsLocalOrder = async (st) => {
        // Use the driverId and oiid from the order object directly
        // Fallback to user.did/driverId if order.driverId is missing
        const targetDriverId = order.driverId || driverId;
        const targetOiid = order.oiid;

        if (!targetDriverId || !targetOiid) {
          console.error("Missing driverId or oiid for local order update", { targetDriverId, targetOiid, order });
          throw new Error("Missing driver information for update");
        }

        const url = `/local-order/${order.orderId}/status/${targetDriverId}/${targetOiid}`;
        console.log('Updating local order status:', url);

        const response = await patch(url, { status: st }, token);
        if (response.success || response.data) {
          return response;
        }
        throw new Error(response.message || "Failed to update status");
      };

      // Check if this is a local order based on type or fallback to ID check (but ID check is weak)
      const oiidStr = String(order.oiid || '');
      if (order.type === 'local' || (!order.type && oiidStr.startsWith('LOC-'))) {
        // Use local order status update endpoint
        // Endpoint: /:orderId/status/:driverId/:oiid
        // order.orderId is the main Order ID (ORD-xxx) or local ID if structured differently. 
        // Based on user request, the signature is /:orderId/status/:driverId/:oiid
        // Usually orderId here refers to the resource ID. Since it's localOrderController, 
        // it likely expects local_order_id OR maybe order_id depending on backend implementation.
        // Given existing code used order.orderId (which is the main order ID), let's stick to that but ensure correct route.
        // Actually, let's look at useDriverOrders.js: orderId = localOrder.order_id, oiid = localOrder.local_order_id

        await updateAsLocalOrder(newStatus);
      } else {
        // Use order-assignment or flower-order-assignment endpoint
        let isFlowerOrder = false;
        let assignmentResponse;

        try {
          const fetchId = order.oid || order.orderId;
          assignmentResponse = await get(`/order-assignment/${fetchId}`, token);
        } catch (err) {
          if (err.message?.includes('local order') || err.data?.message?.includes('local order')) {
            // It's actually a local order, redirect to local logic
            return await updateAsLocalOrder(newStatus);
          }
          if (err.message?.includes('flower order') || err.status === 400 || err.status === 404) {
            isFlowerOrder = true;
            try {
              const fetchId = order.oid || order.orderId;
              assignmentResponse = await get(`/flower-order-assignment/${fetchId}`, token);
            } catch (flowerErr) {
              if (flowerErr.message?.includes('local order') || flowerErr.data?.message?.includes('local order')) {
                return await updateAsLocalOrder(newStatus);
              }
              console.error('Failed to fetch assignment even from flower endpoint', flowerErr);
              throw flowerErr;
            }
          } else {
            throw err;
          }
        }

        if (!assignmentResponse?.success && !assignmentResponse?.data) return;

        const assignmentData = assignmentResponse.data || assignmentResponse; // Handle possible direct object return

        let stage1Data = typeof assignmentData.stage1_summary_data === 'string'
          ? JSON.parse(assignmentData.stage1_summary_data)
          : assignmentData.stage1_summary_data;

        if (!stage1Data?.driverAssignments) {
          // Check if it's simpler structure
          return;
        }

        // This part updates the summary data locally and sends it back. 
        // This looks like a heavy operation for just a status update, but follows existing pattern.
        stage1Data.driverAssignments.forEach(da => {
          da.assignments?.forEach(assignment => {
            if (String(assignment.oiid) === String(order.oiid)) {
              assignment.status = newStatus;
            }
          });
        });

        let productAssignments = assignmentData.product_assignments;
        if (typeof productAssignments === 'string') {
          productAssignments = JSON.parse(productAssignments);
        }
        if (!Array.isArray(productAssignments)) {
          productAssignments = [];
        }

        let deliveryRoutes = assignmentData.delivery_routes;
        if (typeof deliveryRoutes === 'string') {
          deliveryRoutes = JSON.parse(deliveryRoutes);
        }
        if (!Array.isArray(deliveryRoutes)) {
          deliveryRoutes = [];
        }

        const fetchId = order.oid || order.orderId;
        const endpoint = isFlowerOrder ? `/flower-order-assignment/${fetchId}/stage1` : `/order-assignment/${fetchId}/stage1`;

        await put(endpoint, {
          orderType: assignmentData.order_type || 'box',
          productAssignments,
          deliveryRoutes,
          summaryData: stage1Data
        }, token);
      }

      // Notify user success? Or just state update.
    } catch (err) {
      console.error('Failed to update status:', err);
      // Revert status
      setCollectionStatus(order.status || 'Select...');
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/local-order-view" className="p-2 text-white">
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
            <p className="text-white font-bold text-base">{order.fromName ?? 'DINESH'}</p>
            <p className="text-white text-sm text-[#A0A0A0]">
              {order.fromAddress ?? 'SUGAR MILL, SUGAR MILL, Tamil Nadu - 636001'}
            </p>
            <div className="flex items-center gap-2 mt-2 text-white text-sm">
              <Phone className="w-4 h-4 text-[#27C97F]" strokeWidth={2} />
              <span>{order.phone ?? '+91 98765 12345'}</span>
            </div>
            <p className="text-[#27C97F] text-sm mt-2">12.5 km • 25 mins</p>

            <p className="text-[#27C97F] text-xs font-semibold uppercase mt-6 mb-2">
              DELIVER
            </p>
            <p className="text-white font-bold text-base">{order.toName ?? 'Warehouse'}</p>
            <p className="text-white text-sm text-[#A0A0A0]">{order.toDetail ?? 'Packing Center'}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-white font-bold text-base mb-4">Items to Collect</h3>
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-[#D9882F]" strokeWidth={2} />
          <span className="text-white text-sm">
            {order.product ?? 'RAW MANGO (பச்சை மாங்காய்) - 0 kg'}
          </span>
        </div>
      </Card>

      <Card>
        <h3 className="text-white font-bold text-base mb-4">Collection Status</h3>
        <select
          value={collectionStatus}
          onChange={handleStatusChange}
          disabled={updating}
          className="w-full py-3 px-4 rounded-xl bg-[#171717] border border-[#27C97F] text-white appearance-none cursor-pointer disabled:opacity-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2327C97F' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center'
          }}
        >
          <option value="Select..." className="bg-[#171717]">Select...</option>
          <option value="Drop" className="bg-[#171717]">Drop</option>
          <option value="Picked and Packed" className="bg-[#171717]">Picked and Packed</option>
          <option value="Completed" className="bg-[#171717]">Completed</option>
        </select>
      </Card>
    </div>
  );
}
