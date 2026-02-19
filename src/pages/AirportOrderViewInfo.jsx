import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { get, put, patch } from '../api/client';
import Card from '../components/Card';

export default function AirportOrderViewInfo() {
  const { state } = useLocation();
  const order = state?.order ?? {};
  const { token, user } = useAuth();
  const [deliveryStatus, setDeliveryStatus] = useState(order.status || 'Pending');
  const [updating, setUpdating] = useState(false);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setDeliveryStatus(newStatus);

    if (!order.orderId || newStatus === 'Pending') return;

    try {
      setUpdating(true);

      let assignmentResponse;
      const fetchId = order.oid || order.orderId;
      console.log('Fetching assignment for status update:', fetchId, 'Order details:', order);

      try {
        assignmentResponse = await get(`/order-assignment/${fetchId}`, token);
      } catch (err) {
        if (err.message?.includes('flower order')) {
          assignmentResponse = await get(`/flower-order-assignment/${fetchId}`, token);

          if (!assignmentResponse?.success || !assignmentResponse?.data) return;

          const assignmentData = assignmentResponse.data;
          let stage3Data = typeof assignmentData.stage3_summary_data === 'string'
            ? JSON.parse(assignmentData.stage3_summary_data)
            : assignmentData.stage3_summary_data;

          let stage3Products = [];
          if (assignmentData.stage3_data) {
            const stage3DataParsed = typeof assignmentData.stage3_data === 'string'
              ? JSON.parse(assignmentData.stage3_data)
              : assignmentData.stage3_data;
            stage3Products = stage3DataParsed.products || [];
          }

          if (stage3Data?.driverAssignments && order.assignmentIndex !== undefined) {
            stage3Data.driverAssignments.forEach(da => {
              if (da.assignments && da.assignments[order.assignmentIndex]) {
                da.assignments[order.assignmentIndex].status = newStatus;
              }
            });
          }

          if (stage3Products.length > 0 && order.assignmentIndex !== undefined) {
            if (stage3Products[order.assignmentIndex]) {
              stage3Products[order.assignmentIndex].status = newStatus;
            }
          }

          if (stage3Data?.airportGroups) {
            Object.values(stage3Data.airportGroups).forEach(group => {
              if (group.products && Array.isArray(group.products)) {
                if (order.assignmentIndex !== undefined && group.products[order.assignmentIndex]) {
                  group.products[order.assignmentIndex].status = newStatus;
                }
              }
            });
          }

          await put(`/flower-order-assignment/${fetchId}/stage3`, {
            products: stage3Products,
            summaryData: stage3Data,
            airportTapeData: assignmentData.stage3_data?.airportTapeData || {}
          }, token);
          return;
        }
        throw err;
      }

      if (!assignmentResponse?.success || !assignmentResponse?.data) return;

      const assignmentData = assignmentResponse.data;
      let stage3Data = typeof assignmentData.stage3_summary_data === 'string'
        ? JSON.parse(assignmentData.stage3_summary_data)
        : assignmentData.stage3_summary_data;

      let stage3Products = [];
      if (assignmentData.stage3_data) {
        const stage3DataParsed = typeof assignmentData.stage3_data === 'string'
          ? JSON.parse(assignmentData.stage3_data)
          : assignmentData.stage3_data;
        stage3Products = stage3DataParsed.products || [];
      }

      if (stage3Data?.driverAssignments && order.assignmentIndex !== undefined) {
        stage3Data.driverAssignments.forEach(da => {
          if (da.assignments && da.assignments[order.assignmentIndex]) {
            da.assignments[order.assignmentIndex].status = newStatus;
          }
        });
      }

      if (stage3Products.length > 0 && order.assignmentIndex !== undefined) {
        if (stage3Products[order.assignmentIndex]) {
          stage3Products[order.assignmentIndex].status = newStatus;
        }
      }

      if (stage3Data?.airportGroups) {
        Object.values(stage3Data.airportGroups).forEach(group => {
          if (group.products && Array.isArray(group.products)) {
            if (order.assignmentIndex !== undefined && group.products[order.assignmentIndex]) {
              group.products[order.assignmentIndex].status = newStatus;
            }
          }
        });
      }

      await put(`/order-assignment/${fetchId}/stage3`, {
        products: stage3Products,
        summaryData: stage3Data,
        airportTapeData: assignmentData.stage3_data?.airportTapeData || {},
        isEdit: true
      }, token);
    } catch (err) {
      console.error('Failed to update status:', err);
      setDeliveryStatus(order.status || 'Pending');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <Link to="/airport-order-view" className="p-2 text-white">
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
            <p className="text-white font-bold text-base">{order.fromName ?? 'Warehouse'}</p>
            <p className="text-[#A0A0A0] text-sm">{order.fromDetail ?? 'Packing Center'}</p>

            <p className="text-[#00CC66] text-xs font-semibold uppercase mt-6 mb-2">
              DELIVER TO
            </p>
            <p className="text-white font-bold text-base">{order.toName ?? 'TN21 MADURAI AIRPORT'}</p>
            <p className="text-[#A0A0A0] text-sm">{order.toDetail ?? 'Madurai'}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-base">Order Details</h3>
          <span className="text-[#00CC66] text-sm">#{order.orderId ?? 'GVT_06-02-2026'}</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">Product</span>
            <span className="text-white">{order.product ?? 'DRUMSTICK (முருங்கைக்காய்)'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">Gross Weight</span>
            <span className="text-white">{order.grossWeight ?? '105.00 kg'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">No. of Packages</span>
            <span className="text-white">{order.noOfPkgs ?? '10'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">Labour</span>
            <span className="text-white">{order.labour ?? 'Raju'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#A0A0A0]">CT</span>
            <span className="text-white">{order.ct ?? '1-10'}</span>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-white font-bold text-base mb-4">Delivery Status</h3>
        <select
          value={deliveryStatus}
          onChange={handleStatusChange}
          disabled={updating}
          className="w-full py-3 px-4 rounded-xl bg-[#171717] border border-[#00CC66] text-white appearance-none cursor-pointer disabled:opacity-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2300CC66' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 1rem center'
          }}
        >
          <option value="Pending" className="bg-[#171717]">Pending</option>
          <option value="On Trip" className="bg-[#171717]">On Trip</option>
          <option value="Completed" className="bg-[#171717]">Completed</option>
        </select>
      </Card>
    </div>
  );
}
