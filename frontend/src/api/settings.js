// Admin Settings API calls (Phase 8).
import client from "./client";

export const getSettingsRequest = () => client.get("/settings");
export const updateSettingsRequest = (updates) => client.put("/settings", updates);
