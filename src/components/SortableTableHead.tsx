import { ReactNode } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { SortState } from "@/hooks/use-table-sort";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  /** Campo aceito pelo `ordering` da API. Sem ele a coluna aparece, mas não ordena. */
  field?: string;
  sort: SortState;
  onToggle: (field: string) => void;
  className?: string;
  children: ReactNode;
}

/** Cabeçalho que ordena a listagem no servidor; o estado vem do `useTableSort`. */
export const SortableTableHead = ({
  field,
  sort,
  onToggle,
  className,
  children,
}: SortableTableHeadProps) => {
  if (!field) {
    return <TableHead className={className}>{children}</TableHead>;
  }

  const isActive = sort?.field === field;
  const Icon = !isActive ? ChevronsUpDown : sort.direction === "asc" ? ChevronUp : ChevronDown;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onToggle(field)}
        className="inline-flex items-center gap-1 hover:text-foreground"
        title="Ordenar por esta coluna"
      >
        {children}
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            isActive ? "text-foreground" : "text-muted-foreground/50"
          )}
        />
      </button>
    </TableHead>
  );
};
