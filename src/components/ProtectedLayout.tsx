"use client";
import { useAuth } from "@/context/AuthContext";
import { AppSidebar } from "./AppSidebar";
import { SidebarInset } from "./ui/sidebar";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading, user } = useAuth();
  const router = useRouter();

  console.log("[ProtectedLayout] Estado atual:", {
    isAuthenticated,
    authLoading,
    hasUser: !!user,
  });

  // Redirecionar apenas quando NÃO estiver autenticado E não estiver carregando
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login"); // ✅ replace em vez de push (não adiciona ao histórico)
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-600">
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // ✅ Bloqueia renderização enquanto redireciona
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </>
  );
}
