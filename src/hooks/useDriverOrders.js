import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { get } from '../api/client';

function getDriverId(user) {
  if (!user) return null;

  // For order assignments, the backend and admin panel usually refer to
  // drivers using the string code (e.g. "DRV-260116-0002"). Prefer that
  // code for matching, but fall back to the internal numeric `did` if
  // needed so older data still works.
  const codeId =
    user.driver_id ??
    user.driverId ??
    user.data?.driver_id ??
    user.data?.driverId;

  const numericId =
    user.did ??
    user.data?.did ??
    user.id ??
    user._id;

  return codeId || numericId || null;
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

    try {

      const ordersResponse = await get('/order/list', token);
      if (!ordersResponse.success || !ordersResponse.data) {
        setStage1Orders([]);
        setStage3Orders([]);
      } else {
        const stage1List = [];
        const stage3List = [];
        // Initialize localList here to collect from loop
        const localListFromLoop = [];

        for (const order of ordersResponse.data) {
          try {
            let assignmentResponse;
            let isLocal = false;
            let isFlower = false;

            // Optimistically check order type if available
            const isLocalType = order.type === 'local' || order.order_type === 'local';
            const isFlowerType = order.type === 'flower' || order.order_type === 'flower';

            if (isLocalType) {
              try {
                assignmentResponse = await get(`/local-order/${order.oid}`, token);
                isLocal = true;
              } catch (err) {
                console.error(`Failed to fetch local assignment for ${order.oid}:`, err);
              }
            } else if (isFlowerType) {
              try {
                assignmentResponse = await get(`/flower-order-assignment/${order.oid}`, token);
                isFlower = true;
              } catch (err) {
                console.error(`Failed to fetch flower assignment for ${order.oid}:`, err);
              }
            } else {
              // Fallback to sequential trial if type is unknown
              try {
                assignmentResponse = await get(`/order-assignment/${order.oid}`, token, { silent: true });
              } catch (err) {
                const errMsg = err.message || (err.data && err.data.message) || '';

                // If the error explicitly says it's a local/flower order, follow that hint
                if (errMsg.includes('local order')) {
                  try {
                    assignmentResponse = await get(`/local-order/${order.oid}`, token);
                    isLocal = true;
                  } catch (e) { console.error(e); }
                } else if (errMsg.includes('flower order')) {
                  try {
                    assignmentResponse = await get(`/flower-order-assignment/${order.oid}`, token);
                    isFlower = true;
                  } catch (e) {
                    // It might be local if flower endpoint says so
                    if (e.message?.includes('local order') || e.data?.message?.includes('local order')) {
                      try {
                        assignmentResponse = await get(`/local-order/${order.oid}`, token);
                        isLocal = true;
                      } catch (le) { console.error(le); }
                    } else {
                      console.error(e);
                    }
                  }
                } else {
                  // If regular assignment fails without specific hint, try flower order assignment
                  try {
                    assignmentResponse = await get(`/flower-order-assignment/${order.oid}`, token, { silent: true });
                    isFlower = true;
                  } catch (flowerErr) {
                    const flowerErrMsg = flowerErr.message || (flowerErr.data && flowerErr.data.message) || '';
                    // If flower assignment fails, try local order
                    if (flowerErrMsg.includes('local order')) {
                      // proceed to local
                    }

                    try {
                      assignmentResponse = await get(`/local-order/${order.oid}`, token, { silent: true });
                      isLocal = true;
                    } catch (localErr) {
                      // Silent fail or log if needed, but since we tried everything, maybe log warnings only if relevant
                      // console.error(`Failed to fetch assignment for ${order.oid}`);
                      continue;
                    }
                  }
                }
              }
            }

            if (!assignmentResponse?.success || !assignmentResponse?.data) continue;

            const assignmentData = assignmentResponse.data;

            if (isLocal) {
              // Process local order
              const localOrder = assignmentData;
              let finalDriverId = localOrder.driver_id || localOrder.driverId || localOrder.did;
              let finalOiid = localOrder.local_order_id;
              let foundInSummary = false;

              // Try to find exact match in summary_data if available
              if (localOrder.summary_data) {
                const summary = typeof localOrder.summary_data === 'string'
                  ? JSON.parse(localOrder.summary_data)
                  : localOrder.summary_data;

                if (summary?.driverAssignments) {
                  const currentDriverIdStr = String(driverId);
                  // Find the driver group – use STRICT matching so a driver
                  // only ever sees orders explicitly assigned to them.
                  const dGroup = summary.driverAssignments.find(da => {
                    // Match by various ID fields
                    if (da.driverId && String(da.driverId) === currentDriverIdStr) return true;
                    if (da.did && String(da.did) === currentDriverIdStr) return true;
                    // Match "Name - CODE" style strings by the trailing token only
                    const dStr = String(da.driver || '').trim();
                    if (!dStr) return false;
                    if (dStr === currentDriverIdStr) return true;
                    if (dStr.includes(' - ')) {
                      const extracted = dStr.split(' - ').pop().trim();
                      if (extracted === currentDriverIdStr) return true;
                    }
                    return false;
                  });

                  if (dGroup) {
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
                // Verify driver assignment if needed.
                // If we already matched this driver via summary_data, trust that
                // match even if driverId formats differ (e.g. code vs numeric).
                const orderDriverId = finalDriverId;
                const currentDriverId = driverId;
                const orderDriverIdStr = String(orderDriverId || '');
                const currentDriverIdStr = String(currentDriverId || '');

                // Start with "matched" when summary_data explicitly linked this
                // local order to the current driver.
                let isMatch = !!foundInSummary || orderDriverIdStr === currentDriverIdStr;

                // Double check against top level if summary match failed/ambiguous
                if (!isMatch) {
                  const topLevelId = localOrder.driver_id || localOrder.driverId || localOrder.did;
                  if (String(topLevelId) === currentDriverIdStr) isMatch = true;

                  if (!isMatch && localOrder.driver) {
                    const driverStr = String(localOrder.driver).trim();
                    if (driverStr === currentDriverIdStr) {
                      isMatch = true;
                    } else if (driverStr.includes(' - ')) {
                      const extractedId = driverStr.split(' - ').pop().trim();
                      if (extractedId === currentDriverIdStr) {
                        isMatch = true;
                      }
                    }
                  }
                }

                // If, after all checks, this order isn't actually assigned to
                // the current driver, log (once) for debugging and skip it.
                if (!isMatch) {
                  if (!foundInSummary && orderDriverIdStr) {
                    console.log(`Local order ${localOrder.local_order_id} driver mismatch. Assigned: ${orderDriverIdStr}, Current: ${currentDriverIdStr}`);
                  }
                  return;
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
                const driverAssignment = stage1Data.driverAssignments.find(da => {
                  const idStr = String(driverId);
                  // Check did field
                  if (da.did && String(da.did) === idStr) return true;
                  // Check driverId field
                  if (da.driverId && String(da.driverId) === idStr) return true;
                  // Check driver field (name or name - id format)
                  const driverStr = String(da.driver || '').trim();
                  if (!driverStr) return false;
                  if (driverStr === idStr) return true;
                  if (driverStr.includes(' - ')) {
                    const extractedId = driverStr.split(' - ').pop().trim();
                    if (extractedId === idStr) return true;
                  }
                  return false;
                });

                if (driverAssignment?.assignments) {
                  driverAssignment.assignments.forEach((assignment, idx) => {
                    const key = String(assignment.oiid ?? '');
                    let stage1Qty =
                      (key && collectedByOiid[key] !== undefined)
                        ? collectedByOiid[key]
                        : extractKgQty(assignment);

                    stage1List.push({
                      id: `${order.oid}-${idx}`,
                      orderId: order.order_id || order.oid,
                      oid: order.oid,
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

            // Parse stage3_summary_data
            if (assignmentData.stage3_summary_data) {
              let stage3Data = typeof assignmentData.stage3_summary_data === 'string'
                ? JSON.parse(assignmentData.stage3_summary_data)
                : assignmentData.stage3_summary_data;

              if (stage3Data?.driverAssignments) {
                const driverAssignment = stage3Data.driverAssignments.find(da => {
                  const idStr = String(driverId);
                  // Check did field
                  if (da.did && String(da.did) === idStr) return true;
                  // Check driverId field
                  if (da.driverId && String(da.driverId) === idStr) return true;
                  // Check driver field (name or name - id format)
                  const driverStr = String(da.driver || '').trim();
                  if (!driverStr) return false;
                  if (driverStr === idStr) return true;
                  if (driverStr.includes(' - ')) {
                    const extractedId = driverStr.split(' - ').pop().trim();
                    if (extractedId === idStr) return true;
                  }
                  return false;
                });

                if (driverAssignment?.assignments) {
                  driverAssignment.assignments.forEach((assignment, idx) => {
                    if (assignment.airportName && assignment.airportLocation) {
                      stage3List.push({
                        id: `${order.oid}-${idx}`,
                        orderId: order.order_id || order.oid,
                        oid: order.oid,
                        assignmentIndex: idx,
                        oiid: assignment.oiid,
                        driverId: driverAssignment.did || driverAssignment.driverId,
                        status: assignment.status || 'Pending',
                        fromName: 'Warehouse',
                        fromAddress: '',
                        fromDetail: 'Packing Center',
                        toName: assignment.airportName,
                        toDetail: assignment.airportLocation,
                        product: assignment.product || '-',
                        grossWeight: assignment.grossWeight || 'N/A',
                        noOfPkgs: assignment.noOfPkgs || 0,
                        labour: assignment.labour || 'N/A',
                        ct: assignment.ct || 'N/A',
                      });
                    }
                  });
                }
              }
            }
          } catch (err) {
            console.error(`Error processing order ${order.oid}:`, err);
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
    }

    // Fetch local orders separately (keep this as backup or for non-assigned access if allowed)
    try {
      const localList = [];
      const localOrdersResponse = await get('/local-order', token);

      if (localOrdersResponse) {
        let localData = [];
        if (Array.isArray(localOrdersResponse)) {
          localData = localOrdersResponse;
        } else if (localOrdersResponse && Array.isArray(localOrdersResponse.data)) {
          localData = localOrdersResponse.data;
        }

        console.log('Processing local orders:', localData.length);

        localData.forEach((localOrder, idx) => {
          try {
            // Filter by driverId
            const currentDriverId = driverId;
            const currentDriverIdStr = String(currentDriverId || '');

            // Check multiple potential ID fields
            const orderDriverId = localOrder.driver_id || localOrder.driverId || localOrder.did;
            const orderDriverIdStr = String(orderDriverId || '');

            // Skip if driver IDs don't match
            // Check exact match
            let isMatch = orderDriverIdStr === currentDriverIdStr;

            // If no exact match, check if driver string contains ID (handle Name - ID format if applicable)
            if (!isMatch && localOrder.driver) {
              const driverStr = String(localOrder.driver).trim();
              if (driverStr === currentDriverIdStr) {
                isMatch = true;
              } else if (driverStr.includes(' - ')) {
                const extractedId = driverStr.split(' - ').pop().trim();
                if (extractedId === currentDriverIdStr) isMatch = true;
              }
            }

            if (!isMatch) {
              // console.log(`Skipping order ${localOrder.local_order_id}. Assigned: ${orderDriverId}, Current: ${currentDriverId}`);
              return;
            } else {
              console.log(`Matched order ${localOrder.local_order_id} for driver ${currentDriverId}`);
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
    } catch (err) {
      console.error('Error fetching local orders:', err);
      // Do NOT clear localOrders if bulk fetch fails, retain what we got from data loop
    } finally {
      setLoading(false);
    }
  }, [driverId, token]);

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
