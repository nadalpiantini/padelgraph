import { create } from 'zustand';

interface AppState {
  userId: string | null;
  setUserId: (id: string | null) => void;
  brand: string;
  setBrand: (color: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),
  brand: 'hsl(220 100% 50%)', // Default brand color (blue)
  setBrand: (color) => set({ brand: color }),
}));
