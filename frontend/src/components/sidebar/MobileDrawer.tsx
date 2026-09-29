import React from "react";
import { X } from "lucide-react";

import SidebarLogo from "./SidebarLogo";
import SidebarNavigation from "./SidebarNavigation";
import UserMenu from "./UserMenu";

interface NavigationItem {
  name: string;
  to: string;
  Icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
}

interface User {
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
}

interface MobileDrawerProps {
  links: NavigationItem[];
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  links,
  onClose,
  user,
  onLogout,
}) => {
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-72 h-full bg-white shadow-2xl flex flex-col">
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
        
        {/* User / Logout */}
        <div className="shrink-0 border-t-2 border-slate-200 bg-slate-50 p-4 pb-safe">
          <UserMenu
            user={user}
            variant="mobile"
            onLogout={onLogout}
          />
        </div>
      </aside>
    </>
  );
};

export default MobileDrawer;