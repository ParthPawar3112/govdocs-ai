// Context that restores, manages, and clears the browser's authenticated session.
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { currentUserRequest, loginRequest, logoutRequest, registerRequest } from "../api/auth";
import { TOKEN_KEY } from "../api/client";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      if (!localStorage.getItem(TOKEN_KEY)) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await currentUserRequest();
        setUser(data);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, [clearSession]);

  const login = useCallback(async (credentials) => {
    const { data } = await loginRequest(credentials);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    const userResponse = await currentUserRequest();
    setUser(userResponse.data);
  }, []);

  // Citizen sign-up: create the account, then reuse the exact same login path
  // above so there's only ever one way a session starts.
  const register = useCallback(
    async ({ full_name, username, password, confirm_password }) => {
      await registerRequest({ full_name, username, password, confirm_password });
      await login({ username, password });
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
