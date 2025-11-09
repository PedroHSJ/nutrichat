import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HomeSelectorPage() {
  return (
    <>
      <SiteHeader />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="bg-white rounded-xl shadow-lg p-10 flex flex-col gap-8 items-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Escolha sua experiência
          </h1>
          <div className="flex flex-col sm:flex-row gap-6">
            <Link href="/chat">
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
              >
                Chat Clássico
              </Button>
            </Link>
            <Link href="/agent-chat">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                Chat com Agente Inteligente
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
