import { createContext, useContext, type ReactNode } from "react";

const PortalContext = createContext(false);

export function PortalProvider({ children }: { children: ReactNode }) {
  return (
    <PortalContext.Provider value={true}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalMode(): boolean {
  return useContext(PortalContext);
}

/**
 * Returns the path prefix for portal-aware links.
 * In portal mode: "/extra-credit". Otherwise: "".
 * Use: to={`${portalBase}/call-sheets`} or navigate(`${portalBase}/crew-contacts`)
 */
export function usePortalBase(): string {
  const isPortal = useContext(PortalContext);
  return isPortal ? "/extra-credit" : "";
}
