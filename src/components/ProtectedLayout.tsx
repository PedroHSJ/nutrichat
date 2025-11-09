"use client";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "./ui/sidebar";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading, user } = useAuth();
  const router = useRouter();
  if (authLoading) {
    return null;
  }

  if (!isAuthenticated) {
    console.log("Usuário não autenticado, redirecionando para login");
    return null;
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </>
  );
}
