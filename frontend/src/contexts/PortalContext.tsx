import { createContext, useContext, type ReactNode } from 'react';

export type PortalMode = 'admin' | 'counsellor';

const PortalContext = createContext<PortalMode>('admin');

export function PortalProvider({
  mode,
  children,
}: {
  mode: PortalMode;
  children: ReactNode;
}) {
  return (
    <PortalContext.Provider value={mode}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal(): PortalMode {
  return useContext(PortalContext);
}
