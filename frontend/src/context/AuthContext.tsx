import React, { createContext, useContext, useState, useEffect } from "react";

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.role) {
          parsedUser.role = parsedUser.role.toUpperCase();
          setUser(parsedUser);
        }
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    const normalizedUser = { ...userData, role: userData.role.toUpperCase() as Role };
    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};