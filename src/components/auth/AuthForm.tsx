"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z
    .string({ required_error: "Informe seu email." })
    .min(1, "Informe seu email.")
    .email("Use um email válido."),
  password: z
    .string({ required_error: "Informe sua senha." })
    .min(6, "Senha deve ter pelo menos 6 caracteres."),
});

const optionalNameSchema = z
  .string()
  .trim()
  .max(120, "Nome deve ter no máximo 120 caracteres.")
  .optional()
  .refine((value) => !value || value.length >= 2, {
    message: "Informe pelo menos 2 caracteres.",
  })
  .transform((value) => (value ? value : undefined));

const registerSchema = loginSchema
  .extend({
    name: optionalNameSchema,
    confirmPassword: z
      .string({ required_error: "Confirme sua senha." })
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

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;

type BaseProps = {
  onGoogle: () => Promise<void>;
  serverError?: string | null;
  isBusy?: boolean;
};

type AuthFormProps =
  | (BaseProps & {
      mode: "login";
      onSubmit: (values: LoginFormValues) => Promise<void>;
    })
  | (BaseProps & {
      mode: "register";
      onSubmit: (values: RegisterFormValues) => Promise<void>;
    });

type FormValues = {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

const initialValues: FormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export function AuthForm(props: AuthFormProps) {
  const { mode, onSubmit, onGoogle, serverError, isBusy } = props;
  const [formError, setFormError] = useState<string | null>(serverError ?? null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    setFormError(serverError ?? null);
  }, [serverError]);

  const schema = useMemo(() => (mode === "register" ? registerSchema : loginSchema), [mode]);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema as unknown as z.Schema<FormValues>),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      setFormError(null);
      const payload =
        mode === "register"
          ? ({
              name: values.name?.trim() || undefined,
              email: values.email,
              password: values.password,
              confirmPassword: values.confirmPassword,
            } satisfies RegisterFormValues)
          : ({
              email: values.email,
              password: values.password,
            } satisfies LoginFormValues);

      await onSubmit(payload);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível processar sua solicitação.";
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
        error instanceof Error ? error.message : "Não foi possível iniciar o login com o Google.";
      setFormError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const submitting = form.formState.isSubmitting || Boolean(isBusy);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <Alert variant="destructive" className="border-red-500/40 bg-red-500/10 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {mode === "register" && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
          <p className="font-medium text-emerald-100">Privacidade em primeiro lugar</p>
          <ul className="mt-2 space-y-1 text-emerald-200/80">
            <li>• Dados criptografados e sob seu controle.</li>
            <li>• Você pode exportar ou excluir informações quando quiser.</li>
            <li>• Sem spam: usamos seu email apenas para autenticação.</li>
          </ul>
        </div>
      )}

      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-200">
            Nome (opcional)
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="name"
              type="text"
              placeholder="Como devemos te chamar?"
              autoComplete="name"
              {...form.register("name")}
              aria-invalid={Boolean(form.formState.errors.name)}
              className="h-11 bg-slate-950/40 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30"
              disabled={submitting}
            />
          </div>
          {form.formState.errors.name && (
            <p className="text-sm text-red-300">{form.formState.errors.name.message}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-200">
          Email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            {...form.register("email")}
            aria-invalid={Boolean(form.formState.errors.email)}
            className="h-11 bg-slate-950/40 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30"
            disabled={submitting}
          />
        </div>
        {form.formState.errors.email && (
          <p className="text-sm text-red-300">{form.formState.errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-200">
          Senha
        </Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="password"
            type="password"
            placeholder={mode === "register" ? "Crie uma senha segura" : "Sua senha"}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            {...form.register("password")}
            aria-invalid={Boolean(form.formState.errors.password)}
            className="h-11 bg-slate-950/40 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30"
            disabled={submitting}
          />
        </div>
        {form.formState.errors.password && (
          <p className="text-sm text-red-300">{form.formState.errors.password.message}</p>
        )}
      </div>

      {mode === "register" && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-200">
            Confirmar senha
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repita a senha"
              autoComplete="new-password"
              {...form.register("confirmPassword")}
              aria-invalid={Boolean(form.formState.errors.confirmPassword)}
              className="h-11 bg-slate-950/40 pl-9 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30"
              disabled={submitting}
            />
          </div>
          {form.formState.errors.confirmPassword && (
            <p className="text-sm text-red-300">
              {form.formState.errors.confirmPassword.message}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Button
          type="submit"
          className="flex h-11 w-full items-center justify-center gap-2 bg-emerald-500/90 text-slate-900 shadow-sm shadow-emerald-400/30 transition hover:bg-emerald-400 hover:text-slate-950"
          disabled={submitting}
        >
          {(form.formState.isSubmitting || isBusy) && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="flex h-11 w-full items-center justify-center gap-2 border-slate-700 bg-slate-900/40 text-slate-100 transition hover:border-emerald-500/60 hover:bg-slate-900/60"
          onClick={handleGoogle}
          disabled={submitting || isGoogleLoading}
        >
          {isGoogleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="h-4 w-4" />
          )}
          Continuar com Google
        </Button>
      </div>
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 24 24" focusable="false">
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
