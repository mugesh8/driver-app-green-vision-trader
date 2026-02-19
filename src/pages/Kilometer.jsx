import { useState, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { post, get } from '../api/client';

export default function Kilometer() {
  const { user, token } = useAuth();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [startKm, setStartKm] = useState('');
  const [endKm, setEndKm] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
    fetchRecords();
  }, [user, token]);

  const fetchRecords = async () => {
    try {
      const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;
      const response = await get(`/excess-km/driver/${driverId}`, token);
      let recordList = response.data || [];
      
      if (fromDate && toDate) {
        recordList = recordList.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate >= new Date(fromDate) && recordDate <= new Date(toDate);
        });
      }
      
      setRecords(recordList);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch records:', error);
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
        vehicle_number: vehicleNumber,
        start_km: parseFloat(startKm),
        end_km: parseFloat(endKm),
        amount: (parseFloat(endKm) - parseFloat(startKm)) * 10, // Calculate amount (KM * rate)
      };
      
      await post('/excess-km/create', payload, token);
      
      alert('KM record added successfully');
      setDate(new Date().toISOString().split('T')[0]);
      setStartKm('');
      setEndKm('');
      fetchRecords();
    } catch (error) {
      console.error('Failed to add record:', error);
      alert('Failed to add record: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-4 space-y-6">
      <div className="space-y-4 p-4 rounded-xl bg-[#2C2C2E]">
        <div>
          <label className="text-[#A0A0A0] text-xs block mb-1">Driver Name</label>
          <input
            type="text"
            value={user?.driver_name || user?.data?.driver_name || user?.name || ''}
            disabled
            className="w-full py-3 px-4 rounded-xl bg-[#1C1C1E] text-white border border-gray-600"
          />
        </div>

        <div className="relative">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full py-3 pl-4 pr-12 rounded-xl bg-[#363636] text-white border border-gray-600"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[#34C759]">
            <Calendar className="w-5 h-5" strokeWidth={2} />
          </div>
        </div>

        <div>
          <label className="text-[#A0A0A0] text-xs block mb-1">Vehicle Number</label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            className="w-full py-3 px-4 rounded-xl bg-[#363636] text-white border border-gray-600"
          />
        </div>

        <input
          type="number"
          value={startKm}
          onChange={(e) => setStartKm(e.target.value)}
          placeholder="Start Kilometer"
          className="w-full py-3 px-4 rounded-xl bg-[#363636] text-white placeholder-[#A0A0A0] border border-gray-600"
        />

        <input
          type="number"
          value={endKm}
          onChange={(e) => setEndKm(e.target.value)}
          placeholder="End Kilometer"
          className="w-full py-3 px-4 rounded-xl bg-[#363636] text-white placeholder-[#A0A0A0] border border-gray-600"
        />

        <Button onClick={handleSubmit} disabled={loading || !vehicleNumber || !startKm || !endKm}>
          {loading ? 'Submitting...' : 'Submit'}
        </Button>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">Excess KM History</h2>
        </div>
        
        {records.length > 0 ? (
          <>
            {/* Date Filter */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[#A0A0A0] text-xs block mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#363636] text-white border border-gray-600 text-sm"
                />
              </div>
              <div>
                <label className="text-[#A0A0A0] text-xs block mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-[#363636] text-white border border-gray-600 text-sm"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={fetchRecords}
              className="w-full py-2 mb-4 rounded-xl bg-[#34C759] text-white font-semibold text-sm"
            >
              Filter
            </button>
            
            <div className="space-y-3">
              {records.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((record, idx) => (
                <div key={idx} className="bg-[#2C2C2E] rounded-xl p-4 border border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-semibold">{record.vehicle_number}</p>
                      <p className="text-[#A0A0A0] text-xs">{new Date(record.date).toLocaleDateString()}</p>
                    </div>
                    <p className="text-[#34C759] font-semibold">{(record.end_km - record.start_km).toFixed(2)} KM</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <p className="text-[#A0A0A0]">Start: <span className="text-white">{record.start_km} KM</span></p>
                    <p className="text-[#A0A0A0]">End: <span className="text-white">{record.end_km} KM</span></p>
                    {record.created_at && (
                      <p className="text-[#A0A0A0]">Time: <span className="text-white">{new Date(record.created_at).toLocaleTimeString()}</span></p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {records.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-[#363636] text-white disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-white text-sm">
                  Page {currentPage} of {Math.ceil(records.length / itemsPerPage)}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(records.length / itemsPerPage)))}
                  disabled={currentPage === Math.ceil(records.length / itemsPerPage)}
                  className="px-4 py-2 rounded-lg bg-[#363636] text-white disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-[#A0A0A0] text-center py-8">
            No records yet.
          </p>
        )}
      </div>
    </div>
  );
}
