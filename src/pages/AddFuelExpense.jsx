import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { post, get } from '../api/client';

export default function AddFuelExpense() {
  const { user, token } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fuelType, setFuelType] = useState('Petrol');
  const [petrolBunk, setPetrolBunk] = useState('Indian Oil Petroleum');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [totalLitre, setTotalLitre] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalAmount = (parseFloat(unitPrice) || 0) * (parseFloat(totalLitre) || 0);

  useEffect(() => {
    const fetchDriverProfile = async () => {
      try {
        const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;
        const response = await get(`/driver/profile/${driverId}`, token);
        const driver = response.data || response;
        setVehicleNumber(driver.vehicle_number || driver.vehicleNumber || '');
      } catch (error) {
        console.error('Failed to fetch driver profile:', error);
      }
    };
    
    if (user) {
      fetchDriverProfile();
    }
  }, [user, token]);

  useEffect(() => {
    fetchExpenses();
  }, [user, token]);

  const fetchExpenses = async () => {
    try {
      const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;
      const response = await get(`/fuel-expense/driver/${driverId}`, token);
      let expenseList = response.data || [];
      
      // Filter by date range if provided
      if (fromDate && toDate) {
        expenseList = expenseList.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= new Date(fromDate) && expenseDate <= new Date(toDate);
        });
      }
      
      setExpenses(expenseList);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
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
      
      console.log('Submitting with driver_id:', driverId);
      console.log('User object:', user);
      
      const payload = {
        driver_id: String(driverId),
        date,
        fuel_type: fuelType,
        petrol_bunk_name: petrolBunk,
        vehicle_number: vehicleNumber,
        unit_price: parseFloat(unitPrice),
        litre: parseFloat(totalLitre),
      };
      
      console.log('Payload:', payload);
      
      await post('/fuel-expense/create', payload, token);
      
      alert('Fuel expense added successfully');
      setDate(new Date().toISOString().split('T')[0]);
      setUnitPrice('');
      setTotalLitre('');
      fetchExpenses();
    } catch (error) {
      console.error('Failed to add expense:', error);
      alert('Failed to add expense: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <h2 className="text-white font-bold text-lg">Add Fuel Expense</h2>

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

        <div>
          <label className="text-[#A0A0A0] text-xs block mb-1">Fuel Type</label>
          <div className="relative">
            <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="w-full py-3 pl-4 pr-10 rounded-xl bg-[#333333] text-white border border-gray-600 appearance-none">
              <option>Petrol</option>
              <option>Diesel</option>
            </select>
            <ChevronDown className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
          </div>
        </div>

        <div>
          <label className="text-[#A0A0A0] text-xs block mb-1">Petrol Bunk Name</label>
          <div className="relative">
            <select value={petrolBunk} onChange={(e) => setPetrolBunk(e.target.value)} className="w-full py-3 pl-4 pr-10 rounded-xl bg-[#333333] text-white border border-gray-600 appearance-none">
              <option>Indian Oil Petroleum</option>
              <option>Bharat Petroleum</option>
              <option>HP Petroleum</option>
            </select>
            <ChevronDown className="w-5 h-5 text-gray-500 absolute right-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
          </div>
        </div>

        <div>
          <label className="text-[#A0A0A0] text-xs block mb-1">Vehicle Number</label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            placeholder="TN23AR3456"
            className="w-full py-3 px-4 rounded-xl bg-[#333333] text-white border border-gray-600"
          />
        </div>

        <div>
          <label className="text-[#A0A0A0] text-xs block mb-1">Unit Price (₹)</label>
          <input
            type="number"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            placeholder="Enter price per litre"
            className="w-full py-3 px-4 rounded-xl bg-[#333333] text-white placeholder-[#A0A0A0] border border-gray-600"
          />
        </div>

        <div>
          <label className="text-[#A0A0A0] text-xs block mb-1">Total Litre</label>
          <input
            type="number"
            value={totalLitre}
            onChange={(e) => setTotalLitre(e.target.value)}
            placeholder="Enter litres"
            className="w-full py-3 px-4 rounded-xl bg-[#333333] text-white placeholder-[#A0A0A0] border border-gray-600"
          />
        </div>

        <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-[#333333]">
          <span className="text-white">Total Amount:</span>
          <span className="text-[#34C759] font-semibold">₹{totalAmount.toFixed(2)}</span>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !vehicleNumber || !unitPrice || !totalLitre}
          className="w-full py-3 rounded-xl bg-[#34C759] text-white font-semibold text-base disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Expense'}
        </button>
      </div>

      {expenses.length > 0 && (
        <div className="mt-6">
          <h3 className="text-white font-bold text-base mb-4">Previous Expenses</h3>
          
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
            onClick={fetchExpenses}
            className="w-full py-2 mb-4 rounded-xl bg-[#34C759] text-white font-semibold text-sm"
          >
            Filter
          </button>
          
          <div className="space-y-3">
            {expenses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((expense, idx) => (
              <div key={idx} className="bg-[#333333] rounded-xl p-4 border border-gray-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-white font-semibold">{expense.fuel_type}</p>
                    <p className="text-[#A0A0A0] text-xs">{expense.petrol_bunk_name}</p>
                  </div>
                  <p className="text-[#34C759] font-semibold">₹{expense.total_amount}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="text-[#A0A0A0]">Date: <span className="text-white">{new Date(expense.date).toLocaleDateString()}</span></p>
                  <p className="text-[#A0A0A0]">Time: <span className="text-white">{new Date(expense.created_at).toLocaleTimeString()}</span></p>
                  <p className="text-[#A0A0A0]">Vehicle: <span className="text-white">{expense.vehicle_number}</span></p>
                  <p className="text-[#A0A0A0]">Litres: <span className="text-white">{expense.litre}L</span></p>
                  <p className="text-[#A0A0A0]">Price/L: <span className="text-white">₹{expense.unit_price}</span></p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {expenses.length > itemsPerPage && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-[#333333] text-white disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-white text-sm">
                Page {currentPage} of {Math.ceil(expenses.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(expenses.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(expenses.length / itemsPerPage)}
                className="px-4 py-2 rounded-lg bg-[#333333] text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
