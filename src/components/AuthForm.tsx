'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Mail, Lock, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AuthFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (name: string, email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function AuthForm({ onLogin, onSignUp, isLoading, error }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (!formData.password) {
      errors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (mode === 'signup') {
      if (!formData.name) {
        errors.name = 'Nome é obrigatório';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Senhas não coincidem';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted:', { mode, formData });
    
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }

    console.log('Form validation passed, calling auth function...');

    try {
      if (mode === 'login') {
        console.log('Calling onLogin...');
        await onLogin(formData.email, formData.password);
      } else {
        console.log('Calling onSignUp...', { name: formData.name, email: formData.email });
        await onSignUp(formData.name, formData.email, formData.password);
      }
      console.log('Auth function completed successfully');
    } catch (error) {
      console.error('Erro na autenticação:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">
            NutriChat
          </CardTitle>
          <CardDescription>
            {mode === 'login' 
              ? 'Faça login para acessar seu assistente nutricional'
              : 'Crie sua conta para começar'
            }
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  disabled={isLoading}
                  className={`${formErrors.name ? 'border-red-500' : ''}`}
                />
                {formErrors.name && (
                  <p className="text-sm text-red-500">{formErrors.name}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={isLoading}
                className={formErrors.email ? 'border-red-500' : ''}
              />
              {formErrors.email && (
                <p className="text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={isLoading}
                className={formErrors.password ? 'border-red-500' : ''}
              />
              {formErrors.password && (
                <p className="text-sm text-red-500">{formErrors.password}</p>
              )}
            </div>

            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4" />
                  Confirmar senha
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua senha"
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  disabled={isLoading}
                  className={formErrors.confirmPassword ? 'border-red-500' : ''}
                />
                {formErrors.confirmPassword && (
                  <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg border">
                <p className="font-medium mb-1">🔒 Sua privacidade é importante:</p>
                <ul className="text-xs space-y-1">
                  <li>• Todas as mensagens são criptografadas</li>
                  <li>• Dados removidos automaticamente após 90 dias</li>
                  <li>• Você pode exportar ou deletar seus dados a qualquer momento</li>
                </ul>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setFormErrors({});
                  setFormData({ name: '', email: '', password: '', confirmPassword: '' });
                }}
                className="text-sm text-green-600 hover:text-green-700 hover:underline"
                disabled={isLoading}
              >
                {mode === 'login' 
                  ? 'Não tem conta? Criar conta'
                  : 'Já tem conta? Fazer login'
                }
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}