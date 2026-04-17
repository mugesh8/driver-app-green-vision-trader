import { get, put } from './client';

const BASE = '/order-assignment';

export async function getDriverOrders(driverId, token) {
  return get(`${BASE}/driver/${encodeURIComponent(String(driverId))}`, token);
}

export async function getDriverOrdersStage1AndStage3(driverId, token) {
  return get(
    `${BASE}/driver/${encodeURIComponent(String(driverId))}/stage1-and-stage3`,
    token
  );
}

export async function getOrderAssignment(orderId, token) {
  return get(`${BASE}/${orderId}`, token);
}

export async function updateStage1Assignment(orderId, body, token) {
  return put(`${BASE}/${orderId}/stage1`, body, token);
}

export async function updateStage3Assignment(orderId, body, token) {
  return put(`${BASE}/${orderId}/stage3`, body, token);
}
