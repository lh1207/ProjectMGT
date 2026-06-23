import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLogin, useRegister } from "../features/auth/api";
import { Button, Card, ErrorNote, Input } from "../components/ui";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@pmgt.dev");
  const [password, setPassword] = useState("password123");
  const [name, setName] = useState("");

  const login = useLogin();
  const register = useRegister();
  const active = mode === "login" ? login : register;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "login") {
        await login.mutateAsync({ email, password });
      } else {
        await register.mutateAsync({ email, password, name });
      }
      navigate("/projects");
    } catch {
      /* surfaced below via mutation error */
    }
  };

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-1 text-xl font-bold text-blue-700">ProjectMGT</h1>
        <p className="mb-4 text-sm text-slate-500">
          {mode === "login" ? "Sign in to continue" : "Create your account"}
        </p>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          {mode === "register" && (
            <Input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {active.isError && (
            <ErrorNote message="Authentication failed. Check your details." />
          )}
          <Button type="submit" disabled={active.isPending}>
            {active.isPending
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>
        <button
          className="mt-4 text-sm text-blue-600 hover:underline"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login"
            ? "Need an account? Register"
            : "Have an account? Sign in"}
        </button>
      </Card>
    </div>
  );
}
