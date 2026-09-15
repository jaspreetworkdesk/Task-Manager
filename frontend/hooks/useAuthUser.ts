"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "manager" | "employee";
};

export default function useAuthUser() {
  const router = useRouter();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!storedToken || !storedUser) {
      router.push("/login");
      setAuthLoading(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser) as AuthUser;

      setToken(storedToken);
      setUser(parsedUser);
    } catch (error) {
      console.log("Invalid user data:", error);

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      router.push("/login");
    } finally {
      setAuthLoading(false);
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return {
    user,
    token,
    authLoading,
    logout,
    isAdmin: user?.role === "admin",
    isManager: user?.role === "manager",
    canManageWork: user?.role === "admin" || user?.role === "manager",
    isEmployee: user?.role === "employee",
  };
}