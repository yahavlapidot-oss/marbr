import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: string;
}

interface Business {
  id: string;
  name: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  businessId: string | null;
  business: Business | null;
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setBusinessId: (id: string) => void;
  setBusiness: (business: Business) => void;
  setHasHydrated: (val: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      businessId: null,
      business: null,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      setBusinessId: (businessId) => set({ businessId }),
      setBusiness: (business) => set({ business, businessId: business.id }),
      setHasHydrated: (val) => set({ _hasHydrated: val }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, businessId: null, business: null }),
    }),
    {
      name: 'mrbar-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
