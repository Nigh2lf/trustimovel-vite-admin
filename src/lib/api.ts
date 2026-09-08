import {
  clearSession,
  getRefreshToken,
  isPublicAuthEndpoint,
  notifyUnauthorized,
  setAccessToken,
} from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/** Erro do DRF pode vir como string, lista ou dicionário por campo; pega a primeira mensagem legível. */
const extractErrorMessage = (payload: unknown): string | undefined => {
  if (typeof payload === "string") {
    return payload || undefined;
  }

  if (Array.isArray(payload)) {
    return payload.map(extractErrorMessage).find(Boolean);
  }

  if (payload && typeof payload === "object") {
    return Object.values(payload).map(extractErrorMessage).find(Boolean);
  }

  return undefined;
};

/**
 * 403 é permissão, não sessão: o usuário continua logado e só não alcança aquele recurso.
 * Ter um tipo próprio deixa a tela distinguir "sem acesso" de um erro qualquer.
 */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

class ApiClient {
  private baseURL: string;
  /** Renovação em andamento: várias requisições que tomam 401 juntas esperam a mesma. */
  private refreshing: Promise<string | null> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private buildURL(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private getHeaders(options?: RequestInit): HeadersInit {
    // Em FormData o próprio navegador define o Content-Type com o boundary do multipart.
    const isFormData = options?.body instanceof FormData;

    const headers: HeadersInit = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options?.headers,
    };

    // Adicionar token de autenticação se existir
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Troca o refresh guardado ("Confiar neste dispositivo") por um access novo.
   * Devolve null quando não há refresh ou ele também venceu: aí a sessão caiu de verdade.
   */
  private refreshAccessToken(): Promise<string | null> {
    const refresh = getRefreshToken();
    if (!refresh) {
      return Promise.resolve(null);
    }

    if (!this.refreshing) {
      // fetch direto, e não this.request: o access vencido não vai no header nem dispara outro refresh.
      this.refreshing = fetch(this.buildURL("/token-refresh/"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      })
        .then(async (response) => {
          if (!response.ok) {
            return null;
          }

          const { access } = await response.json();
          setAccessToken(access);
          return access as string;
        })
        .catch(() => null)
        .finally(() => {
          this.refreshing = null;
        });
    }

    return this.refreshing;
  }

  async request<T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { params, ...fetchOptions } = options;

    const url = this.buildURL(endpoint, params);

    let response = await fetch(url, {
      ...fetchOptions,
      headers: this.getHeaders(fetchOptions),
    });

    // Access vencido com "Confiar neste dispositivo": renova e repete a chamada uma única vez.
    if (response.status === 401 && !isPublicAuthEndpoint(endpoint) && (await this.refreshAccessToken())) {
      response = await fetch(url, {
        ...fetchOptions,
        headers: this.getHeaders(fetchOptions),
      });
    }

    // Token ausente/expirado/inválido, e sem refresh que o renove: derruba a sessão e manda para o login.
    if (response.status === 401 && !isPublicAuthEndpoint(endpoint)) {
      clearSession();
      notifyUnauthorized();
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));

      // Capturar diferentes formatos de erro
      const errorMessage =
        extractErrorMessage(error.error) ||
        extractErrorMessage(error.message) ||
        extractErrorMessage(error.detail) ||
        extractErrorMessage(error.non_field_errors) ||
        `HTTP ${response.status}`;

      // Sem permissão: mantém a sessão de pé e deixa a tela decidir o que mostrar.
      if (response.status === 403) {
        throw new ForbiddenError(errorMessage);
      }

      throw new Error(errorMessage);
    }

    // 204 (delete, por exemplo) vem sem corpo, e response.json() quebraria nele.
    const body = await response.text();

    return body ? JSON.parse(body) : (null as T);
  }

  get<T = any>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  }

  put<T = any>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T = any>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T = any>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}

export const api = new ApiClient(API_BASE_URL);

// Exportar a URL base para uso em outras partes
export const getAPIBaseURL = () => API_BASE_URL;
