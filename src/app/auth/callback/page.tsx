"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        router.push("/login");
        return;
      }

      if (data?.session?.user) {
        // Verificar se o usuário já tem uma organização através de usuarios_organizacoes
        const { data: subs, error: subsError } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", data.session.user.id)
          .eq("status", "active");

        if (subsError) {
          router.push("/");
          return;
        }

        if (subs && subs.length > 0) {
          router.push("/agent-chat");
        } else {
          router.push("/plans");
        }
      } else {
        router.push("/login");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2">Carregando...</p>
      </div>
    </div>
  );
}
