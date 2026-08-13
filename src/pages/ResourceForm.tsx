import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RemoteCombobox } from "@/components/RemoteCombobox";
import { useToast } from "@/hooks/use-toast";
import { useCatalogItem, useCatalogMutations } from "@/lib/catalog";
import { AdminResource, ResourceField, findResource } from "@/lib/resources";
import NotFound from "@/pages/NotFound";

type FieldValue = string | boolean;
type FormState = Record<string, FieldValue>;

/** Rótulo de cada relação, guardado à parte porque o combobox só carrega a lista ao abrir. */
type LabelState = Record<string, string>;

const emptyForm = (resource: AdminResource): FormState =>
  Object.fromEntries(
    resource.fields.map((field) => [
      field.name,
      field.defaultValue ?? (field.type === "switch" ? false : ""),
    ])
  );

const isVisible = (field: ResourceField, isEditMode: boolean) =>
  !isEditMode || !field.onlyOnCreate;

/** O payload manda só o que o formulário mostra; senha em branco não troca a senha. */
const buildPayload = (resource: AdminResource, form: FormState, isEditMode: boolean) => {
  const payload: Record<string, unknown> = {};

  for (const field of resource.fields) {
    const value = form[field.name];

    if (field.type === "password" && !value) {
      continue;
    }

    if (field.type === "relation") {
      payload[field.name] = value ? String(value) : null;
      continue;
    }

    if (field.type === "number") {
      const text = String(value ?? "").trim();
      payload[field.name] = field.nullable && !text ? null : Number(text) || 0;
      continue;
    }

    payload[field.name] = value;
  }

  if (isEditMode) {
    delete payload.id;
  }

  return payload;
};

const ResourceForm = () => {
  const { resource: slug, id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const resource = findResource(slug);
  const isEditMode = Boolean(id);

  const [form, setForm] = useState<FormState>(() => (resource ? emptyForm(resource) : {}));
  const [labels, setLabels] = useState<LabelState>({});

  const { item, isLoading, error } = useCatalogItem<Record<string, unknown>>(
    resource?.endpoint ?? "",
    id
  );

  useEffect(() => {
    if (!resource || !item) {
      return;
    }

    const loaded: FormState = {};
    const loadedLabels: LabelState = {};

    for (const field of resource.fields) {
      const value = item[field.name];

      if (field.type === "switch") {
        loaded[field.name] = Boolean(value);
        continue;
      }

      // A senha nunca volta da API: fica em branco e só troca se for preenchida.
      loaded[field.name] = field.type === "password" ? "" : value === null ? "" : String(value ?? "");

      if (field.type === "relation" && field.labelField) {
        loadedLabels[field.name] = String(item[field.labelField] ?? "");
      }
    }

    setForm(loaded);
    setLabels(loadedLabels);
  }, [item, resource]);

  const { create, update, isSaving } = useCatalogMutations(resource?.endpoint ?? "", {
    label: resource?.singular ?? "Registro",
    feminine: resource?.feminine,
    onSaved: () => navigate(`/${slug}`),
  });

  if (!resource) {
    return <NotFound />;
  }

  const setField = (name: string, value: FieldValue) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const missing = resource.fields.find(
      (field) =>
        field.required &&
        !(isEditMode && field.type === "password") &&
        !String(form[field.name] ?? "").trim()
    );

    if (missing) {
      toast({
        variant: "destructive",
        title: "Dados incompletos",
        description: `Informe ${missing.label.toLowerCase()}.`,
      });
      document.getElementById(`field-${missing.name}`)?.focus();
      return;
    }

    const payload = buildPayload(resource, form, isEditMode);

    if (isEditMode && id) {
      update.mutate({ id, payload });
      return;
    }

    create.mutate(payload);
  };

  const renderField = (field: ResourceField) => {
    const value = form[field.name];

    if (field.type === "switch") {
      // Mesma altura do Input, para o campo alinhar com os vizinhos da grade.
      return (
        <div className="flex h-10 items-center gap-3 rounded-md border border-input px-3">
          <Switch
            id={`field-${field.name}`}
            checked={Boolean(value)}
            onCheckedChange={(checked) => setField(field.name, checked)}
          />
          <Label
            htmlFor={`field-${field.name}`}
            className="cursor-pointer font-normal text-muted-foreground"
          >
            {value ? "Sim" : "Não"}
          </Label>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <Select value={String(value ?? "")} onValueChange={(next) => setField(field.name, next)}>
          <SelectTrigger id={`field-${field.name}`}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === "relation") {
      const parent = field.dependsOn ? String(form[field.dependsOn] ?? "") : "";

      return (
        <RemoteCombobox
          id={`field-${field.name}`}
          endpoint={field.endpoint as string}
          params={field.filterParam && parent ? { [field.filterParam]: parent } : undefined}
          disabled={Boolean(field.dependsOn) && !parent}
          value={String(value ?? "")}
          valueLabel={labels[field.name]}
          onChange={(next, option) => {
            setField(field.name, next);
            setLabels((current) => ({ ...current, [field.name]: option?.name ?? "" }));
          }}
          placeholder="Selecione"
        />
      );
    }

    return (
      <Input
        id={`field-${field.name}`}
        type={field.type === "number" ? "number" : field.type}
        value={String(value ?? "")}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        autoComplete={field.type === "password" ? "new-password" : undefined}
        onChange={(event) => setField(field.name, event.target.value)}
      />
    );
  };

  return (
    // Largura limitada: em tela cheia os campos ficariam com quase mil pixels cada.
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/${resource.slug}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditMode ? `Editar ${resource.singular}` : `Adicionar ${resource.singular}`}
          </h1>
          <p className="text-muted-foreground mt-1">{resource.description}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="py-4 text-destructive">
                Não foi possível carregar o cadastro: {error.message}
              </p>
            ) : isEditMode && isLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {resource.fields.filter((field) => isVisible(field, isEditMode)).map((field) => (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={`field-${field.name}`}>
                      {field.label}
                      {field.required && !(isEditMode && field.type === "password") && (
                        <span className="text-destructive"> *</span>
                      )}
                    </Label>
                    {renderField(field)}
                    {field.help && (
                      <p className="text-xs text-muted-foreground">{field.help}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(`/${resource.slug}`)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving || Boolean(error)}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditMode ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ResourceForm;
