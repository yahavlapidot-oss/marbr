import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  businessId: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setBusinessId: (id: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      businessId: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setBusinessId: (businessId) => set({ businessId }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, businessId: null }),
    }),
    { name: 'mrbar-auth' },
  ),
);
