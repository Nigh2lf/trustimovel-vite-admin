export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized";

/** Nestes endpoints o 401 é credencial inválida, não sessão expirada. */
const PUBLIC_AUTH_ENDPOINTS = ["/auth-user/", "/api/users/google-login/"];

export const isPublicAuthEndpoint = (endpoint: string) =>
  PUBLIC_AUTH_ENDPOINTS.some((path) => endpoint.startsWith(path));

export const clearSession = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
};

/** Avisa a aplicação (fora do React) que a sessão caiu, para redirecionar ao login. */
export const notifyUnauthorized = () => {
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
};
