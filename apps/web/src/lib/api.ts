import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "./auth-store";

// Single axios instance. Attaches the access token, and on a 401 transparently
// refreshes once before retrying the original request.
export const http = axios.create({
  baseURL: "/api/v1",
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) return null;
  try {
    const res = await axios.post("/api/v1/auth/refresh", { refreshToken });
    setSession(res.data);
    return res.data.accessToken as string;
  } catch {
    clear();
    return null;
  }
}

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };
    if (
      error.response?.status === 401 &&
      original &&
      !original._retried &&
      !original.url?.includes("/auth/")
    ) {
      original._retried = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers.set("Authorization", `Bearer ${newToken}`);
        return http(original);
      }
    }
    return Promise.reject(error);
  },
);
