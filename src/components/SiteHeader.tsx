'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Crown, Menu, X, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { SubscriptionStatus } from './SubscriptionStatus';

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, logout } = useChat();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">NC</span>
            </div>
            <span className="font-bold text-xl">NutriChat</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Início
            </Link>
            {isAuthenticated && (
              <Link 
                href="/chat" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Chat
              </Link>
            )}
            <Link 
              href="/plans" 
              className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1"
            >
              <Crown className="h-4 w-4" />
              Planos
            </Link>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <SubscriptionStatus />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center gap-1"
                >
                  <LogOut className="h-3 w-3" />
                  Sair
                </Button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                Login
              </Link>
            )}
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex">
            <Button asChild>
              <Link href="/plans">
                Assinar Agora
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4">
            <nav className="flex flex-col space-y-4">
              <Link 
                href="/"
                className="text-sm font-medium hover:text-primary transition-colors px-2 py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                Início
              </Link>
              <Link 
                href="/chat"
                className="text-sm font-medium hover:text-primary transition-colors px-2 py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                Chat
              </Link>
              <Link 
                href="/plans"
                className="text-sm font-medium hover:text-primary transition-colors px-2 py-1 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Crown className="h-4 w-4" />
                Planos
              </Link>
              <Link 
                href="/login"
                className="text-sm font-medium hover:text-primary transition-colors px-2 py-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
              <div className="pt-2">
                <Button asChild className="w-full">
                  <Link href="/plans" onClick={() => setMobileMenuOpen(false)}>
                    Assinar Agora
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}