import React from "react";
import { useAuth } from "../../context/AuthContext";
import { navigation } from "../../data/navigation";

import SidebarLogo from "./SidebarLogo";
import SidebarNavigation from "./SidebarNavigation";
import MobileDrawer from "./MobileDrawer";

interface SidebarProps {
  isDesktop?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isDesktop = false,
  open = false,
  onClose = () => {},
}) => {
  const { user } = useAuth();

  const activeLinks = user?.role
    ? navigation[user.role] ?? []
    : [];

  return (
    <>
      {/* Desktop Sidebar - Slim w-56 (224px) for maximized main work area */}
      {isDesktop && (
        <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex shadow-xs select-none">
          {/* Logo */}
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
              <SidebarNavigation links={activeLinks} />
            </nav>
          </div>
        </aside>
      )}

      {/* Mobile Drawer */}
      {!isDesktop && open && (
        <MobileDrawer
          links={activeLinks}
          onClose={onClose}
          onLogout={handleLogout}
        />
      )}
    </>
  );
};

export default Sidebar;
