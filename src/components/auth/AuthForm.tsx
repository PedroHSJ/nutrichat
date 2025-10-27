"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

// ================= LOGIN FORM =================
import { z } from "zod";

const loginSchema = z.object({
  email: z.email({ error: "Informe seu email." }).min(1, "Informe seu email."),
  password: z
    .string({ error: "Informe sua senha." })
    .min(6, "Senha deve ter pelo menos 6 caracteres."),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  onSubmit,
  onGoogle,
  serverError,
  isBusy,
}: {
  onSubmit: (values: LoginFormValues) => Promise<void>;
  onGoogle: () => Promise<void>;
  serverError?: string | null;
  isBusy?: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(
    serverError ?? null
  );
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    setFormError(serverError ?? null);
  }, [serverError]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      setFormError(null);
      await onSubmit(values);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível processar sua solicitação.";
      setFormError(message);
      form.setError("root", { message });
    }
  });

  const handleGoogle = async () => {
    try {
      setFormError(null);
      setIsGoogleLoading(true);
      await onGoogle();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o login com o Google.";
      setFormError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const submitting = form.formState.isSubmitting || Boolean(isBusy);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register("email")}
          disabled={submitting}
          className={`${
            form.formState.errors.email
              ? "border-rose-500"
              : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {form.formState.errors.email && (
          <span className="text-xs text-rose-500">
            {form.formState.errors.email.message}
          </span>
        )}
      </div>

      {/* Senha */}
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
          disabled={submitting}
          className={`${
            form.formState.errors.password
              ? "border-rose-500"
              : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {form.formState.errors.password && (
          <span className="text-xs text-rose-500">
            {form.formState.errors.password.message}
          </span>
        )}
      </div>

      {/* Erro geral */}
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Botão de submit */}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando...
          </span>
        ) : (
          "Entrar"
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full mt-2 flex items-center justify-center gap-2"
        onClick={handleGoogle}
        disabled={isGoogleLoading || submitting}
      >
        <GoogleIcon className="h-6 w-6" />
        {isGoogleLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando com Google...
          </span>
        ) : (
          "Entrar com Google"
        )}
      </Button>
    </form>
  );
}

// GoogleIcon para ambos os componentes
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      viewBox="0 0 24 24"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.42-.22-2.04H12v3.71h6.53c-.13 1.06-.84 2.66-2.42 3.74l-.02.15 3.52 2.73.24.02c2.21-2.04 3.49-5.05 3.49-8.31Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.79-2.93c-1.02.71-2.39 1.2-4.16 1.2-3.19 0-5.9-2.03-6.86-4.84l-.14.01-3.71 2.84-.05.13C2.24 21.53 6.73 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.14 14.52a7.2 7.2 0 0 1-.38-2.27c0-.79.14-1.55.36-2.27l-.01-.15-3.75-2.89-.12.06A11.87 11.87 0 0 0 0 12.25c0 1.91.46 3.72 1.24 5.25l3.9-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.73c2.25 0 3.77.97 4.63 1.78l3.38-3.29C17.94 1.13 15.24 0 12 0 6.73 0 2.24 2.47 1.24 7l3.88 2.98C5.12 7.16 7.83 4.73 12 4.73Z"
      />
    </svg>
  );
}

// ================= REGISTER FORM =================
const optionalNameSchema = z
  .string()
  .trim()
  .max(120, "Nome deve ter no máximo 120 caracteres.")
  .optional()
  .refine((value) => !value || value.length >= 2, {
    message: "Informe pelo menos 2 caracteres.",
  })
  .transform((value) => (value ? value : undefined));

const registerSchema = z
  .object({
    name: optionalNameSchema.optional(),
    email: z
      .string()
      .email({ error: "Informe seu email." })
      .min(1, "Informe seu email."),
    password: z
      .string({ error: "Informe sua senha." })
      .min(6, "Senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z
      .string({ error: "Confirme sua senha." })
      .min(6, "Confirme sua senha."),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "As senhas precisam ser idênticas.",
      });
    }
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm({
  onSubmit,
  onGoogle,
  serverError,
  isBusy,
}: {
  onSubmit: (values: RegisterFormValues) => Promise<void>;
  onGoogle: () => Promise<void>;
  serverError?: string | null;
  isBusy?: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(
    serverError ?? null
  );
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    setFormError(serverError ?? null);
  }, [serverError]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const handleSubmit = form.handleSubmit(async (values: RegisterFormValues) => {
    try {
      setFormError(null);
      await onSubmit(values);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível processar sua solicitação.";
      setFormError(message);
      form.setError("root", { message });
    }
  });

  const handleGoogle = async () => {
    try {
      setFormError(null);
      setIsGoogleLoading(true);
      await onGoogle();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o login com o Google.";
      setFormError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const submitting = form.formState.isSubmitting || Boolean(isBusy);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome */}
      <div>
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          type="text"
          autoComplete="name"
          {...form.register("name")}
          disabled={submitting}
          className={`${
            form.formState.errors.name
              ? "border-rose-500"
              : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {form.formState.errors.name && (
          <span className="text-xs text-rose-500">
            {form.formState.errors.name.message}
          </span>
        )}
      </div>

      {/* Email */}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          {...form.register("email")}
          disabled={submitting}
          className={`${
            form.formState.errors.email
              ? "border-rose-500"
              : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {form.formState.errors.email && (
          <span className="text-xs text-rose-500">
            {form.formState.errors.email.message}
          </span>
        )}
      </div>

      {/* Senha */}
      <div>
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
          disabled={submitting}
          className={`${
            form.formState.errors.password
              ? "border-rose-500"
              : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {form.formState.errors.password && (
          <span className="text-xs text-rose-500">
            {form.formState.errors.password.message}
          </span>
        )}
      </div>

      {/* Confirmar Senha */}
      <div>
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...form.register("confirmPassword")}
          disabled={submitting}
          className={`${
            form.formState.errors.confirmPassword
              ? "border-rose-500"
              : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {form.formState.errors.confirmPassword && (
          <span className="text-xs text-rose-500">
            {form.formState.errors.confirmPassword.message}
          </span>
        )}
      </div>

      {/* Erro geral */}
      {formError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {/* Botão de submit */}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Criando conta...
          </span>
        ) : (
          "Criar conta"
        )}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full mt-2 flex items-center justify-center gap-2"
        onClick={handleGoogle}
        disabled={isGoogleLoading || submitting}
      >
        <GoogleIcon className="h-6 w-6" />
        {isGoogleLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Criando conta com Google...
          </span>
        ) : (
          "Criar conta com Google"
        )}
      </Button>
    </form>
  );
}
