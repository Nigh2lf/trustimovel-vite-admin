import { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SessionExpiredListener } from "@/components/SessionExpiredListener";
import { useAuth } from "@/hooks/use-auth";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ResourceForm from "./pages/ResourceForm";
import ResourceList from "./pages/ResourceList";

const queryClient = new QueryClient();

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { logout, getUser } = useAuth();
  const user = getUser();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {user?.name || "Administrador"}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Sair">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 bg-background">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const protectedPage = (page: ReactNode) => (
  <ProtectedRoute>
    <AdminLayout>{page}</AdminLayout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionExpiredListener />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/inicio" element={protectedPage(<Home />)} />

          {/* As telas de cadastro são genéricas: quem manda é ADMIN_RESOURCES. */}
          <Route path="/:resource" element={protectedPage(<ResourceList />)} />
          <Route path="/:resource/adicionar" element={protectedPage(<ResourceForm />)} />
          <Route path="/:resource/:id/editar" element={protectedPage(<ResourceForm />)} />

          <Route path="*" element={protectedPage(<NotFound />)} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
