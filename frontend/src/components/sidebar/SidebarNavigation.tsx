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
            title={name}
            className={({ isActive }) =>
              `group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-50/90 text-indigo-700 font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute -left-2.5 h-4 w-1 rounded-r-full bg-indigo-600" />
                )}

                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                  strokeWidth={isActive ? 2.25 : 1.75}
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
