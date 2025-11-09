"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  /**
   * Optional link rendered in the footer with default styling.
   * Useful for common navigation such as switching between login/register.
   */
  footerLink?: {
    href: string;
    label: string;
  };
};

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
  footerLink,
}: AuthCardProps) {
  return (
    <Card className="w-full max-w-md rounded-2xl border border-slate-800/70 bg-slate-900/70 shadow-lg shadow-emerald-500/10 backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl font-semibold text-white">
          {title}
        </CardTitle>
        <CardDescription className="text-sm text-slate-300">
          {subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
      {(footer || footerLink) && (
        <CardFooter className="flex flex-col gap-4 text-sm text-slate-400">
          <Separator className="bg-slate-800/60" />
          {footer}
          {footerLink && (
            <Link
              href={footerLink.href}
              className="font-medium text-emerald-300 transition hover:text-emerald-200"
            >
              {footerLink.label}
            </Link>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
