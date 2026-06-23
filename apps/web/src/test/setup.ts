import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia; some libs probe it.
if (!window.matchMedia) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}
