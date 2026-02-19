import { get, put } from './client';

const BASE = '/flower-order-assignment';

export async function getFlowerOrderAssignment(orderId) {
  return get(`${BASE}/${orderId}`);
}

export async function updateStage1Assignment(orderId, body) {
  return put(`${BASE}/${orderId}/stage1`, body);
}

export async function updateStage2Assignment(orderId, body) {
  return put(`${BASE}/${orderId}/stage2`, body);
}

export async function updateStage3Assignment(orderId, body) {
  return put(`${BASE}/${orderId}/stage3`, body);
}
