import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SideBar from "./sidebar/Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(min-width: 1024px)");

    const handler = (ev: MediaQueryListEvent) => {
      setIsDesktop(ev.matches);

      if (ev.matches) {
        setSidebarOpen(false);
      }
    };

    mql.addEventListener("change", handler);

    return () => {
      mql.removeEventListener("change", handler);
    };
  }, []);

  // close drawer after navigation on mobile
  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isDesktop]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      <SideBar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpen={() => setSidebarOpen(true)}
        isDesktop={isDesktop}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          onOpenMobileSidebar={() => setSidebarOpen(true)}
          isDesktop={isDesktop}
        />

        <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}