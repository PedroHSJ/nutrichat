"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const emailSchema = z.object({
  email: z
    .string({ error: "Informe seu email." })
    .min(1, "Informe seu email.")
    .email("Informe um email válido."),
});

type ForgotPasswordValues = z.infer<typeof emailSchema>;

export function ForgotPasswordForm() {
  const { requestPasswordReset, authError, authLoading } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    if (authError) {
      setSuccessMessage(null);
      toast.error(authError);
    }
  }, [authError]);

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      setSuccessMessage(null);
      await requestPasswordReset(values.email);
      toast.success("Enviamos um link de recuperação para o seu email.");
      setSuccessMessage(
        "Verifique sua caixa de entrada (e a pasta de spam) para continuar o processo.",
      );
      reset();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar o email agora.";
      toast.error(message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2 text-left">
        <Label htmlFor="reset-email">Email</Label>
        <Input
          id="reset-email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          {...register("email")}
          disabled={isSubmitting || authLoading}
          className={`${
            errors.email ? "border-rose-500" : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {errors.email && (
          <span className="text-xs text-rose-500">{errors.email.message}</span>
        )}
      </div>

      {successMessage && (
        <Alert className="bg-emerald-950/40 border-emerald-500/30 text-slate-100">
          <AlertTitle>Quase lá!</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || authLoading}
      >
        {isSubmitting || authLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Enviando...
          </span>
        ) : (
          "Enviar link de redefinição"
        )}
      </Button>
    </form>
  );
}

const passwordSchema = z
  .object({
    password: z
      .string({ error: "Informe sua nova senha." })
      .min(6, "A senha deve ter pelo menos 6 caracteres."),
    confirmPassword: z
      .string({ error: "Confirme sua nova senha." })
      .min(6, "Confirme sua nova senha."),
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

type UpdatePasswordValues = z.infer<typeof passwordSchema>;

interface UpdatePasswordFormProps {
  onSuccess?: () => void;
}

export function UpdatePasswordForm({ onSuccess }: UpdatePasswordFormProps) {
  const { updatePassword, authError, authLoading } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UpdatePasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  useEffect(() => {
    if (authError) {
      setSuccessMessage(null);
      toast.error(authError);
    }
  }, [authError]);

  const onSubmit = async (values: UpdatePasswordValues) => {
    try {
      setSuccessMessage(null);
      await updatePassword(values.password);
      toast.success("Senha atualizada com sucesso!");
      setSuccessMessage(
        "Tudo certo! Você já pode fazer login com a nova senha.",
      );
      reset();
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a senha agora.";
      toast.error(message);
    }
  };

  const isBusy = useMemo(
    () => authLoading || isSubmitting,
    [authLoading, isSubmitting],
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2 text-left">
        <Label htmlFor="new-password">Nova senha</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          disabled={isBusy}
          className={`${
            errors.password ? "border-rose-500" : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {errors.password && (
          <span className="text-xs text-rose-500">
            {errors.password.message}
          </span>
        )}
      </div>

      <div className="space-y-2 text-left">
        <Label htmlFor="confirm-password">Confirme a nova senha</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
          disabled={isBusy}
          className={`${
            errors.confirmPassword ? "border-rose-500" : "border-transparent"
          } bg-slate-950/40 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring focus-visible:ring-emerald-400/30`}
        />
        {errors.confirmPassword && (
          <span className="text-xs text-rose-500">
            {errors.confirmPassword.message}
          </span>
        )}
      </div>

      {successMessage && (
        <Alert className="bg-emerald-950/40 border-emerald-500/30 text-slate-100">
          <AlertTitle>Senha redefinida</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isBusy}>
        {isBusy ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Atualizando...
          </span>
        ) : (
          "Atualizar senha"
        )}
      </Button>
    </form>
  );
}
