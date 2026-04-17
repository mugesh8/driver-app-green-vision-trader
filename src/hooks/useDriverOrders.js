import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { get } from '../api/client';
import { getDriverOrdersStage1AndStage3 } from '../api/orderAssignment';

/** Match backup project: internal `did` first (assignments often use numeric did). */
function getDriverId(user) {
  if (!user) return null;
  return (
    user.did ??
    user.data?.did ??
    user.id ??
    user.driver_id ??
    user.driverId ??
    user.data?.driver_id ??
    user.data?.driverId ??
    user._id ??
    null
  );
}

function extractKgQty(item) {
  if (!item || typeof item !== 'object') return 0;

  // Prefer explicit fields if present
  const explicitKeys = [
    'quantity',
    'qty',
    'kg',
    'weight',
    'netWeight',
    'grossWeight',
    'collected_qty',
    'collectedQty',
    'quantity_kg',
    'qty_kg',
    'pickedQuantity',
    'revisedPicked',
    'packedAmount',
  ];

  for (const key of explicitKeys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
      const val = item[key];
      if (typeof val === 'string') {
        const match = val.match(/[\d.]+/);
        if (match) return Number(match[0]) || match[0];
      }
      return Number(val) || val;
    }
  }

  // Fallback: first numeric field whose name suggests quantity/weight
  const keys = Object.keys(item);
  const numericKeys = keys.filter((k) => typeof item[k] === 'number' || typeof item[k] === 'string');
  const fuzzyKey =
    numericKeys.find((k) => /qty|quantity|kg|weight|picked|packed/i.test(k)) || numericKeys[0];

  if (!fuzzyKey) return 0;
  const v = item[fuzzyKey];
  if (typeof v === 'string') {
    const match = v.match(/[\d.]+/);
    if (match) return Number(match[0]) || match[0];
  }
  return Number(v) || v;
}

// Extract a collected quantity for a given product name from a "stage-like" object
// (stage2_data, stage2_summary_data, stage3_data, etc.)
function extractQtyFromStage(stageRaw, productName) {
  if (!stageRaw) return 0;

  let stage;
  try {
    stage = typeof stageRaw === 'string' ? JSON.parse(stageRaw) : stageRaw;
  } catch {
    return 0;
  }
  if (!stage || typeof stage !== 'object') return 0;

  const candidates = [];

  if (Array.isArray(stage.productAssignments)) candidates.push(...stage.productAssignments);
  if (Array.isArray(stage.stage2Assignments)) candidates.push(...stage.stage2Assignments);
  if (Array.isArray(stage.products)) candidates.push(...stage.products);
  if (Array.isArray(stage.labourAssignments)) {
    stage.labourAssignments.forEach((l) => {
      if (Array.isArray(l.assignments)) candidates.push(...l.assignments);
    });
  }
  if (Array.isArray(stage.driverAssignments)) {
    stage.driverAssignments.forEach((d) => {
      if (Array.isArray(d.assignments)) candidates.push(...d.assignments);
    });
  }

  if (candidates.length === 0) return 0;

  const matched =
    candidates.find((c) => productName && c.product === productName) || candidates[0];

  if (!matched) return 0;

  return extractKgQty(matched);
}

// For local orders, derive the best available kg:
// 1) stage2_data / stage2_summary_data / summary_data (packed / picked / quantity / grossWeight)
// 2) fall back to product_assignments fields
function deriveLocalQty(localOrder, firstProduct) {
  const name = firstProduct?.product;

  const s2Qty =
    extractQtyFromStage(localOrder?.stage2_data, name) ||
    extractQtyFromStage(localOrder?.stage2_summary_data, name) ||
    extractQtyFromStage(localOrder?.summary_data, name);

  if (s2Qty && Number(s2Qty) !== 0) return s2Qty;

  return extractKgQty(firstProduct);
}

/** Backend often returns `{ data: [...] }` without `success: true`. */
function normalizeOrderListPayload(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.orders)) return res.orders;
  if (Array.isArray(res.items)) return res.items;
  if (Array.isArray(res.assignments)) return res.assignments;
  if (Array.isArray(res.results)) return res.results;
  return [];
}

/** List APIs use oid, order_id, or nested order.order_id — normalize for fetches and keys. */
function resolveOrderOid(order) {
  if (!order || typeof order !== 'object') return null;
  const oid =
    order.oid ??
    order.order_id ??
    order.orderId ??
    order.orderID ??
    order?.order?.order_id ??
    order?.order?.oid;
  return oid != null && String(oid).trim() !== '' ? oid : null;
}

function scoreOrderRowRichness(row) {
  const d = row?.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : row;
  let n = 0;
  if (d?.stage1_summary_data) n += 4;
  if (d?.stage3_summary_data) n += 4;
  if (d?.stage3_data) n += 3;
  if (d?.stage2_data) n += 1;
  if (d?.local_order_id != null) n += 2;
  return n;
}

/** Merge rows from /order/list and driver bundle; prefer richer assignment payloads. */
function mergeOrderRowsByOid(rowsA, rowsB) {
  const map = new Map();
  const add = (row) => {
    const oid = resolveOrderOid(row);
    if (oid == null) return;
    const k = String(oid);
    const prev = map.get(k);
    if (!prev || scoreOrderRowRichness(row) > scoreOrderRowRichness(prev)) {
      map.set(k, prev ? { ...prev, ...row } : row);
    }
  };
  rowsA.forEach(add);
  rowsB.forEach(add);
  return [...map.values()];
}

function normalizeLocalOrderListPayload(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.localOrders)) return res.localOrders;
  return [];
}

/** Treat assignment payloads whether wrapped in `{ success, data }` or returned raw. */
function unwrapAssignmentResponse(res) {
  if (!res) return null;
  if (res.assignment && typeof res.assignment === 'object') {
    const inner = unwrapAssignmentResponse(res.assignment);
    if (inner) return inner;
  }
  const d = res.data;
  if (d != null && typeof d === 'object' && !Array.isArray(d)) {
    if (
      d.stage1_summary_data != null ||
      d.stage3_summary_data != null ||
      d.stage3_data != null ||
      d.local_order_id != null ||
      d.summary_data != null ||
      d.product_assignments != null
    ) {
      return d;
    }
  }
  if (
    res.stage1_summary_data != null ||
    res.stage3_summary_data != null ||
    res.stage3_data != null ||
    res.local_order_id != null ||
    res.summary_data != null ||
    res.product_assignments != null
  ) {
    return res;
  }
  if (d != null && typeof d === 'object' && !Array.isArray(d)) {
    return d;
  }
  return null;
}

function keyMatchesSet(keys, raw) {
  if (raw === undefined || raw === null) return false;
  const s = String(raw).trim();
  if (!s) return false;
  if (keys.has(s)) return true;
  const n = Number(s);
  if (!Number.isNaN(n) && Number.isFinite(n) && keys.has(String(n))) return true;
  for (const k of keys) {
    if (k === s) return true;
    const nk = Number(k);
    const nv = Number(s);
    if (!Number.isNaN(nk) && !Number.isNaN(nv) && nk === nv) return true;
  }
  return false;
}

/** Collect every driver id variant from the logged-in profile (code, did, numeric id, _id). */
function expandDriverKeys(user) {
  const raw = [
    getDriverId(user),
    user?.driver_id,
    user?.driverId,
    user?.did,
    user?.id,
    user?._id,
    user?.data?.driver_id,
    user?.data?.driverId,
    user?.data?.did,
    user?.data?.id,
    user?.data?._id,
  ];
  const keys = new Set();
  for (const v of raw) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (!s) continue;
    keys.add(s);
    const n = Number(s);
    if (!Number.isNaN(n) && Number.isFinite(n)) keys.add(String(n));
  }
  return keys;
}

function driverDaMatches(keys, da) {
  if (!da || typeof da !== 'object') return false;
  const did = da.did !== undefined && da.did !== null ? String(da.did).trim() : '';
  const daDriverId =
    da.driverId !== undefined && da.driverId !== null ? String(da.driverId).trim() : '';
  if (did && keyMatchesSet(keys, did)) return true;
  if (daDriverId && keyMatchesSet(keys, daDriverId)) return true;
  const assigned =
    da.assignedDriverId !== undefined && da.assignedDriverId !== null
      ? String(da.assignedDriverId).trim()
      : '';
  if (assigned && keyMatchesSet(keys, assigned)) return true;
  const driverStr = String(da.driver || '').trim();
  if (!driverStr) return false;
  if (keyMatchesSet(keys, driverStr)) return true;
  if (driverStr.includes(' - ')) {
    const extractedId = driverStr.split(' - ').pop().trim();
    if (keyMatchesSet(keys, extractedId)) return true;
  }
  return false;
}

function parseJsonMaybe(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return null;
    }
  }
  return typeof v === 'object' ? v : null;
}

function stage3RowHasContent(a) {
  if (!a || typeof a !== 'object') return false;
  return (
    a.oiid != null ||
    a.product != null ||
    a.grossWeight != null ||
    a.entityName != null ||
    a.airportName != null ||
    a.destination != null
  );
}

/**
 * Line Airport data often lives in stage3_data.products / airportGroups, not only in
 * stage3_summary_data.driverAssignments (see AirportOrderViewInfo updates).
 */
function appendStage3LineAirportRows({ assignmentData, oid, order, driverKeys, stage3List }) {
  const stage3Summary = parseJsonMaybe(assignmentData.stage3_summary_data);
  const stage3Raw = parseJsonMaybe(assignmentData.stage3_data);

  const pushRow = (assignment, idPart, suffix, daFallback, assignmentIndexNum) => {
    if (!stage3RowHasContent(assignment)) return;
    const toName =
      assignment.airportName ||
      assignment.airport ||
      assignment.destination ||
      assignment.toName ||
      'Airport';
    const toDetail =
      assignment.airportLocation ||
      assignment.location ||
      assignment.toDetail ||
      assignment.toAddress ||
      assignment.address ||
      '';
    const ai =
      typeof assignmentIndexNum === 'number' ? assignmentIndexNum : idPart;
    stage3List.push({
      id: `${oid}-${suffix}-${idPart}`,
      orderId: order.order_id || oid,
      oid,
      assignmentIndex: ai,
      oiid: assignment.oiid ?? assignment.id,
      driverId: assignment.driverId ?? assignment.did ?? daFallback?.driverId ?? daFallback?.did,
      status: assignment.status || 'Pending',
      statusColor: 'bg-[#34C759]',
      fromName: 'Warehouse',
      fromAddress: '',
      fromDetail: 'Packing Center',
      toName,
      toDetail,
      product: assignment.product || assignment.entityName || '-',
      grossWeight: assignment.grossWeight || 'N/A',
      noOfPkgs: assignment.noOfPkgs || 0,
      labour: assignment.labour || 'N/A',
      ct: assignment.ct || 'N/A',
    });
  };

  const consumeDriverAssignments = (stage3Data, tag) => {
    const list = stage3Data?.driverAssignments;
    if (!Array.isArray(list)) return;
    list.forEach((da) => {
      if (!driverDaMatches(driverKeys, da)) return;
      const assignments = da.assignments;
      if (!Array.isArray(assignments)) return;
      assignments.forEach((assignment, idx) => {
        pushRow(assignment, idx, `s3da-${tag}`, da, idx);
      });
    });
  };

  const lineMatchesDriver = (assignment, group) => {
    const lineHas =
      assignment.driverId != null ||
      assignment.did != null ||
      assignment.driver != null ||
      assignment.assignedDriverId != null ||
      assignment.driver_id != null;
    if (lineHas) return driverDaMatches(driverKeys, assignment);
    if (group && (group.driverId != null || group.did != null || group.driver != null)) {
      return driverDaMatches(driverKeys, group);
    }
    return false;
  };

  const consumeAirportGroups = (stage3Data, tag) => {
    const groups = stage3Data?.airportGroups;
    if (!groups || typeof groups !== 'object') return;
    Object.values(groups).forEach((group, gIdx) => {
      const products = group.products || group.assignments || [];
      if (!Array.isArray(products)) return;
      products.forEach((assignment, idx) => {
        if (!lineMatchesDriver(assignment, group)) return;
        const merged = {
          ...assignment,
          airportName: assignment.airportName || group.airportName || group.name,
          airportLocation: assignment.airportLocation || group.location || group.airportLocation,
        };
        pushRow(merged, `${gIdx}-${idx}`, `s3ag-${tag}`, null, idx);
      });
    });
  };

  const consumeProducts = (stage3Data, tag) => {
    const products = stage3Data?.products;
    if (!Array.isArray(products)) return;
    products.forEach((assignment, idx) => {
      const lineHas =
        assignment.driverId != null ||
        assignment.did != null ||
        assignment.driver != null ||
        assignment.assignedDriverId != null ||
        assignment.driver_id != null;
      if (!lineHas) return;
      if (!driverDaMatches(driverKeys, assignment)) return;
      pushRow(assignment, idx, `s3pr-${tag}`, null, idx);
    });
  };

  [stage3Summary, stage3Raw].forEach((data, i) => {
    const tag = i === 0 ? 'sum' : 'raw';
    if (!data) return;
    consumeDriverAssignments(data, tag);
    consumeAirportGroups(data, tag);
    consumeProducts(data, tag);
  });
}

export function useDriverOrders() {
  const { user, token } = useAuth();
  const driverId = getDriverId(user);
  const [stage1Orders, setStage1Orders] = useState([]);
  const [stage3Orders, setStage3Orders] = useState([]);
  const [localOrders, setLocalOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    if (!driverId || !token) {
      setLoading(false);
      setError(!token ? 'Not authenticated' : 'Driver ID not found');
      return;
    }

    setLoading(true);
    setError(null);
    const driverKeys = expandDriverKeys(user);

    try {

      const [ordersResponse, stageBundle] = await Promise.all([
        get('/order/list', token).catch((e) => {
          console.warn('/order/list failed:', e);
          return null;
        }),
        getDriverOrdersStage1AndStage3(driverId, token).catch((e) => {
          console.warn('driver stage1/stage3 bundle failed:', e);
          return null;
        }),
      ]);
      const orderRows = mergeOrderRowsByOid(
        normalizeOrderListPayload(ordersResponse),
        normalizeOrderListPayload(stageBundle)
      );
      if (orderRows.length === 0) {
        setStage1Orders([]);
        setStage3Orders([]);
      } else {
        const stage1List = [];
        const stage3List = [];
        // Initialize localList here to collect from loop
        const localListFromLoop = [];

        for (const order of orderRows) {
          try {
            const oid = resolveOrderOid(order);
            if (oid == null) continue;

            let assignmentResponse;
            let isLocal = false;
            let isFlower = false;

            // Optimistically check order type if available
            const isLocalType = order.type === 'local' || order.order_type === 'local';
            const isFlowerType = order.type === 'flower' || order.order_type === 'flower';

            const embedded = unwrapAssignmentResponse(order);
            const hasEmbeddedAssignment =
              embedded &&
              (embedded.stage1_summary_data ||
                embedded.stage3_summary_data ||
                embedded.stage3_data ||
                embedded.summary_data ||
                embedded.local_order_id != null);

            if (hasEmbeddedAssignment) {
              assignmentResponse = { data: embedded };
              if (isLocalType) isLocal = true;
              else if (isFlowerType) isFlower = true;
              else if (
                embedded.local_order_id != null &&
                embedded.stage1_summary_data == null &&
                embedded.stage3_summary_data == null &&
                embedded.stage3_data == null
              ) {
                isLocal = true;
              }
            } else if (isLocalType) {
              try {
                assignmentResponse = await get(`/local-order/${oid}`, token);
                isLocal = true;
              } catch (err) {
                console.error(`Failed to fetch local assignment for ${oid}:`, err);
              }
            } else if (isFlowerType) {
              try {
                assignmentResponse = await get(`/flower-order-assignment/${oid}`, token);
                isFlower = true;
              } catch (err) {
                console.error(`Failed to fetch flower assignment for ${oid}:`, err);
              }
            } else {
              // Backup: always try standard order-assignment first (no ORD- shortcut to local)
              try {
                assignmentResponse = await get(`/order-assignment/${oid}`, token, { silent: true });
              } catch (err) {
                const errMsg = err.message || (err.data && err.data.message) || '';

                // If the error explicitly says it's a local/flower order, follow that hint
                if (errMsg.includes('local order')) {
                  try {
                    assignmentResponse = await get(`/local-order/${oid}`, token);
                    isLocal = true;
                  } catch (e) { console.error(e); }
                } else if (errMsg.includes('flower order')) {
                  try {
                    assignmentResponse = await get(`/flower-order-assignment/${oid}`, token);
                    isFlower = true;
                  } catch (e) {
                    // It might be local if flower endpoint says so
                    if (e.message?.includes('local order') || e.data?.message?.includes('local order')) {
                      try {
                        assignmentResponse = await get(`/local-order/${oid}`, token);
                        isLocal = true;
                      } catch (le) { console.error(le); }
                    } else {
                      console.error(e);
                    }
                  }
                } else {
                  // If regular assignment fails without specific hint, try flower order assignment
                  try {
                    assignmentResponse = await get(`/flower-order-assignment/${oid}`, token, { silent: true });
                    isFlower = true;
                  } catch (flowerErr) {
                    const flowerErrMsg = flowerErr.message || (flowerErr.data && flowerErr.data.message) || '';
                    // If flower assignment fails, try local order
                    if (flowerErrMsg.includes('local order')) {
                      // proceed to local
                    }

                    try {
                      assignmentResponse = await get(`/local-order/${oid}`, token, { silent: true });
                      isLocal = true;
                    } catch (localErr) {
                      // Silent fail or log if needed, but since we tried everything, maybe log warnings only if relevant
                      // console.error(`Failed to fetch assignment for ${oid}`);
                      continue;
                    }
                  }
                }
              }
            }

            let assignmentData = unwrapAssignmentResponse(assignmentResponse);
            if (!assignmentData) continue;

            if (
              !isLocal &&
              !isFlower &&
              !assignmentData.stage3_summary_data &&
              !assignmentData.stage3_data
            ) {
              try {
                const flowerRes = await get(`/flower-order-assignment/${oid}`, token, { silent: true });
                const fd = unwrapAssignmentResponse(flowerRes);
                if (fd && (fd.stage3_summary_data || fd.stage3_data)) {
                  assignmentData = {
                    ...assignmentData,
                    stage3_summary_data: fd.stage3_summary_data ?? assignmentData.stage3_summary_data,
                    stage3_data: fd.stage3_data ?? assignmentData.stage3_data,
                  };
                }
              } catch (e) {
                /* no flower stage3 for this order */
              }
            }

            if (isLocal) {
              // Process local order
              const localOrder = assignmentData;
              let finalDriverId = localOrder.driver_id || localOrder.driverId || localOrder.did;
              let finalOiid = localOrder.local_order_id;
              let foundInSummary = false;
              let matchedDriverGroupInSummary = false;

              // Try to find exact match in summary_data if available
              if (localOrder.summary_data) {
                const summary = typeof localOrder.summary_data === 'string'
                  ? JSON.parse(localOrder.summary_data)
                  : localOrder.summary_data;

                if (summary?.driverAssignments) {
                  const dGroup = summary.driverAssignments.find((da) =>
                    driverDaMatches(driverKeys, da)
                  );

                  if (dGroup) {
                    matchedDriverGroupInSummary = true;
                    finalDriverId = dGroup.driverId || dGroup.did || finalDriverId;
                    // Find the assignment
                    // Usually local orders in summary have assignments.
                    // We'll take the first one or try to match if we knew which one.
                    // Since we are iterating orders, we assume the order.oid matches.
                    // But local orders might have multiple tasks.
                    // For now, take the first valid one or the one matching local_order_id if possible.
                    const assign = dGroup.assignments?.find(a =>
                      String(a.oiid) === String(localOrder.local_order_id) ||
                      String(a.orderId) === String(localOrder.order_id) ||
                      a.oiid === localOrder.local_order_id
                    ) || dGroup.assignments?.[0]; // Fallback to first assignment if specific one not matched

                    if (localOrder.order_id === 'ORD-027') {
                      console.log('DEBUG ORD-027 Summary:', {
                        driverId: driverId,
                        dGroupFound: !!dGroup,
                        dGroupDriverId: dGroup?.driverId,
                        dGroupDid: dGroup?.did,
                        assignFound: !!assign,
                        assignOiid: assign?.oiid,
                        assignOiidType: typeof assign?.oiid,
                        finalDriverId,
                        finalOiid: assign ? assign.oiid : finalOiid
                      });
                    }

                    if (assign) {
                      finalOiid = assign.oiid; // Use the assignment's actual OIID which backend expects
                      foundInSummary = true;
                      // Use the granular status from the assignment if available
                      if (assign.status) {
                        localOrder.status = assign.status;
                      }
                    }
                  } else if (localOrder.order_id === 'ORD-027') {
                    console.log('DEBUG ORD-027: Driver match failed. Current:', driverId, 'Summary Groups:', summary.driverAssignments.map(g => ({ did: g.did, driverId: g.driverId, driver: g.driver })));
                  }
                }
              }

              try {
                // Only show local pickups assigned to this driver (strict id / summary group match).
                let isMatch = matchedDriverGroupInSummary;
                if (!isMatch) {
                  isMatch =
                    keyMatchesSet(driverKeys, localOrder.driver_id) ||
                    keyMatchesSet(driverKeys, localOrder.driverId) ||
                    keyMatchesSet(driverKeys, localOrder.did);
                }
                if (!isMatch && localOrder.driver) {
                  const driverStr = String(localOrder.driver).trim();
                  if (keyMatchesSet(driverKeys, driverStr)) {
                    isMatch = true;
                  } else if (driverStr.includes(' - ')) {
                    const extractedId = driverStr.split(' - ').pop().trim();
                    if (keyMatchesSet(driverKeys, extractedId)) isMatch = true;
                  }
                }
                if (!isMatch) {
                  continue;
                }

                let routes = [];
                if (localOrder.delivery_routes) {
                  routes = typeof localOrder.delivery_routes === 'string'
                    ? JSON.parse(localOrder.delivery_routes)
                    : localOrder.delivery_routes;
                }

                let products = [];
                if (localOrder.product_assignments) {
                  products = typeof localOrder.product_assignments === 'string'
                    ? JSON.parse(localOrder.product_assignments)
                    : localOrder.product_assignments;
                }

                const firstRoute = routes[0] || {};
                const firstProduct = products[0] || {};

                const localQty = deriveLocalQty(localOrder, firstProduct);

                localListFromLoop.push({
                  id: `${localOrder.local_order_id}-loop`,
                  orderId: localOrder.order?.order_id || localOrder.order_id,
                  localOrderId: localOrder.local_order_id, // integer FK for backend lookup
                  type: 'local',
                  oiid: finalOiid, // Use the summary match if found
                  driverId: finalDriverId, // Use the summary match if found
                  status: localOrder.status || 'Pending',
                  fromName: firstProduct.entityName || firstRoute.sourceName || '-',
                  fromAddress: firstProduct.address || '',
                  fromDetail: '',
                  toName: 'Warehouse',
                  toDetail: 'Packing Center',
                  product: `${firstProduct.product || '-'} - ${localQty} kg`,
                  phone: firstProduct.phone || '+91 98765 12345',
                });
              } catch (err) {
                console.error(`Error processing local order ${localOrder.local_order_id}:`, err);
              }
              continue; // Done with local order
            }

            // Parse stage1_summary_data (stage1 = local pickup / warehouse collection)
            if (assignmentData.stage1_summary_data) {
              let stage1Data = typeof assignmentData.stage1_summary_data === 'string'
                ? JSON.parse(assignmentData.stage1_summary_data)
                : assignmentData.stage1_summary_data;

              // Build a lookup for collected kg per oiid using later stages (stage2 / stage3),
              // because stage1 `quantity` can remain 0 even after collection.
              const collectedByOiid = {};

              try {
                if (assignmentData.stage2_data) {
                  const stage2Raw = typeof assignmentData.stage2_data === 'string'
                    ? JSON.parse(assignmentData.stage2_data)
                    : assignmentData.stage2_data;

                  const s2Products = stage2Raw?.productAssignments
                    || stage2Raw?.stage2Assignments
                    || stage2Raw?.products
                    || [];

                  s2Products.forEach((p) => {
                    const key = String(p.oiid ?? p.id ?? '');
                    if (!key) return;
                    let q =
                      p.packedAmount ??
                      p.revisedPicked ??
                      p.pickedQuantity ??
                      p.quantity ??
                      0;
                    if ((!q || q === 0) && typeof p.grossWeight === 'string') {
                      const m = p.grossWeight.match(/[\d.]+/);
                      if (m) q = Number(m[0]);
                    }
                    if (q && Number(q) !== 0) {
                      collectedByOiid[key] = Number(q) || q;
                    }
                  });
                }

                // Fallback to stage3 data (airport leg) if stage2 doesn't have usable weights
                if (
                  Object.keys(collectedByOiid).length === 0 &&
                  assignmentData.stage3_data
                ) {
                  const stage3Raw = typeof assignmentData.stage3_data === 'string'
                    ? JSON.parse(assignmentData.stage3_data)
                    : assignmentData.stage3_data;

                  const s3Products = stage3Raw?.products || [];
                  s3Products.forEach((p) => {
                    const key = String(p.oiid ?? p.id ?? '');
                    if (!key) return;
                    let q = 0;
                    if (typeof p.grossWeight === 'string') {
                      const m = p.grossWeight.match(/[\d.]+/);
                      if (m) q = Number(m[0]);
                    }
                    if ((!q || q === 0) && (p.totalWeight || p.weight)) {
                      q = p.totalWeight || p.weight;
                    }
                    if (q && Number(q) !== 0) {
                      collectedByOiid[key] = Number(q) || q;
                    }
                  });
                }
              } catch (e) {
                console.error('Failed to derive collected quantities from later stages', e);
              }

              if (stage1Data?.driverAssignments) {
                const driverAssignment = stage1Data.driverAssignments.find((da) =>
                  driverDaMatches(driverKeys, da)
                );

                if (driverAssignment?.assignments) {
                  driverAssignment.assignments.forEach((assignment, idx) => {
                    const key = String(assignment.oiid ?? '');
                    let stage1Qty =
                      (key && collectedByOiid[key] !== undefined)
                        ? collectedByOiid[key]
                        : extractKgQty(assignment);

                    stage1List.push({
                      id: `${oid}-${idx}`,
                      orderId: order.order_id || oid,
                      oid,
                      assignmentIndex: idx,
                      oiid: assignment.oiid,
                      driverId: driverAssignment.driverId,
                      type: 'stage1',
                      status: assignment.status || 'Select...',
                      fromName: assignment.entityName || '-',
                      fromAddress: assignment.address || '',
                      fromDetail: '',
                      toName: 'Warehouse',
                      toDetail: 'Packing Center',
                      product: `${assignment.product || '-'} - ${stage1Qty} kg`,
                      phone: assignment.phone || '+91 98765 12345',
                    });
                  });
                }
              }
            }

            if (assignmentData.stage3_summary_data || assignmentData.stage3_data) {
              appendStage3LineAirportRows({
                assignmentData,
                oid,
                order,
                driverKeys,
                stage3List,
              });
            }
          } catch (err) {
            console.error(`Error processing order ${resolveOrderOid(order) ?? '?'}:`, err);
          }
        }

        setStage1Orders(stage1List);
        setStage3Orders(stage3List);

        // Update local orders from loop
        setLocalOrders(prev => {
          // Optionally merge or just set. For now, we set loop list as primary if bulk fails.
          // But let's check bulk fetch separately.
          return localListFromLoop;
        });

      }
    } catch (err) {
      console.error('Error fetching stage orders:', err);
      setStage1Orders([]);
      setStage3Orders([]);
      setError(err.message || 'Failed to load order list');
    }

    // Fetch local orders separately (keep this as backup or for non-assigned access if allowed)
    try {
      const localList = [];
      const localOrdersResponse = await get('/local-order', token);
      const localData = normalizeLocalOrderListPayload(localOrdersResponse);

      if (localData.length > 0) {
        console.log('Processing local orders:', localData.length);

        localData.forEach((localOrder, idx) => {
          try {
            const orderDriverId = localOrder.driver_id || localOrder.driverId || localOrder.did;

            let isMatch = keyMatchesSet(driverKeys, orderDriverId);

            if (!isMatch && localOrder.driver) {
              const driverStr = String(localOrder.driver).trim();
              if (keyMatchesSet(driverKeys, driverStr)) {
                isMatch = true;
              } else if (driverStr.includes(' - ')) {
                const extractedId = driverStr.split(' - ').pop().trim();
                if (keyMatchesSet(driverKeys, extractedId)) isMatch = true;
              }
            }

            if (!isMatch) {
              // console.log(`Skipping order ${localOrder.local_order_id}. Assigned: ${orderDriverId}, Current: ${currentDriverId}`);
              return;
            } else {
              console.log(`Matched order ${localOrder.local_order_id} for driver keys`, [...driverKeys]);
            }

            let routes = [];
            if (localOrder.delivery_routes) {
              routes = typeof localOrder.delivery_routes === 'string'
                ? JSON.parse(localOrder.delivery_routes)
                : localOrder.delivery_routes;
            }

            let products = [];
            if (localOrder.product_assignments) {
              products = typeof localOrder.product_assignments === 'string'
                ? JSON.parse(localOrder.product_assignments)
                : localOrder.product_assignments;
            }

            const firstRoute = routes[0] || {};
            const firstProduct = products[0] || {};

            const bulkLocalQty = deriveLocalQty(localOrder, firstProduct);

            localList.push({
              id: `${localOrder.local_order_id}-${idx}`,
              orderId: localOrder.order?.order_id || localOrder.order_id,
              localOrderId: localOrder.local_order_id, // integer FK for backend lookup
              type: 'local',
              oiid: localOrder.local_order_id,
              driverId: localOrder.driver_id,
              status: localOrder.status || 'Pending',
              fromName: firstProduct.entityName || firstRoute.sourceName || '-',
              fromAddress: firstProduct.address || '',
              fromDetail: '',
              toName: 'Warehouse',
              toDetail: 'Packing Center',
              product: `${firstProduct.product || '-'} - ${bulkLocalQty} kg`,
              phone: firstProduct.phone || '+91 98765 12345',
            });
          } catch (err) {
            console.error(`Error processing local order ${localOrder.local_order_id}:`, err);
          }
        });
      }

      // Merge loop list and bulk list, removing duplicates
      setLocalOrders(prev => {
        const fromLoop = prev || [];
        const fromBulk = localList;
        const combined = [...fromLoop];

        fromBulk.forEach(item => {
          if (!combined.some(existing => existing.oiid === item.oiid)) {
            combined.push(item);
          }
        });
        return combined;
      });
      if (localList.length > 0) {
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching local orders:', err);
      // Do NOT clear localOrders if bulk fetch fails, retain what we got from data loop
    } finally {
      setLoading(false);
    }
  }, [driverId, token, user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStage1 = useCallback(
    async (orderId) => {
      await fetchOrders();
    },
    [fetchOrders]
  );

  const updateStage3 = useCallback(
    async (orderId) => {
      await fetchOrders();
    },
    [fetchOrders]
  );

  return {
    driverId,
    stage1Orders,
    stage3Orders,
    localOrders,
    loading,
    error,
    fetchOrders,
    updateStage1,
    updateStage3,
  };
}
