import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { MobileDynamicIsland } from "./MobileDynamicIsland";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-24">{children}</main>
      <MobileDynamicIsland />
      <SiteFooter />
    </div>
  );
}

