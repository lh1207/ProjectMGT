import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the shared axios instance so the hook resolves against a fake API.
vi.mock("../../lib/api", () => ({
  http: { get: vi.fn() },
}));

import { http } from "../../lib/api";
import { useProjects } from "./api";

function wrapper({ children }: PropsWithChildren) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches and returns the project list", async () => {
    (http.get as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [
        {
          id: "p1",
          key: "PMGT",
          name: "Platform",
          description: null,
          createdAt: new Date().toISOString(),
        },
      ],
    });

    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.key).toBe("PMGT");
    expect(http.get).toHaveBeenCalledWith("/projects");
  });
});
