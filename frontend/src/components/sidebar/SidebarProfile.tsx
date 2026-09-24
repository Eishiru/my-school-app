import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, LogOut } from "lucide-react";

interface User {
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
}

interface SidebarProfileProps {
  user: User | null;
  isDesktop?: boolean;
  onLogout: () => void;
}

const SidebarProfile: React.FC<SidebarProfileProps> = ({
  user,
  isDesktop = false,
  onLogout,
}) => {
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = () => {
      setProfileOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const firstName = user?.first_name || "?";

  return (
    <div
      className="relative"
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setProfileOpen((prev) => !prev)}
        className="group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 transition-all duration-200 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600 ring-2 ring-white shadow-sm transition-transform duration-200 group-hover:scale-105">
          {firstName.charAt(0).toUpperCase()}
        </div>

        <div
          className={`min-w-0 flex-1 text-left ${
            isDesktop ? "min-w-35" : ""
          }`}
        >
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

      {profileOpen && (
        <div
          className={`fixed z-999 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-2xl ${
            isDesktop
              ? "bottom-20 left-2 w-60"
              : "right-4 top-16 w-40"
          }`}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50 focus:bg-red-50 focus:outline-none active:bg-red-100"
          >
            <span>Logout</span>

            <LogOut
              size={17}
              strokeWidth={2}
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default SidebarProfile;