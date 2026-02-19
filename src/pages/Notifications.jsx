import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Check, Trash2, Clock } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, loading, error, markAllRead, markRead } = useNotifications();

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="px-4 py-4 min-h-screen bg-[#1A1A1A] pb-20">
      <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#1A1A1A] z-10 py-2">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 text-white hover:bg-[#333333] rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" strokeWidth={2} />
          </button>
          <h1 className="text-white font-bold text-lg">Notifications</h1>
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-[#34C759] text-sm font-semibold hover:opacity-80 transition-opacity"
          >
            Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#34C759]"></div>
          <p className="text-[#A0A0A0] mt-4">Loading notifications...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#333333] text-white rounded-lg hover:bg-[#444444]"
          >
            Retry
          </button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-[#333333] flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-[#A0A0A0]" strokeWidth={2} />
          </div>
          <p className="text-[#A0A0A0] text-center">
            No notifications yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification.dnid || notification.id || notification._id}
              className={`p-4 rounded-xl border ${notification.is_read ? 'bg-[#1A1A1A] border-[#333333]' : 'bg-[#2C2C2E] border-transparent'} transition-colors`}
              onClick={() => !notification.is_read && markRead(notification.dnid || notification.id || notification._id)}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-semibold text-base ${notification.is_read ? 'text-[#A0A0A0]' : 'text-white'}`}>
                  {notification.title || 'New Message'}
                </h3>
                {!notification.is_read && (
                  <span className="w-2 h-2 rounded-full bg-[#34C759] mt-2"></span>
                )}
              </div>
              <p className="text-[#A0A0A0] text-sm mb-3 line-clamp-2">
                {notification.message || notification.content || 'No content'}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#666666] text-xs">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(notification.createdAt || notification.created_at || notification.timestamp)}</span>
                </div>
                {notification.is_read && (
                  <Check className="w-4 h-4 text-[#34C759]" strokeWidth={2} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
