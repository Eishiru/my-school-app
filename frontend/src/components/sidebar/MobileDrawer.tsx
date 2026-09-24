import React from "react";
import { X } from "lucide-react";

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
}

const MobileDrawer: React.FC<MobileDrawerProps> = ({
  links,
  onClose,
}) => {
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-6">
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

        <nav className="p-2">
          <SidebarNavigation
            links={links}
            onNavigate={onClose}
          />
        </nav>
      </aside>
    </>
  );
};

export default MobileDrawer;