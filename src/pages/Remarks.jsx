import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { get, post } from '../api/client';

const DATE_FILTERS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'week' },
  { label: 'Last 30 Days', value: 'month' },
  { label: 'All Time', value: 'all' },
];

// Returns a YYYY-MM-DD string for a local date offset by `offsetDays`
function localDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Extract just the date part from a remark's date field (handles "2026-02-18" or full ISO)
function remarkDateStr(dateVal) {
  if (!dateVal) return '';
  return String(dateVal).slice(0, 10);
}

function getDateRange(filter) {
  switch (filter) {
    case 'today':
      return { from: localDateStr(0), to: localDateStr(0) };
    case 'yesterday':
      return { from: localDateStr(-1), to: localDateStr(-1) };
    case 'week':
      return { from: localDateStr(-7), to: localDateStr(0) };
    case 'month':
      return { from: localDateStr(-30), to: localDateStr(0) };
    default:
      return null;
  }
}

export default function Remarks() {
  const { user, token } = useAuth();

  // Driver info
  const driverId = user?.did ?? user?.data?.did ?? user?.id ?? user?.driver_id ?? user?.driverId ?? user?._id;

  // Form state
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [vehicleNum, setVehicleNum] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null); // { type: 'success'|'error', text }

  // History state
  const [allRemarks, setAllRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [filterKey, setFilterKey] = useState('today');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Fetch driver profile to get vehicle number
  useEffect(() => {
    const fetchDriverProfile = async () => {
      try {
        if (!driverId) return;
        const res = await get(`/driver/profile/${driverId}`, token);
        const driver = res.data || res;
        setVehicleNum(driver.vehicle_number || driver.vehicleNumber || '');
      } catch (err) {
        console.error('Failed to fetch driver profile:', err);
      }
    };
    if (user) fetchDriverProfile();
  }, [user, token]);

  useEffect(() => {
    fetchRemarks();
  }, [driverId, token]);

  const fetchRemarks = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      if (!driverId) { setFetchError('Driver ID not found.'); return; }
      const res = await get(`/remark/driver/${driverId}`, token);
      setAllRemarks(res.data || []);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch remarks:', err);
      setFetchError(err.message || 'Failed to load remarks.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!remarkText.trim()) {
      setSubmitMsg({ type: 'error', text: 'Please enter a remark.' });
      return;
    }
    try {
      setSubmitting(true);
      setSubmitMsg(null);
      await post('/remark/create', {
        driver_id: driverId,
        date,
        vehicle_number: vehicleNum,
        remarks: remarkText.trim(),
      }, token);
      setRemarkText('');
      setSubmitMsg({ type: 'success', text: 'Remark submitted successfully!' });
      fetchRemarks();
    } catch (err) {
      setSubmitMsg({ type: 'error', text: err.message || 'Failed to submit remark.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Filter remarks by selected date range (string comparison avoids UTC timezone shift)
  const filteredRemarks = allRemarks.filter(r => {
    const range = getDateRange(filterKey);
    if (!range) return true;
    const d = remarkDateStr(r.date); // "2026-02-18"
    return d >= range.from && d <= range.to;
  });

  const totalPages = Math.ceil(filteredRemarks.length / itemsPerPage);
  const paginated = filteredRemarks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const selectedLabel = DATE_FILTERS.find(f => f.value === filterKey)?.label ?? 'Today';

  return (
    <div className="px-4 py-4 min-h-screen" style={{ background: '#1a1a1a' }}>

      {/* ── Add Remark Card ── */}
      <div className="rounded-2xl p-4 mb-6" style={{ background: '#2a2a2a' }}>
        <h2 className="text-white font-bold text-base mb-3">Add Remark</h2>

        {/* Vehicle badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[#34C759] text-lg">🚗</span>
          <span className="text-white text-sm font-medium">
            Your vehicle: <span className="text-white font-semibold">{vehicleNum || '—'}</span>
          </span>
        </div>

        {/* Date picker */}
        <div className="relative mb-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full py-3 px-4 rounded-xl text-white text-sm outline-none"
            style={{ background: '#3a3a3a', border: '1px solid #444', colorScheme: 'dark' }}
          />
        </div>

        {/* Vehicle Number */}
        <div className="relative mb-3">
          <label
            className="absolute text-xs px-1"
            style={{ top: '-8px', left: '12px', background: '#2a2a2a', color: '#888' }}
          >
            Vehicle Number
          </label>
          <input
            type="text"
            value={vehicleNum}
            onChange={e => setVehicleNum(e.target.value)}
            placeholder="Vehicle Number"
            className="w-full py-3 px-4 rounded-xl text-white text-sm outline-none"
            style={{ background: '#3a3a3a', border: '1px solid #555' }}
          />
        </div>

        {/* Remark textarea */}
        <textarea
          value={remarkText}
          onChange={e => setRemarkText(e.target.value)}
          placeholder="Enter Remark"
          rows={4}
          className="w-full py-3 px-4 rounded-xl text-white text-sm outline-none resize-none mb-3"
          style={{ background: '#3a3a3a', border: '1px solid #444' }}
        />

        {/* Submit message */}
        {submitMsg && (
          <p className={`text-xs mb-3 ${submitMsg.type === 'success' ? 'text-[#34C759]' : 'text-red-400'}`}>
            {submitMsg.text}
          </p>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-xl text-white font-bold text-sm transition-opacity disabled:opacity-60"
          style={{ background: '#34C759' }}
        >
          {submitting ? 'Submitting…' : 'Submit Remark'}
        </button>
      </div>

      {/* ── Remarks History ── */}
      <h2 className="text-white font-bold text-base mb-3">Remarks History</h2>

      {/* Date filter dropdown */}
      <div className="relative mb-4">
        <button
          onClick={() => setDropdownOpen(o => !o)}
          className="w-full flex items-center justify-between py-3 px-4 rounded-xl text-sm font-medium"
          style={{ background: '#2a2a2a', border: '1px solid #34C759', color: '#34C759' }}
        >
          <span>{selectedLabel}</span>
          <span style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
            ▼
          </span>
        </button>
        {dropdownOpen && (
          <div
            className="absolute left-0 right-0 z-10 rounded-xl overflow-hidden mt-1"
            style={{ background: '#2a2a2a', border: '1px solid #444' }}
          >
            {DATE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => { setFilterKey(f.value); setDropdownOpen(false); setCurrentPage(1); }}
                className="w-full text-left px-4 py-3 text-sm transition-colors"
                style={{
                  color: filterKey === f.value ? '#34C759' : '#ccc',
                  background: filterKey === f.value ? '#333' : 'transparent',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: '#2a2a2a' }}>
              <div className="h-4 rounded w-1/3 mb-2" style={{ background: '#3a3a3a' }} />
              <div className="h-3 rounded w-full" style={{ background: '#3a3a3a' }} />
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="text-center py-8">
          <p className="text-[#A0A0A0] text-sm mb-3">{fetchError}</p>
          <button
            onClick={fetchRemarks}
            className="text-[#34C759] font-semibold text-sm underline"
          >
            Retry
          </button>
        </div>
      ) : filteredRemarks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[#A0A0A0] text-sm mb-3">
            {allRemarks.length === 0 ? 'No remarks yet.' : 'No remarks in this period.'}
          </p>
          {fetchError === null && (
            <button onClick={fetchRemarks} className="text-[#34C759] font-semibold text-sm underline">
              Retry
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((remark, idx) => (
              <div
                key={remark.id ?? idx}
                className="rounded-xl p-4"
                style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-white font-semibold text-sm">{remark.vehicle_number}</p>
                  <p className="text-[#A0A0A0] text-xs">
                    {new Date(remark.date).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>
                {remark.created_at && (
                  <p className="text-[#A0A0A0] text-xs mb-2">
                    {new Date(remark.created_at).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                )}
                <p className="text-white text-sm leading-relaxed">{remark.remarks}</p>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-4">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-40"
                style={{ background: '#2a2a2a' }}
              >
                Previous
              </button>
              <span className="text-white text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg text-white text-sm disabled:opacity-40"
                style={{ background: '#2a2a2a' }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
