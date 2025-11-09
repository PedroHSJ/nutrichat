# NutriChat - Assistente Nutricional com IA

Um chatbot especializado em nutrição construído com Next.js, TypeScript e shadcn/ui, que oferece suporte a múltiplas APIs de IA e persistência segura de dados.

## 🚀 Funcionalidades

- **Interface moderna** com sidebar inset do shadcn/ui
- **Múltiplas APIs de IA** suportadas (ChatGPT/OpenAI e GitHub Models/Copilot)
- **Sistema de chat** com histórico e navegação entre conversas
- **Persistência segura** com Supabase e criptografia de dados
- **Conformidade LGPD** com controle total do usuário sobre seus dados
- **Estados de loading** e feedback visual
- **Design responsivo** focado em nutricionistas
- **Alternância simples** entre providers de IA

## � Recursos de Privacidade e Segurança

- ✅ **Criptografia end-to-end** de todas as mensagens
- ✅ **Consentimento explícito** para armazenamento de dados
- ✅ **Direito ao esquecimento** - delete seus dados a qualquer momento
- ✅ **Portabilidade** - exporte seus dados em formato JSON
- ✅ **Retenção limitada** - dados removidos automaticamente após 90 dias
- ✅ **Row Level Security** no banco de dados
- ✅ **Sessões anônimas** para máxima privacidade

## �🔧 Configuração das APIs

### Passo 1: Configurar Variáveis de Ambiente

Copie o arquivo `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

### Passo 2: Escolher o Provider de IA

No arquivo `.env.local`, defina qual API você quer usar:

```env
# Para usar ChatGPT/OpenAI
AI_PROVIDER=openai

# Para usar GitHub Models/Copilot
AI_PROVIDER=github
```

### Passo 3: Configurar as Credenciais

#### Para OpenAI/ChatGPT:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here
```

**Como obter:** https://platform.openai.com/api-keys

#### Para GitHub Models:

```env
AI_PROVIDER=github
GITHUB_TOKEN=ghp_your-github-token-here
```

**Como obter:**

1. Vá para https://github.com/settings/tokens
2. Crie um novo token com o escopo `model`
3. Use o token gerado

## 🗄️ Configuração do Supabase (Opcional)

Para habilitar a persistência de dados, configure o Supabase:

1. **Siga o guia completo:** [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

2. **Configure as variáveis no `.env.local`:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

3. **Execute o schema do banco:**
   - Copie e execute o SQL em `database/schema.sql` no SQL Editor do Supabase

### Sem Supabase

Se não configurar o Supabase, o chat funcionará apenas durante a sessão (sem persistência).

## 🎯 Providers Suportados

### 1. OpenAI (ChatGPT)

- **Valor da variável:** `openai` ou `chatgpt`
- **Modelos:** gpt-3.5-turbo, gpt-4, etc.
- **Requer:** `OPENAI_API_KEY`

### 2. GitHub Models

- **Valor da variável:** `github` ou `copilot`
- **Modelos:** gpt-4o, gpt-4o-mini, gpt-3.5-turbo
- **Requer:** `GITHUB_TOKEN` e `GITHUB_MODEL` (opcional)

## 🔄 Como Alternar Entre APIs

1. **Edite o arquivo `.env.local`:**

   ```env
   # Mude de:
   AI_PROVIDER=openai

   # Para:
   AI_PROVIDER=github
   ```

2. **Reinicie o servidor:**

   ```bash
   npm run dev
   ```

3. **Verifique o status no sidebar** - há um indicador que mostra qual API está ativa

## 📦 Instalação e Execução

1. **Clone o repositório:**

   ```bash
   git clone <repository-url>
   cd nutrichat
   ```

2. **Instale as dependências:**

   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente:**

   ```bash
   cp .env.example .env.local
   # Edite .env.local com suas credenciais
   ```

4. **Execute o projeto:**

   ```bash
   npm run dev
   ```

5. **Acesse:** http://localhost:3000
