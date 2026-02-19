import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { post, get } from '../api/client';

export default function AdvancePay() {
  const { user, token } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchPayments();
  }, [user, token]);

  const fetchPayments = async () => {
    try {
      const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;
      const response = await get(`/advance-pay/driver/${driverId}`, token);
      let paymentList = response.data || [];
      
      if (fromDate && toDate) {
        paymentList = paymentList.filter(payment => {
          const paymentDate = new Date(payment.date);
          return paymentDate >= new Date(fromDate) && paymentDate <= new Date(toDate);
        });
      }
      
      setPayments(paymentList);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;
      
      if (!driverId) {
        alert('Driver ID not found. Please login again.');
        return;
      }
      
      const payload = {
        driver_id: String(driverId),
        date,
        advance_amount: parseFloat(amount),
      };
      
      await post('/advance-pay/create', payload, token);
      
      alert('Advance payment added successfully');
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      fetchPayments();
    } catch (error) {
      console.error('Failed to add payment:', error);
      alert('Failed to add payment: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <div>
        <h2 className="text-white font-bold text-lg mb-4">Add Advance Pay</h2>
        <div className="space-y-4">
          <div>
            <label className="text-[#A0A0A0] text-xs block mb-1">Driver Name</label>
            <input
              type="text"
              value={user?.driver_name || user?.data?.driver_name || user?.name || ''}
              disabled
              className="w-full py-3 px-4 rounded-xl bg-[#2C2C2C] text-white border border-gray-600"
            />
          </div>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full py-3 pl-4 pr-12 rounded-xl bg-[#333333] text-white border border-gray-600"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#34C759]">
              <Calendar className="w-5 h-5" strokeWidth={2} />
            </div>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Advance Amount (₹)"
            className="w-full py-3 px-4 rounded-xl bg-[#333333] text-white placeholder-[#A0A0A0] border border-gray-600"
          />
          <Button onClick={handleSubmit} disabled={loading || !amount}>
            {loading ? 'Adding...' : 'Add Advance Pay'}
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-white font-bold text-lg mb-4">Advance Pay History</h2>
        
        {payments.length > 0 ? (
          <>
            {/* Date Filter */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[#A0A0A0] text-xs block mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#333333] text-white border border-gray-600 text-sm"
                />
              </div>
              <div>
                <label className="text-[#A0A0A0] text-xs block mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#333333] text-white border border-gray-600 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={fetchPayments}
              className="w-full py-2 mb-4 rounded-xl bg-[#34C759] text-white font-semibold text-sm"
            >
              Filter
            </button>
            
            <div className="space-y-3">
              {payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((payment, idx) => (
                <div key={idx} className="bg-[#333333] rounded-xl p-4 border border-gray-600">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-semibold">₹{payment.advance_amount || payment.amount}</p>
                      <p className="text-[#A0A0A0] text-xs">{new Date(payment.date).toLocaleDateString()}</p>
                      {payment.created_at && (
                        <p className="text-[#A0A0A0] text-xs">Time: {new Date(payment.created_at).toLocaleTimeString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {payments.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-[#333333] text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-white text-sm">
                  Page {currentPage} of {Math.ceil(payments.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(payments.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(payments.length / itemsPerPage)}
                  className="px-4 py-2 rounded-lg bg-[#333333] text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-[#A0A0A0] text-center py-8">
            No advance payments yet.
          </p>
        )}
      </div>
    </div>
  );
}
