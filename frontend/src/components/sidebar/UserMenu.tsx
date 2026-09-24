import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
} from "lucide-react";

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
  variant = "mobile",
  onLogout,
}) => {
  const [open, setOpen] = useState(false);

  const isDesktop = variant === "desktop";

  useEffect(() => {
    const handleOutsideClick = () => {
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  const firstName = user?.first_name || "?";

  const toggleMenu = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div
      className="relative"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={toggleMenu}
        className="group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 ring-2 ring-white shadow-sm transition-transform duration-200 group-hover:scale-105">
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

        {isDesktop ? (
          <ChevronUp
            size={16}
            className="shrink-0 text-slate-400 transition-colors group-hover:text-slate-600"
          />
        ) : (
          <ChevronDown
            size={16}
            className="shrink-0 text-slate-400 transition-colors group-hover:text-slate-600"
          />
        )}
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-800 truncate">{user?.first_name} {user?.last_name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email || "Authenticated"}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 focus:outline-none"
          >
            <span>Sign Out</span>
            <LogOut size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;