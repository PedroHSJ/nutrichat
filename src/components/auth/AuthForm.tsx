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
  email: z.email({ error: "Informe seu email." }).min(1, "Informe seu email."),
  password: z
    .string({ error: "Informe sua senha." })
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

// FormValues precisa ser compatível com ambos os modos
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
  const [formError, setFormError] = useState<string | null>(
    serverError ?? null
  );
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    setFormError(serverError ?? null);
  }, [serverError]);

  // Escolhe schema e tipos conforme o modo
  const schema = useMemo(
    () => (mode === "register" ? registerSchema : loginSchema),
    [mode]
  );
  type FormType = RegisterFormValues | LoginFormValues;
  const defaultValues = useMemo(() => {
    if (mode === "register") {
      return initialValues as RegisterFormValues;
    }
    return initialValues as LoginFormValues;
  }, [mode]);

  const form = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur",
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      setFormError(null);
      if (mode === "register") {
        const payload: RegisterFormValues = {
          name: (values as RegisterFormValues).name?.trim() || undefined,
          email: values.email,
          password: values.password,
          confirmPassword: (values as RegisterFormValues).confirmPassword ?? "",
        };
        await onSubmit(payload);
      } else {
        const payload: LoginFormValues = {
          email: values.email,
          password: values.password,
        };
        await onSubmit(payload);
      }
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

  // Renderiza campos conforme o modo
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
    </form>
  );
}

function GoogleIcon({ className }: { className?: string }) {
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
