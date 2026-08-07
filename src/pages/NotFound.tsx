import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
    <p className="text-5xl font-bold text-muted-foreground">404</p>
    <p className="text-lg text-muted-foreground">Esta página não existe no painel.</p>
    <Button asChild>
      <Link to="/inicio">Voltar para o início</Link>
    </Button>
  </div>
);

export default NotFound;
