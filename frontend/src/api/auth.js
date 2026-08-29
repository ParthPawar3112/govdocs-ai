// Authentication API calls kept separate from React components.
import client from "./client";

export const loginRequest = (credentials) => client.post("/auth/login", credentials);
// Public Citizen sign-up. Returns the created user; the frontend then calls
// loginRequest with the same credentials (no separate auth path).
export const registerRequest = (payload) => client.post("/auth/register", payload);
export const currentUserRequest = () => client.get("/auth/me");
export const logoutRequest = () => client.post("/auth/logout");
export const changePasswordRequest = (payload) => client.post("/auth/change-password", payload);
