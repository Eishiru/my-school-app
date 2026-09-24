import React from "react";
import { Menu } from "lucide-react";

import SidebarLogo from "./SidebarLogo";
import UserMenu from "./UserMenu";

interface User {
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
}

interface MobileHeaderProps {
  user: User | null;
  onOpen: () => void;
  onLogout: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  user,
  onOpen,
  onLogout,
}) => {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4">
      <button
        type="button"
        onClick={onOpen}
        className="rounded-lg p-2 hover:bg-gray-100"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <SidebarLogo />

      <UserMenu
        user={user}
        variant="mobile"
        onLogout={onLogout}
      />
    </header>
  );
};

export default MobileHeader;