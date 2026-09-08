export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

/** Nestes endpoints o 401 é credencial inválida, não sessão expirada. */
const PUBLIC_AUTH_ENDPOINTS = ["/auth-user/"];

export const isPublicAuthEndpoint = (endpoint: string) =>
  PUBLIC_AUTH_ENDPOINTS.some((path) => endpoint.startsWith(path));

interface Session {
  access: string;
  refresh: string;
  user: unknown;
  /** "Confiar neste dispositivo": só então o refresh fica guardado e o access se renova sozinho. */
  rememberMe: boolean;
}

export const saveSession = ({ access, refresh, user, rememberMe }: Session) => {
  localStorage.setItem("access_token", access);
  localStorage.setItem("user", JSON.stringify(user));

  // Sem a opção, a sessão dura só o access: o refresh nem chega a ficar no navegador.
  if (rememberMe) {
    localStorage.setItem("refresh_token", refresh);
  } else {
    localStorage.removeItem("refresh_token");
  }
};

export const getRefreshToken = () => localStorage.getItem("refresh_token");

export const setAccessToken = (access: string) => {
  localStorage.setItem("access_token", access);
};

export const clearSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

/** Avisa a aplicação (fora do React) que a sessão caiu, para redirecionar ao login. */
export const notifyUnauthorized = () => {
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
};
