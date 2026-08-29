// Blackout / Recovery Center API calls ("The Blackout" challenge).
// Admin-only on the backend (require_admin).
import client from "./client";

export const getRecoveryStatus = () => client.get("/recovery/status");
export const createRecoverySnapshot = () => client.post("/recovery/snapshot");
export const simulateBlackout = () => client.post("/recovery/simulate-blackout");
export const runRecovery = () => client.post("/recovery/run-recovery");
export const reconcileOperation = (opId, action) =>
  client.post("/recovery/reconcile", { op_id: opId, action });
export const resetBlackoutDemo = () => client.post("/recovery/reset");
export const getRecoveryEvents = () => client.get("/recovery/events");
