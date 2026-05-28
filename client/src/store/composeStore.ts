import { create } from 'zustand';
import { ComposeData } from '@/types/email';

export interface ComposeWindow {
  id: string;
  data: ComposeData;
  minimized: boolean;
  fullscreen: boolean;
}

interface ComposeState {
  windows: ComposeWindow[];
  openCompose: (data?: Partial<ComposeData>) => string;
  closeCompose: (id: string) => void;
  updateCompose: (id: string, data: Partial<ComposeData>) => void;
  minimizeCompose: (id: string) => void;
  toggleFullscreen: (id: string) => void;
}

const defaultData = (): ComposeData => ({
  to: [],
  cc: [],
  bcc: [],
  subject: '',
  body_html: '',
  body_text: '',
  attachments: [],
});

export const useComposeStore = create<ComposeState>((set) => ({
  windows: [],

  openCompose: (data) => {
    const id = `compose-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((state) => ({
      windows: [
        ...state.windows,
        { id, data: { ...defaultData(), ...data }, minimized: false, fullscreen: false },
      ],
    }));
    return id;
  },

  closeCompose: (id) =>
    set((state) => ({ windows: state.windows.filter((w) => w.id !== id) })),

  updateCompose: (id, data) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, data: { ...w.data, ...data } } : w
      ),
    })),

  minimizeCompose: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: !w.minimized } : w
      ),
    })),

  toggleFullscreen: (id) =>
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, fullscreen: !w.fullscreen } : w
      ),
    })),
}));
