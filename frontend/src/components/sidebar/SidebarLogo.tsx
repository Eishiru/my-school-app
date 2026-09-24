import React from "react";
import { SchoolLogo } from "../SchoolLogo";

const SidebarLogo: React.FC = () => {
  return (
    <div className="flex items-center gap-3  ">
      <SchoolLogo />
    </div>
  );
};

export default SidebarLogo;