"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log("Dados da sessão:", data);

      if (error) {
        console.error("Erro ao recuperar sessão:", error);
        router.push("/login");
        return;
      }

      if (data?.session?.user) {
        console.log("Usuário autenticado:", data.session.user);

        // Verificar se o usuário já tem uma organização através de usuarios_organizacoes
        const { data: subs, error: subsError } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", data.session.user.id)
          .eq("status", "active");

        if (subsError) {
          console.error("Erro ao verificar subs:", subsError);
          router.push("/");
          return;
        }

        if (subs && subs.length > 0) {
          console.log(
            "Usuário com subscrição ativa, redirecionando para agent-chat",
          );
          router.push("/agent-chat");
        } else {
          console.log(
            "Usuário sem subscrição ativa, redirecionando para planos",
          );
          router.push("/plans");
        }
      } else {
        console.log("Usuário não autenticado, redirecionando para login");
        router.push("/login");
      }
    };

    console.log("Iniciando processo de autenticação...");
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
