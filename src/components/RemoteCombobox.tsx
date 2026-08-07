import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface RemoteOption {
  id: string;
  name: string;
}

interface RemoteComboboxProps {
  /** Id do botão, usado para o rótulo e para focar o campo na validação. */
  id?: string;
  /** Marca o campo como pendente na validação, com borda vermelha. */
  invalid?: boolean;
  /** Endpoint paginado do catálogo, ex.: "/cities/". */
  endpoint: string;
  /** Filtros extras enviados na busca, ex.: { city: "<uuid>" }. */
  params?: Record<string, string>;
  value: string;
  /** Rótulo do valor definido por fora (ex.: preenchido pelo CEP), já que a lista só carrega ao abrir. */
  valueLabel?: string;
  onChange: (value: string, option?: RemoteOption) => void;
  placeholder: string;
  disabled?: boolean;
  /** Quando informado, a busca sem resultado oferece cadastrar o termo digitado. */
  onCreate?: (name: string) => Promise<RemoteOption>;
  /** Rótulo da opção de cadastro, ex.: "captador". */
  createLabel?: string;
}

/**
 * Select de catálogo grande (cidades, bairros): a busca vai para a API em vez
 * de carregar a lista inteira no navegador.
 */
export const RemoteCombobox = ({
  id,
  invalid,
  endpoint,
  params,
  value,
  valueLabel,
  onChange,
  placeholder,
  disabled,
  onCreate,
  createLabel,
}: RemoteComboboxProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RemoteOption | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Espera o usuário parar de digitar antes de consultar a API.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(term), 300);

    return () => clearTimeout(timer);
  }, [term]);

  // Quem limpa o filtro por fora (botão "Limpar") também limpa o rótulo exibido.
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }

    if (valueLabel) {
      setSelected((current) =>
        current?.id === value ? current : { id: value, name: valueLabel }
      );
    }
  }, [value, valueLabel]);

  const { data, isFetching } = useQuery({
    queryKey: ["catalog", endpoint, params, search],
    queryFn: () => api.get(endpoint, { params: { ...params, search } }),
    enabled: open && !disabled,
  });

  const options: RemoteOption[] = data?.data?.results ?? [];

  const handleSelect = (option: RemoteOption | null) => {
    setSelected(option);
    onChange(option?.id ?? "", option ?? undefined);
    setTerm("");
    setCreateError(null);
    setOpen(false);
  };

  const newName = term.trim();
  const canCreate =
    Boolean(onCreate) &&
    newName.length > 0 &&
    !isFetching &&
    !options.some((option) => option.name.toLowerCase() === newName.toLowerCase());

  const handleCreate = async () => {
    if (!onCreate || isCreating) {
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const option = await onCreate(newName);
      // A lista precisa esquecer as buscas antigas para o registro novo aparecer nelas.
      queryClient.invalidateQueries({ queryKey: ["catalog", endpoint] });
      handleSelect(option);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Não foi possível cadastrar.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);

        if (!next) {
          setCreateError(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            invalid && "border-destructive focus-visible:ring-destructive"
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected?.name ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Digite para buscar..." value={term} onValueChange={setTerm} />
          <CommandList>
            {isFetching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              !canCreate && <CommandEmpty>Nenhum resultado.</CommandEmpty>
            )}
            {canCreate && (
              <CommandGroup>
                <CommandItem value="__create__" onSelect={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  <span className="truncate">
                    Cadastrar {createLabel ?? "registro"} "{newName}"
                  </span>
                </CommandItem>
                {createError && (
                  <p className="px-2 pb-2 text-xs text-destructive">{createError}</p>
                )}
              </CommandGroup>
            )}
            <CommandGroup>
              {value && (
                <CommandItem value="__clear__" onSelect={() => handleSelect(null)}>
                  Limpar seleção
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id}
                  onSelect={() => handleSelect(option)}
                >
                  <Check
                    className={cn("mr-2 h-4 w-4", value === option.id ? "opacity-100" : "opacity-0")}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
