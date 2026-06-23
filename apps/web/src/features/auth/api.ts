import type { AuthTokensDto } from "@pmgt/shared";
import { useMutation } from "@tanstack/react-query";
import { http } from "../../lib/api";
import { useAuthStore } from "../../lib/auth-store";

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: { email: string; password: string }) => {
      const res = await http.post<AuthTokensDto>("/auth/login", input);
      return res.data;
    },
    onSuccess: (data) => setSession(data),
  });
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (input: {
      email: string;
      password: string;
      name: string;
    }) => {
      const res = await http.post<AuthTokensDto>("/auth/register", input);
      return res.data;
    },
    onSuccess: (data) => setSession(data),
  });
}
