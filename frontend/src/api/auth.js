// Authentication API calls kept separate from React components.
import client from "./client";

export const loginRequest = (credentials) => client.post("/auth/login", credentials);
export const currentUserRequest = () => client.get("/auth/me");
export const logoutRequest = () => client.post("/auth/logout");
