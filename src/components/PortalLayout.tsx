import { type ReactNode } from "react";
import { PortalProvider } from "@/contexts/PortalContext";
import { PortalNavigation } from "@/components/PortalNavigation";

export function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <PortalProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <PortalNavigation />
        <div className="flex-1 pt-[56px] md:pt-[60px]">
          {children}
        </div>
      </div>
    </PortalProvider>
  );
}
