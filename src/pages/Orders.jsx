import { useState } from 'react';

export default function Orders() {
  const [activeTab, setActiveTab] = useState('assigned');

  return (
    <div className="px-4 py-4">
      <div className="flex gap-2 p-1 bg-[#2C2C2E] rounded-xl mb-6">
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

      <p className="text-[#A0A0A0] text-center py-12">
        No assigned orders yet. Pull down to refresh.
      </p>
    </div>
  );
}
