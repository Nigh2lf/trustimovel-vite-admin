import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: ReactNode;
}

/** Todo o painel é administrativo: sem token ou sem perfil ADMIN, volta para o login. */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, getUser } = useAuth();

  if (!isAuthenticated() || getUser()?.type !== "ADMIN") {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
