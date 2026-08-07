import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/auth";

/** Escuta o 401 disparado pelo cliente de API e leva o usuário de volta ao login. */
export const SessionExpiredListener = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleUnauthorized = () => {
      // Já está na tela de login: nada a fazer (evita loop e toast duplicado).
      if (location.pathname === "/login" || location.pathname === "/") {
        return;
      }

      // O id evita empilhar toasts quando várias requisições falham juntas.
      toast.error("Sessão expirada. Faça login novamente.", { id: "session-expired" });
      navigate("/login", { replace: true, state: { from: location.pathname } });
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [navigate, location.pathname]);

  return null;
};
