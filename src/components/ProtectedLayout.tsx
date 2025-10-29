"use client";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "./ui/sidebar";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) return null;
  if (!isAuthenticated) return null;
  return (
    <>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </>
  );
}
