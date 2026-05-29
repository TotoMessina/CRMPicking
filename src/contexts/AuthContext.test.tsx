import { vi } from 'vitest';

// 1. MOCKS hoisted at the very top of the file
vi.mock('../lib/offlineManager', () => ({
  flushOutbox: vi.fn(),
  clearAllOfflineData: vi.fn(),
}));

vi.mock('../config/tenant', () => ({
  TenantStore: {
    setConfig: vi.fn(),
  },
  injectTenantTheme: vi.fn(),
}));

vi.mock('../lib/logger', () => {
  const mockLogger = {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    setUserEmail: vi.fn(),
  };
  return {
    logger: mockLogger,
    default: mockLogger,
  };
});

vi.mock('../lib/supabase', () => {
  const mockAuth = {
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'mock-user-id', email: 'test@example.com' } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  };

  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { role: 'admin', nombre: 'Test User', avatar_url: null }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { role: 'admin', nombre: 'Test User', avatar_url: null }, error: null }),
    order: vi.fn().mockReturnThis(),
  });

  return {
    supabase: {
      auth: mockAuth,
      from: mockFrom,
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
        unsubscribe: vi.fn(),
      }),
    },
  };
});

// 2. IMPORTS
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const TestConsumer = () => {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.email : 'null'}</span>
      <span data-testid="role">{auth.role || 'null'}</span>
      <span data-testid="userName">{auth.userName || 'null'}</span>
      <button onClick={() => auth.signIn('test@example.com', 'password')} data-testid="btn-login">Login</button>
      <button onClick={() => auth.signOut()} data-testid="btn-logout">Logout</button>
    </div>
  );
};

describe('AuthContext & useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
      writable: true
    });
  });

  it('debe renderizar los componentes hijos sin fallas', async () => {
    render(
      <AuthProvider>
        <div data-testid="child">Hijo</div>
      </AuthProvider>
    );

    const child = await screen.findByTestId('child');
    expect(child).toBeInTheDocument();
  });

  it('debe resolver el flujo offline de cache de localStorage correctamente', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
      writable: true
    });

    localStorage.setItem('pu_empresa_activa', JSON.stringify({ id: 'emp-123', nombre: 'Empresa Test' }));
    localStorage.setItem('pu_user_cache', JSON.stringify({ role: 'vendedor', userName: 'Usuario Cachado', avatarUrl: null }));

    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'user-123', email: 'test@example.com' } as any,
          access_token: 'token',
          refresh_token: 'token',
          expires_in: 3600,
          token_type: 'bearer'
        }
      },
      error: null
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Validamos que se carguen los datos offline del cache
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
      expect(screen.getByTestId('role')).toHaveTextContent('vendedor');
      expect(screen.getByTestId('userName')).toHaveTextContent('Usuario Cachado');
    });
  });

  it('debe limpiar los tokens y cache locales al cerrar sesión', async () => {
    localStorage.setItem('pu_empresa_activa', JSON.stringify({ id: 'emp-123', nombre: 'Empresa Test' }));
    
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    const btnLogout = await screen.findByTestId('btn-logout');
    await act(async () => {
      btnLogout.click();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(localStorage.getItem('pu_empresa_activa')).toBeNull();
  });
});
