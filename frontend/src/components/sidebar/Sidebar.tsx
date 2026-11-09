import React from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { navigation } from "../../data/navigation";

import SidebarLogo from "./SidebarLogo";
import SidebarNavigation from "./SidebarNavigation";
import UserMenu from "./UserMenu";
import MobileHeader from "./MobileHeader";
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
  onOpen = () => {},
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const activeLinks = user?.role
    ? navigation[user.role] ?? []
    : [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      {/* Desktop Sidebar */}
      {isDesktop && (
        <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/80 bg-white lg:flex shadow-xs">
          {/* Logo */}
          <div className="flex h-16 shrink-0 items-center border-b border-slate-100 px-5">
            <SidebarLogo />
          </div>

          {/* Navigation */}
          <div className="flex min-h-0 flex-1 flex-col px-3">
            <div className="px-3 pt-4 pb-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Menu
              </p>
            </div>

            <nav className="flex-1 overflow-y-auto pb-4">
              <SidebarNavigation links={activeLinks} />
            </nav>
          </div>

          {/* User */}
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 p-3">
            <UserMenu
              user={user}
              variant="desktop"
              onLogout={handleLogout}
            />
          </div>
        </aside>
      )}

      {/* Mobile Drawer */}
      {!isDesktop && open && (
        <MobileDrawer
          links={activeLinks}
          onClose={onClose}
        />
      )}
    </>
  );
};

export default Sidebar;