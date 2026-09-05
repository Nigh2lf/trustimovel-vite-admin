import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    // 8080 é o painel da imobiliária; o admin sobe ao lado dele.
    port: 8081,
    // Rede de segurança: se o dev server subir atrás de um domínio do Railway, não bloqueia o host.
    allowedHosts: [".up.railway.app"],
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
