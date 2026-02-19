import { get, patch } from './client';

const BASE = '/driver-notification';

export async function getNotifications(driverId, token) {
    if (!driverId) throw new Error("Driver ID is required");
    return get(`${BASE}/driver/${driverId}`, token);
}

export async function markAsRead(notificationId, driverId, token) {
    if (!driverId) throw new Error("Driver ID is required");
    return patch(`${BASE}/${notificationId}/read/${driverId}`, {}, token);
}

export async function markAllAsRead(driverId, token) {
    if (!driverId) throw new Error("Driver ID is required");
    return patch(`${BASE}/mark-all/read/${driverId}`, {}, token);
}
