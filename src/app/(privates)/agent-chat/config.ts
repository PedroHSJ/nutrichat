import type { StartScreenPrompt } from '@openai/chatkit';

export const CHATKIT_SESSION_ENDPOINT =
  process.env.NEXT_PUBLIC_CHATKIT_SESSION_ENDPOINT ?? '/api/chatkit/session';

export const CHATKIT_GREETING = {
  title: 'Bem-vindo ao Agente Inteligente',
  message:
    'Sou o agente especializado do NutriChat, pronto para executar fluxos avançados no workflow dedicado da OpenAI. Selecione um prompt inicial ou descreva sua necessidade.',
};

export const CHATKIT_STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: 'Planejamento de cardápio saudável',
    prompt:
      'Me ajude a estruturar um cardápio semanal equilibrado para uma unidade de alimentação coletiva, considerando restrições de sódio e preferências vegetarianas.',
    icon: 'sparkle',
  },
  {
    label: 'Análise de ficha técnica',
    prompt:
      'Analise a seguinte ficha técnica de preparo e sugira ajustes para reduzir o teor de gorduras saturadas sem comprometer o sabor.',
    icon: 'book-open',
  },
  {
    label: 'Checklist de segurança alimentar',
    prompt:
      'Quais são os principais pontos de controle que devo validar hoje na cozinha industrial para garantir conformidade com as normas de segurança alimentar?',
    icon: 'notebook',
  },
];

export const CHATKIT_PLACEHOLDER =
  'Descreva a situação em detalhe ou escolha um prompt sugerido para começar...';

export const CHATKIT_API_URL =
  process.env.NEXT_PUBLIC_CHATKIT_API_URL ?? '/api/chatkit';

/**
 * ChatKit still expects a domain key at runtime. Use any placeholder locally,
 * but register your production domain at
 * https://platform.openai.com/settings/organization/security/domain-allowlist
 * and deploy the real key.
 */
export const CHATKIT_API_DOMAIN_KEY =
  process.env.NEXT_PUBLIC_OPENAI_CHATKIT_DOMAIN ?? 'domain_pk_localhost_dev';


export const THEME_STORAGE_KEY = "chatkit-boilerplate-theme";

export const GREETING = "Welcome to the ChatKit Demo";

export const STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: "What can you do?",
    prompt: "What can you do?",
    icon: "circle-question",
  },
  {
    label: "My name is Kaz",
    prompt: "My name is Kaz",
    icon: "book-open",
  },
  {
    label: "What's the weather in Paris?",
    prompt: "What's the weather in Paris?",
    icon: "search",
  },
  {
    label: "Change the theme to dark mode",
    prompt: "Change the theme to dark mode",
    icon: "sparkle",
  },
];

export const PLACEHOLDER_INPUT = "Share a fact about yourself";