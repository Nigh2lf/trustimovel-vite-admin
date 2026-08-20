import { useState } from "react";

/**
 * Estado da ordenação de uma listagem.
 *
 * Quem ordena de verdade é a API, pelo parâmetro `ordering` do DRF (`-campo` inverte). O
 * campo precisa estar no `ordering_fields` do ViewSet correspondente, senão o backend
 * ignora o parâmetro e a lista volta na ordem padrão sem avisar.
 */

export type SortState = { field: string; direction: "asc" | "desc" } | null;

export const useTableSort = (initial: SortState = null) => {
  const [sort, setSort] = useState<SortState>(initial);

  // Terceiro clique limpa a ordenação e devolve a lista à ordem padrão do endpoint.
  const toggle = (field: string) =>
    setSort((current) => {
      if (current?.field !== field) return { field, direction: "asc" };
      if (current.direction === "asc") return { field, direction: "desc" };
      return null;
    });

  const ordering = sort ? `${sort.direction === "desc" ? "-" : ""}${sort.field}` : undefined;

  return { sort, toggle, ordering };
};
