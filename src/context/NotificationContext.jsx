import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications, markAsRead, markAllAsRead } from '../api';

const NotificationContext = createContext(null);

function getDriverId(user) {
    if (!user) return null;
    return user.did ?? user.data?.did ?? user.id ?? user.driver_id ?? user.driverId ?? user._id;
}

export function NotificationProvider({ children }) {
    const { token, user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const driverId = getDriverId(user);

    const fetchNotifications = useCallback(async () => {
        if (!token || !driverId) {
            setLoading(false);
            if (!driverId && token) {
                console.warn("Driver ID not found for notifications");
            }
            return;
        }

        /* 
           We don't set loading to true here to avoid flickering if 
           we're just refreshing data. Initial load handles loading state.
        */
        setError(null);

        try {
            const response = await getNotifications(driverId, token);
            if (response.success || response.data) {
                setNotifications(response.data || []);
            } else {
                setNotifications([]);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
            setError('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, [token, driverId]);

    // Initial fetch
    useEffect(() => {
        if (token && driverId) {
            fetchNotifications();
        }
    }, [fetchNotifications, token, driverId]);

    // Poll for notifications every 30 seconds
    useEffect(() => {
        if (!token || !driverId) return;

        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchNotifications, token, driverId]);

    const markRead = async (id) => {
        if (!driverId) return;
        try {
            await markAsRead(id, driverId, token);
            setNotifications(prev =>
                prev.map(n => (n.dnid === id || n.id === id) ? { ...n, is_read: true } : n)
            );
        } catch (err) {
            console.error('Error marking notification as read:', err);
            // Optionally revert optimistic update here if needed
        }
    };

    const markAllRead = async () => {
        if (!driverId) return;
        try {
            await markAllAsRead(driverId, token);
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
        }
    };

    const value = {
        notifications,
        loading,
        error,
        refetch: fetchNotifications,
        markRead,
        markAllRead
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotificationContext() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotificationContext must be used within a NotificationProvider');
    }
    return context;
}
