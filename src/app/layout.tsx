import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Script from "next/script";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryProvider } from "@/components/ReactQueryProvider";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NutriChat - Assistente Nutricional",
  description: "Assistente especializado em nutrição para nutricionistas",
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout({
  children,
  ...props
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextThemesProvider
          {...props}
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          attribute={"class"}
        >
          <ReactQueryProvider>
            <AuthProvider>
              <Toaster />
              {children}
            </AuthProvider>
          </ReactQueryProvider>
        </NextThemesProvider>
      </body>
    </html>
  );
}
