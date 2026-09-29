import React from "react";
import { LogOut } from "lucide-react";

interface User {
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
}

interface UserMenuProps {
  user: User | null;
  variant?: "desktop" | "mobile";
  onLogout: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({
  user,
  onLogout,
}) => {
  const firstName = user?.first_name || "?";

  return (
    <div className="flex w-full items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 ring-2 ring-white shadow-sm">
          {firstName.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-slate-800">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="truncate text-xs text-slate-500">
            {user?.role}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onLogout}
        title="Sign Out"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-100 active:bg-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
      >
        <LogOut size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default UserMenu;