import type { UserDto } from "@pmgt/shared";
import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserDto | null;
  setSession: (s: {
    accessToken: string;
    refreshToken: string;
    user: UserDto;
  }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clear: () => void;
}

const STORAGE_KEY = "pmgt.auth";

function load(): Pick<AuthState, "accessToken" | "refreshToken" | "user"> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { accessToken: null, refreshToken: null, user: null };
}

function persist(state: AuthState): void {
  const { accessToken, refreshToken, user } = state;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ accessToken, refreshToken, user }),
  );
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...load(),
  setSession: (s) => {
    set({
      accessToken: s.accessToken,
      refreshToken: s.refreshToken,
      user: s.user,
    });
    persist(get());
  },
  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });
    persist(get());
  },
  clear: () => {
    set({ accessToken: null, refreshToken: null, user: null });
    localStorage.removeItem(STORAGE_KEY);
  },
}));
