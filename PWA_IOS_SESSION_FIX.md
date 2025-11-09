# 🍎 Correção de Perda de Sessão em PWA iOS

## 🔍 Problema Identificado

Quando o NutriChat é adicionado à tela inicial do iPhone (modo PWA/standalone), a sessão é perdida ao minimizar e reabrir o aplicativo. Isso ocorre devido a limitações específicas do Safari em modo standalone.

---

## 📋 Análise dos Problemas Atuais

### 1. ❌ Falta de Manifest PWA

- **Status:** Não existe `manifest.json` na pasta `public/`
- **Impacto:** iOS trata como web clip simples, não como PWA completo
- **Consequência:** Sem controle sobre cache, sessão e comportamento do app

### 2. ❌ Sem Recuperação de Sessão ao Reabrir

- **Status:** Não há listeners para eventos de visibilidade
- **Impacto:** Quando app volta ao foreground, sessão não é validada/recuperada
- **Consequência:** Usuário precisa fazer login novamente

### 3. ❌ Persistência Inadequada para iOS

- **Status:** Usa apenas `localStorage` (via `persistSession: true`)
- **Impacto:** iOS em modo standalone limpa localStorage agressivamente
- **Consequência:** Tokens de autenticação são perdidos

### 4. ❌ Falta de Service Worker

- **Status:** Sem service worker implementado
- **Impacto:** Sem cache offline, sem controle de ciclo de vida
- **Consequência:** App não funciona offline e perde contexto

### 5. ❌ Sem Metadata PWA no HTML

- **Status:** `layout.tsx` não tem tags meta específicas para PWA
- **Impacto:** iOS não reconhece como aplicativo instalável
- **Consequência:** Experiência degradada em modo standalone

---

## ✅ Soluções a Implementar

### Solução 1: Criar Manifest PWA

**Arquivo:** `public/manifest.json`

```json
{
  "name": "NutriChat - Assistente Nutricional",
  "short_name": "NutriChat",
  "description": "Assistente especializado em nutrição para nutricionistas",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#10b981",
  "orientation": "portrait-primary",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["health", "medical", "productivity"],
  "prefer_related_applications": false
}
```

**Ações Necessárias:**

- [ ] Criar pasta `public/icons/`
- [ ] Gerar ícones nos tamanhos especificados (usar ferramenta como [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator))
- [ ] Adicionar `manifest.json` na pasta `public/`

---

### Solução 2: Adicionar Metadata PWA no Layout

**Arquivo:** `src/app/layout.tsx`

**Adicionar no metadata:**

```typescript
export const metadata: Metadata = {
  title: "NutriChat - Assistente Nutricional",
  description:
    "Assistente especializado em nutrição para nutricionistas de produção",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NutriChat",
  },
  applicationName: "NutriChat",
  themeColor: "#10b981",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};
```

**Adicionar no `<head>`:**

```tsx
<head>
  <link rel="manifest" href="/manifest.json" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta
    name="apple-mobile-web-app-status-bar-style"
    content="black-translucent"
  />
  <meta name="apple-mobile-web-app-title" content="NutriChat" />
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
  <meta name="theme-color" content="#10b981" />
  <Script
    src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
    strategy="beforeInteractive"
  />
</head>
```

---

### Solução 3: Implementar Recuperação de Sessão no AuthContext

**Arquivo:** `src/context/AuthContext.tsx`

**Adicionar após os hooks existentes:**

```typescript
// Adicionar ao AuthProvider, dentro do componente
useEffect(() => {
  // Detectar quando app volta ao foreground (iOS PWA)
  const handleVisibilityChange = async () => {
    if (document.visibilityState === "visible") {
      console.log("[PWA] App voltou ao foreground, verificando sessão...");

      try {
        // Tentar recuperar sessão atual
        const currentUser = await authService.getCurrentSession();

        if (currentUser && !user) {
          // Sessão existe mas state está perdido - restaurar
          console.log("[PWA] Restaurando sessão perdida");
          setUser(currentUser);
          setIsAuthenticated(true);
          await initializePersistence(currentUser);

          const consent = await authService.hasConsent();
          setHasConsent(consent);

          // Atualizar status de interação
          await refreshInteractionStatus();
        } else if (!currentUser && user) {
          // Sessão foi perdida - fazer logout
          console.log("[PWA] Sessão perdida, fazendo logout");
          setUser(null);
          setIsAuthenticated(false);
          setHasConsent(false);
          setInteractionStatus(null);
        }
      } catch (error) {
        console.error("[PWA] Erro ao recuperar sessão:", error);
      }
    }
  };

  // Listener para visibilidade da página
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Listener adicional para focus (iOS standalone)
  window.addEventListener("focus", handleVisibilityChange);

  // Listener para pageshow (importante para iOS)
  window.addEventListener("pageshow", (event) => {
    // Se página foi carregada do bfcache, revalidar sessão
    if (event.persisted) {
      console.log("[PWA] Página restaurada do cache, verificando sessão...");
      handleVisibilityChange();
    }
  });

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("focus", handleVisibilityChange);
    window.removeEventListener("pageshow", handleVisibilityChange);
  };
}, [user, initializePersistence, refreshInteractionStatus]);
```

---

### Solução 4: Melhorar Persistência do Supabase para iOS

**Arquivo:** `src/lib/supabase.ts`

**Modificar a criação do client:**

```typescript
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          // Configuração específica para iOS PWA
          storage:
            typeof window !== "undefined"
              ? createIOSCompatibleStorage()
              : undefined,
          // Aumentar tempo de refresh para evitar perda de sessão
          storageKey: "nutrichat-auth-token",
        },
        db: {
          schema: "public",
        },
        global: {
          headers: {
            "x-application": "nutrichat",
          },
        },
      })
    : null;

// Storage compatível com iOS PWA
function createIOSCompatibleStorage() {
  return {
    getItem: (key: string) => {
      // Tentar múltiplas fontes
      try {
        // 1. Tentar localStorage primeiro
        const item = localStorage.getItem(key);
        if (item) return item;

        // 2. Fallback para sessionStorage
        return sessionStorage.getItem(key);
      } catch (error) {
        console.error("[Storage] Erro ao ler:", error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      try {
        // Salvar em ambos para redundância
        localStorage.setItem(key, value);
        sessionStorage.setItem(key, value);
      } catch (error) {
        console.error("[Storage] Erro ao salvar:", error);
        // Tentar pelo menos sessionStorage
        try {
          sessionStorage.setItem(key, value);
        } catch (e) {
          console.error("[Storage] Falha total ao salvar");
        }
      }
    },
    removeItem: (key: string) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error("[Storage] Erro ao remover:", error);
      }
    },
  };
}
```

---

### Solução 5: Criar Service Worker Básico

**Arquivo:** `public/sw.js`

```javascript
// Service Worker para PWA
const CACHE_NAME = "nutrichat-v1";
const urlsToCache = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// Instalação
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Ativação
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Ignorar requests para APIs externas
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clonar resposta antes de usar
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      })
      .catch(() => {
        // Se network falhar, tentar cache
        return caches.match(event.request);
      })
  );
});
```

**Registrar Service Worker em `src/app/layout.tsx`:**

```tsx
// Adicionar após o body, antes de fechar AuthProvider
useEffect(() => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registrado:", registration);
      })
      .catch((error) => {
        console.error("Erro ao registrar Service Worker:", error);
      });
  }
}, []);
```

---

### Solução 6: Adicionar Detecção de PWA Mode

**Criar arquivo:** `src/lib/pwa-utils.ts`

```typescript
/**
 * Detectar se está rodando em modo PWA/standalone (iOS)
 */
export function isRunningAsPWA(): boolean {
  if (typeof window === "undefined") return false;

  // iOS standalone mode
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone = (window.navigator as any).standalone === true;

  // Android/Chrome PWA
  const isAndroidPWA = window.matchMedia("(display-mode: standalone)").matches;

  return (isIOS && isStandalone) || isAndroidPWA;
}

/**
 * Detectar se é iOS
 */
export function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

/**
 * Mostrar prompt de instalação personalizado (se necessário)
 */
export function shouldShowInstallPrompt(): boolean {
  if (typeof window === "undefined") return false;

  const hasBeenPrompted = localStorage.getItem("pwa-install-prompted");
  const isPWA = isRunningAsPWA();

  return !isPWA && !hasBeenPrompted;
}

/**
 * Marcar que já mostrou prompt de instalação
 */
export function markInstallPromptShown(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("pwa-install-prompted", "true");
}
```

**Usar no AuthContext para debug:**

```typescript
import { isRunningAsPWA, isIOS } from "@/lib/pwa-utils";

// No início do AuthProvider
useEffect(() => {
  const pwaMode = isRunningAsPWA();
  const iOS = isIOS();
  console.log("[PWA] Modo:", { pwaMode, iOS });
}, []);
```

---

## 🎯 Ordem de Implementação Recomendada

1. **Criar ícones e manifest.json** (Solução 1)
2. **Adicionar metadata PWA no layout** (Solução 2)
3. **Implementar storage compatível com iOS** (Solução 4)
4. **Adicionar recuperação de sessão** (Solução 3)
5. **Criar utilitários PWA** (Solução 6)
6. **Implementar Service Worker** (Solução 5) - Opcional mas recomendado

---

## 🧪 Como Testar

1. **Build de produção:**

   ```bash
   npm run build
   npm start
   ```

2. **No iPhone:**

   - Abra o Safari e acesse o app
   - Clique em "Compartilhar" → "Adicionar à Tela de Início"
   - Abra o app instalado
   - Faça login
   - Minimize o app (apertar o botão home)
   - Espere 10-30 segundos
   - Reabra o app
   - ✅ Sessão deve ser mantida

3. **Debug:**
   - Conectar iPhone ao Mac
   - Abrir Safari → Develop → iPhone → NutriChat
   - Verificar console para logs `[PWA]`

---

## 📊 Resultados Esperados

✅ Sessão mantida ao minimizar/reabrir app  
✅ App funciona offline (rotas básicas)  
✅ Ícone personalizado na tela inicial  
✅ Splash screen durante carregamento  
✅ Barra de status do iOS integrada  
✅ Experiência nativa no iOS

---

## ⚠️ Limitações do iOS

Mesmo com todas as soluções implementadas, o iOS tem limitações:

- **Memória limitada:** iOS pode matar o processo se ficar muito tempo em background
- **Cache agressivo:** iOS limpa cache mais agressivamente que Android
- **Storage limits:** Limite de ~50MB para localStorage/IndexedDB
- **No background sync:** iOS não permite sync em background para PWAs

**Recomendação:** Sempre implementar refresh de sessão ao reabrir o app.

---

## 🔗 Recursos Adicionais

- [Apple PWA Guidelines](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [PWA iOS Limitations](https://firt.dev/notes/pwa-ios/)
- [Supabase Auth Storage](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)

---

**Data:** 08/11/2025  
**Status:** 📋 Aguardando implementação  
**Prioridade:** 🔴 Alta (afeta experiência do usuário em iOS)
