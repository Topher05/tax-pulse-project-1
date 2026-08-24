import "vitest-axe/extend-expect";

import { vi } from "vitest";

window.scrollTo = vi.fn();

const getComputedStyle = window.getComputedStyle;
window.getComputedStyle = ((element: Element) =>
  getComputedStyle.call(window, element)) as typeof window.getComputedStyle;

Object.defineProperty(window.HTMLCanvasElement.prototype, "getContext", {
  configurable: true,
  value: vi.fn(() => ({
    clearRect: vi.fn(),
    fillText: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
    measureText: vi.fn(() => ({ width: 0 })),
    putImageData: vi.fn(),
  })),
});
