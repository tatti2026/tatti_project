// Central Frontend State Store & Persistence
export interface AppStoreState {
  theme: 'dark' | 'light';
  sidebarOpen: boolean;
}

const STORE_KEY = 'tatti_app_state_v1';

export function getAppStore(): AppStoreState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return {
    theme: 'dark',
    sidebarOpen: true,
  };
}

export function saveAppStore(state: Partial<AppStoreState>) {
  try {
    const current = getAppStore();
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...current, ...state }));
  } catch {
    // ignore
  }
}
