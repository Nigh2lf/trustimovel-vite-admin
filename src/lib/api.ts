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

/** Mensagens por campo, como o DRF devolve: `{ email: ["Informe o e-mail."] }`. */
export type FieldErrors = Record<string, string[]>;

/** Chaves do DRF que não apontam para um campo do formulário. */
const GENERAL_ERROR_KEYS = new Set(["non_field_errors", "detail", "error", "message"]);

/** Achata string, lista ou dicionário aninhado numa lista de mensagens legíveis. */
const flattenMessages = (payload: unknown): string[] => {
  if (typeof payload === "string") {
    return payload ? [payload] : [];
  }

  if (Array.isArray(payload)) {
    return payload.flatMap(flattenMessages);
  }

  if (payload && typeof payload === "object") {
    return Object.values(payload).flatMap(flattenMessages);
  }

  return [];
};

/**
 * Lê os dois envelopes da API: o legado (`error` como dicionário por campo, lista ou texto) e
 * o novo (`errors` como lista de `{ field, message }`). Devolve os erros por campo e os gerais.
 */
const collectErrors = (body: Record<string, unknown>): { fields: FieldErrors; general: string[] } => {
  const fields: FieldErrors = {};
  const general: string[] = [];

  const assign = (field: string, messages: string[]) => {
    if (!messages.length) return;

    if (GENERAL_ERROR_KEYS.has(field)) {
      general.push(...messages);
      return;
    }

    fields[field] = [...(fields[field] ?? []), ...messages];
  };

  if (Array.isArray(body.errors)) {
    body.errors.forEach((item) => {
      if (item && typeof item === "object" && "message" in item) {
        const entry = item as { field?: string; message: string };
        assign(entry.field || "non_field_errors", [entry.message]);
      }
    });
  }

  const legacy = body.error;

  if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
    Object.entries(legacy).forEach(([field, value]) => assign(field, flattenMessages(value)));
  } else {
    general.push(...flattenMessages(legacy));
  }

  return { fields, general };
};

/**
 * Erro da API com as mensagens separadas por campo, para o formulário marcar cada um em vez de
 * mostrar só a primeira. `message` reúne todas, na ordem em que a API as devolveu.
 */
export class ApiError extends Error {
  status: number;
  fieldErrors: FieldErrors;
  messages: string[];

  constructor(status: number, messages: string[], fieldErrors: FieldErrors = {}) {
    super(messages.join(" · ") || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * 403 é permissão, não sessão: o usuário continua logado e só não alcança aquele recurso.
 * Ter um tipo próprio deixa a tela distinguir "sem acesso" de um erro qualquer.
 */
export class ForbiddenError extends ApiError {
  constructor(message: string) {
    super(403, [message]);
    this.name = "ForbiddenError";
  }
}

/** Monta o ApiError a partir do corpo de uma resposta de erro. */
const buildApiError = (status: number, body: unknown): ApiError => {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const { fields, general } = collectErrors(record);
  const fieldMessages = Object.values(fields).flat();

  // A mensagem genérica do envelope só entra quando não há nada mais específico para mostrar.
  const fallback = typeof record.message === "string" && record.message ? [record.message] : [];
  const messages = [...general, ...fieldMessages];

  if (!messages.length) {
    messages.push(...fallback, ...flattenMessages(record.detail));
  }

  return new ApiError(status, messages.length ? messages : [`HTTP ${status}`], fields);
};

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
      const body = await response.json().catch(() => ({ message: response.statusText }));
      const error = buildApiError(response.status, body);

      // Sem permissão: mantém a sessão de pé e deixa a tela decidir o que mostrar.
      if (response.status === 403) {
        throw new ForbiddenError(error.message);
      }

      throw error;
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
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
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
