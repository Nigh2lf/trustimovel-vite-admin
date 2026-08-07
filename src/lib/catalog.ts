import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

/** Leitura e escrita dos cadastros simples da API, usados pelas telas de catálogo. */

export interface CatalogRecord {
  id: string;
  name: string;
}

export type CatalogParams = Record<string, string | number | boolean | undefined>;

/** Mesmo PAGE_SIZE configurado no DRF. */
export const DEFAULT_PAGE_SIZE = 15;

/** Catálogos fechados usam CatalogPagination no backend, com a página bem maior. */
export const CATALOG_PAGE_SIZE = 200;

/** Campo vazio viraria `?search=` na URL e o backend trataria como filtro, não como "sem filtro". */
const cleanParams = (params: CatalogParams): Record<string, string | number | boolean> =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== "")
  ) as Record<string, string | number | boolean>;

export const useCatalogList = <T = CatalogRecord>(endpoint: string, params: CatalogParams = {}) => {
  const query = useQuery({
    queryKey: [endpoint, params],
    queryFn: () => api.get(endpoint, { params: cleanParams(params) }),
    placeholderData: (previous) => previous,
  });

  return {
    items: (query.data?.data?.results ?? []) as T[],
    count: (query.data?.data?.count ?? 0) as number,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
  };
};

/** Carrega um registro para a tela de edição. */
export const useCatalogItem = <T = CatalogRecord>(endpoint: string, id?: string) => {
  const query = useQuery({
    queryKey: [endpoint, "detail", id],
    queryFn: () => api.get(`${endpoint}${id}/`),
    enabled: Boolean(id),
  });

  return {
    item: (query.data?.data ?? null) as T | null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
};

interface CatalogMutationOptions {
  /** Nome do registro nas mensagens, ex.: "Tipo de imóvel". */
  label: string;
  /** Concorda o particípio com o nome: "Imobiliária criada" em vez de "criado". */
  feminine?: boolean;
  onSaved?: () => void;
  onRemoved?: () => void;
}

export const useCatalogMutations = <TPayload extends object>(
  endpoint: string,
  { label, feminine = false, onSaved, onRemoved }: CatalogMutationOptions
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const ending = feminine ? "a" : "o";

  // Invalida por endpoint para atingir listagem, detalhe e os comboboxes que leem o mesmo catálogo.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [endpoint] });

  const showError = (error: Error) =>
    toast({ variant: "destructive", title: "Não foi possível salvar", description: error.message });

  const create = useMutation({
    mutationFn: (payload: TPayload) => api.post(endpoint, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: `${label} criad${ending}`, description: "O cadastro foi salvo com sucesso." });
      onSaved?.();
    },
    onError: showError,
  });

  const update = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TPayload }) =>
      api.patch(`${endpoint}${id}/`, payload),
    onSuccess: () => {
      invalidate();
      toast({ title: `${label} atualizad${ending}`, description: "As alterações foram salvas." });
      onSaved?.();
    },
    onError: showError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`${endpoint}${id}/`),
    onSuccess: () => {
      invalidate();
      toast({ title: `${label} excluíd${ending}`, description: "O cadastro foi removido." });
      onRemoved?.();
    },
    onError: (error: Error) =>
      toast({ variant: "destructive", title: "Não foi possível excluir", description: error.message }),
  });

  return { create, update, remove, isSaving: create.isPending || update.isPending };
};
