import { useNavigate } from "react-router-dom";
import { clearSession } from "@/lib/auth";

export const useAuth = () => {
  const navigate = useNavigate();

  const logout = () => {
    // Limpar todos os dados de autenticação
    clearSession();

    // Redirecionar para login
    navigate("/login", { replace: true });
  };

  const isAuthenticated = () => {
    return !!localStorage.getItem("access_token");
  };

  const getUser = () => {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  };

  return {
    logout,
    isAuthenticated,
    getUser,
  };
};
