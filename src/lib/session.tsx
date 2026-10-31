import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, ApiError, loadToken, onExpired, saveToken } from "./api";
import type { User, Workspace } from "./types";
import { canAccess, homeWorkspace } from "./workflows";
export { canAccess, homeWorkspace } from "./workflows";

type Session = {
  user: User | null;
  loading: boolean;
  startupError: string;
  refresh: () => Promise<void>;
  authenticate: (path: string, body: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  clear: () => Promise<void>;
  workspace: Workspace;
  setWorkspace: (value: Workspace) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState("");
  const [workspace, setWorkspace] = useState<Workspace>("finder");
  const [dark, setDark] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const clear = useCallback(async () => {
    await saveToken(null);
    setUser(null);
    setHasToken(false);
    setStartupError("");
  }, []);
  const refresh = useCallback(async () => {
    const { data } = await api<{ data: User }>("/user");
    setUser(data);
    setWorkspace((previous) =>
      canAccess(data, previous) ? previous : homeWorkspace(data),
    );
  }, []);
  const boot = useCallback(async () => {
    try {
      const saved = await loadToken();
      setLoading(true);
      setStartupError("");
      setHasToken(!!saved);
      if (saved) {
        const { data } = await api<{ data: User }>("/user");
        setUser(data);
        setWorkspace(homeWorkspace(data));
      }
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401))
        setStartupError(
          e instanceof Error ? e.message : "Unable to open session.",
        );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const off = onExpired(() => {
      setUser(null);
      setHasToken(false);
      setStartupError("");
    });
    // Boot synchronizes OS credential storage and a remote account, rather than deriving render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void boot();
    return off;
  }, [boot]);
  const authenticate = async (path: string, body: Record<string, unknown>) => {
    const result = await api<{ user: User; token: string }>(path, "POST", {
      ...body,
      device_name: "Room Finder mobile",
    });
    await saveToken(result.token);
    setHasToken(true);
    setUser(result.user);
    setWorkspace(homeWorkspace(result.user));
    setStartupError("");
  };
  const logout = async () => {
    await api("/auth/logout", "POST");
    await clear();
  };
  return (
    <Context.Provider
      value={{
        user,
        loading,
        startupError,
        refresh: startupError || (!user && !hasToken) ? boot : refresh,
        authenticate,
        logout,
        clear,
        workspace,
        setWorkspace,
        dark,
        setDark,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing session provider");
  return value;
}
