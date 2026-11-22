import React from "react";
import { LogOut } from "lucide-react";

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
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Drawer — identical layout to the desktop sidebar */}
      <aside className="fixed top-0 left-0 z-50 flex h-[100dvh] w-56 shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-2xl select-none">
        {/* Header / Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-4">
          <SidebarLogo />
        </div>

        {/* Navigation */}
        <div className="flex min-h-0 flex-1 flex-col px-2.5 py-3">
          <div className="px-2.5 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Menu
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto space-y-0.5">
            <SidebarNavigation links={links} onNavigate={onClose} />
          </nav>
        </div>
      </aside>
    </>
  );
};

export default MobileDrawer;
