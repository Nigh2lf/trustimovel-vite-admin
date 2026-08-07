import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resourceGroups } from "@/lib/resources";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Administração</h1>
        <p className="text-muted-foreground mt-1">
          Cadastros que valem para todas as imobiliárias do sistema
        </p>
      </div>

      {resourceGroups().map(({ group, resources }) => (
        <div key={group} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <Card
                key={resource.slug}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/${resource.slug}`)}
                onKeyDown={(event) => event.key === "Enter" && navigate(`/${resource.slug}`)}
                className="cursor-pointer transition-colors hover:border-primary"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    {resource.title}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{resource.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Home;
