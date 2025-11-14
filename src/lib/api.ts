import axios, {
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import supabase from "./supabase";

// Types para as APIs
interface CheckoutSessionData {
  priceId: string;
}

interface VerifyPaymentData {
  sessionId: string;
}

// Tipos de resposta (opcional - para maior type safety)
interface CheckoutSessionResponse {
  checkoutUrl: string;
  success: boolean;
}

interface SubscriptionStatusResponse {
  subscriptionStatus: string;
  planType: string;
  planName: string;
  dailyLimit: number;
  remainingInteractions: number;
  currentPeriodEnd?: string;
}
interface BillingPortalResponse {
  success: boolean;
  url?: string;
  error?: string;
}

// Criar instância do Axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Obter sessão atual do Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        config.headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.warn("[API] Erro ao obter token:", error);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Tratar erros de autenticação
    if (error.response?.status === 401) {
      console.warn("[API] Token inválido ou expirado");
      // Opcional: redirecionar para login ou renovar token
    }

    return Promise.reject(error);
  },
);

export default api;

// Funções helper para chamadas específicas
export const apiClient = {
  // ===== SUBSCRIPTION =====
  getSubscriptionStatus: () => api.get("/api/subscription/status"),
  createCheckoutSession: (data: CheckoutSessionData) =>
    api.post("/api/subscription/checkout", data),
  cancelSubscription: () => api.post("/api/subscription/cancel"),
  createBillingPortalSession: () =>
    api.post<BillingPortalResponse>("/api/subscription/billing-portal"),
  verifyPayment: (sessionId: string) =>
    api.post("/api/subscription/verify-payment", {
      sessionId,
    } as VerifyPaymentData),

  // ===== CHAT =====
  // sendChatMessage: (data: ChatMessageData) => api.post('/api/chat', data),

  // ===== USER =====
  // getUserProfile: () => api.get('/api/user/profile'),
  // updateUserProfile: (data: UserProfileData) => api.put('/api/user/profile', data),

  // ===== PLANS =====
  getPlans: () => api.get("/api/subscription/plans"),
};
