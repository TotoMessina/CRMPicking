import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Leaflet
vi.mock('leaflet', () => {
  const LMock = {
    map: vi.fn(() => ({
      setView: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      off: vi.fn().mockReturnThis(),
      remove: vi.fn().mockReturnThis(),
      getBounds: vi.fn(() => ({
        contains: vi.fn().mockReturnValue(true),
      })),
      addLayer: vi.fn().mockReturnThis(),
      removeLayer: vi.fn().mockReturnThis(),
      addControl: vi.fn().mockReturnThis(),
      removeControl: vi.fn().mockReturnThis(),
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
    })),
    layerGroup: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      addLayer: vi.fn().mockReturnThis(),
      removeLayer: vi.fn().mockReturnThis(),
      clearLayers: vi.fn().mockReturnThis(),
      eachLayer: vi.fn().mockReturnThis(),
    })),
    polygon: vi.fn(() => ({
      addTo: vi.fn().mockReturnThis(),
      zoneId: 1,
      setStyle: vi.fn().mockReturnThis(),
      closePopup: vi.fn().mockReturnThis(),
    })),
    latLng: vi.fn((lat, lng) => ({ lat, lng })),
    Icon: {
      Default: {
        prototype: {
          _getIconUrl: vi.fn(),
        },
      },
    },
  };
  return {
    default: LMock,
    ...LMock,
  };
});
