import React from "react";
import { NavLink } from "react-router-dom";

interface NavigationItem {
  name: string;
  to: string;
  Icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
  }>;
}

interface SidebarNavigationProps {
  links: NavigationItem[];
  onNavigate?: () => void;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({
  links,
  onNavigate,
}) => {
  return (
    <ul className="space-y-1">
      {links.map(({ name, to, Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={name === "Dashboard"}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                isActive
                  ? "bg-indigo-50/80 text-indigo-700 font-semibold"
                  : "text-slate-600 font-medium hover:bg-slate-100/70 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-3 h-5 w-1 rounded-r-full bg-indigo-600" />
                )}

                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                  strokeWidth={2}
                />

                <span className="truncate">{name}</span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
};

export default SidebarNavigation;