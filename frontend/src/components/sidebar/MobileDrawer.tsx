import React from "react";
import { X, LogOut } from "lucide-react";

import SidebarLogo from "./SidebarLogo";
import SidebarNavigation from "./SidebarNavigation";

interface NavigationItem {
  name: string;
  to: string;
  Icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
}

interface MobileDrawerProps {
  links: NavigationItem[];
  onClose: () => void;
  onLogout: () => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  links,
  onClose,
  onLogout,
}) => {
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      <aside className="fixed top-0 left-0 z-50 w-72 h-[100dvh] bg-white shadow-2xl flex flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 px-6">
          <SidebarLogo />

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-2">
          <SidebarNavigation
            links={links}
            onNavigate={onClose}
          />
        </nav>
        
        {/* Simple Logout Button */}
        <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50 p-4 pb-safe">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 active:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
          >
            <LogOut size={18} strokeWidth={2.5} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default MobileDrawer;