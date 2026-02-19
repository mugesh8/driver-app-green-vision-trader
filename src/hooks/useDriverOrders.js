import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { get } from '../api/client';

function getDriverId(user) {
  if (!user) return null;
  const id = user.did ?? user.data?.did ?? user.id ?? user.driver_id ?? user.driverId ?? user._id;
  return id;
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
                  // Find the driver group
                  const dGroup = summary.driverAssignments.find(da => {
                    // Match by various ID fields
                    if (da.driverId && String(da.driverId) === currentDriverIdStr) return true;
                    if (da.did && String(da.did) === currentDriverIdStr) return true;
                    // Fuzzy match name/string just in case
                    const dStr = String(da.driver || '');
                    if (dStr === currentDriverIdStr || dStr.includes(currentDriverIdStr)) return true;
                    if (dStr.includes(' - ')) {
                      const extracted = dStr.split(' - ').pop();
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
                // Assuming the fetch by ID implies visibility, but we can double check 'driver_id'
                const orderDriverId = finalDriverId;
                const currentDriverId = driverId;
                const orderDriverIdStr = String(orderDriverId || '');
                const currentDriverIdStr = String(currentDriverId || '');

                // Allow if IDs match OR if user is fetching their own list via loop
                let isMatch = orderDriverIdStr === currentDriverIdStr;

                // Double check against top level if summary match failed/ambiguous
                if (!isMatch) {
                  const topLevelId = localOrder.driver_id || localOrder.driverId || localOrder.did;
                  if (String(topLevelId) === currentDriverIdStr) isMatch = true;

                  if (!isMatch && localOrder.driver) {
                    const driverStr = String(localOrder.driver);
                    if (driverStr === currentDriverIdStr || driverStr.includes(currentDriverIdStr)) {
                      isMatch = true;
                    }
                  }
                }

                if (!foundInSummary && !isMatch && orderDriverIdStr) {
                  console.log(`Local order ${localOrder.local_order_id} driver mismatch. Assigned: ${orderDriverIdStr}, Current: ${currentDriverIdStr}`);
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
                  product: firstProduct.product || '-',
                  phone: firstProduct.phone || '+91 98765 12345',
                });
              } catch (err) {
                console.error(`Error processing local order ${localOrder.local_order_id}:`, err);
              }
              continue; // Done with local order
            }

            // Parse stage1_summary_data
            if (assignmentData.stage1_summary_data) {
              let stage1Data = typeof assignmentData.stage1_summary_data === 'string'
                ? JSON.parse(assignmentData.stage1_summary_data)
                : assignmentData.stage1_summary_data;

              if (stage1Data?.driverAssignments) {
                const driverAssignment = stage1Data.driverAssignments.find(da => {
                  const idStr = String(driverId);
                  // Check did field
                  if (da.did && String(da.did) === idStr) return true;
                  // Check driverId field
                  if (da.driverId && String(da.driverId) === idStr) return true;
                  // Check driver field (name or name - id format)
                  const driverStr = String(da.driver || '');
                  if (driverStr === idStr) return true;
                  if (driverStr.includes(' - ')) {
                    const extractedId = driverStr.split(' - ').pop();
                    if (extractedId === idStr) return true;
                  }
                  return driverStr.includes(idStr);
                });

                if (driverAssignment?.assignments) {
                  driverAssignment.assignments.forEach((assignment, idx) => {
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
                      product: `${assignment.product || '-'} - ${assignment.quantity || 0} kg`,
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
                  const driverStr = String(da.driver || '');
                  if (driverStr === idStr) return true;
                  if (driverStr.includes(' - ')) {
                    const extractedId = driverStr.split(' - ').pop();
                    if (extractedId === idStr) return true;
                  }
                  return driverStr.includes(idStr);
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
              const driverStr = String(localOrder.driver);
              if (driverStr === currentDriverIdStr) {
                isMatch = true;
              } else if (driverStr.includes(' - ')) {
                const extractedId = driverStr.split(' - ').pop();
                if (extractedId === currentDriverIdStr) isMatch = true;
              } else if (driverStr.includes(currentDriverIdStr)) {
                isMatch = true;
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
              product: firstProduct.product || '-',
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
