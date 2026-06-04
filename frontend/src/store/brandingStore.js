import { create } from 'zustand';

const DEFAULTS = {
  primaryColor:    '#24483E',
  secondaryColor:  '#FFF1AA',
  logoUrl:         null,       // base64 or URL
  logoSize:        58,         // px height in sidebar header
  companyName:     'MainFrame',
  poweredByVisible: true,
  faviconUrl:      null,       // base64 or URL — injected into <link rel="icon">
};

const load = () => {
  try {
    const saved = localStorage.getItem('branding');
    if (!saved) return { ...DEFAULTS };
    const parsed = JSON.parse(saved);
    // If logoSize was never saved (old entry), force the new default
    if (!parsed.logoSize) parsed.logoSize = DEFAULTS.logoSize;
    return { ...DEFAULTS, ...parsed };
  } catch { return { ...DEFAULTS }; }
};

const persist = (state) => {
  localStorage.setItem('branding', JSON.stringify({
    primaryColor:    state.primaryColor,
    secondaryColor:  state.secondaryColor,
    logoUrl:         state.logoUrl,
    logoSize:        state.logoSize,
    companyName:     state.companyName,
    poweredByVisible: state.poweredByVisible,
    faviconUrl:      state.faviconUrl,
  }));
};

export const useBrandingStore = create((set, get) => ({
  ...load(),

  update: (patch) => {
    const next = { ...get(), ...patch };
    persist(next);
    set(patch);
  },

  reset: () => {
    localStorage.removeItem('branding');
    set({ ...DEFAULTS });
  },
}));
