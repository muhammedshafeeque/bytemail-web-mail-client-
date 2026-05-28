import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  mobilePanel: 'list' | 'viewer';
  isSearchOpen: boolean;
  searchQuery: string;
  isOffline: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  setMobilePanel: (panel: 'list' | 'viewer') => void;
  setSearchOpen: (v: boolean) => void;
  setSearchQuery: (q: string) => void;
  setOffline: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  mobilePanel: 'list',
  isSearchOpen: false,
  searchQuery: '',
  isOffline: !navigator.onLine,

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobilePanel: (panel) => set({ mobilePanel: panel }),
  setSearchOpen: (v) => set({ isSearchOpen: v }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setOffline: (v) => set({ isOffline: v }),
}));
