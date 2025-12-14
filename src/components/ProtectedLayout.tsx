"use client";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "./ui/sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading, user } = useAuth();
  const router = useRouter();

  // Redirecionar apenas quando NÃO estiver autenticado E não estiver carregando
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  return (
    <>
      <AppSidebar />
      <div className="h-full w-full overflow-hidden">{children}</div>
    </>
  );
}
