import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { DEFAULT_PAGE_SIZE, useCatalogList, useCatalogMutations } from "@/lib/catalog";
import { ResourceColumn, findResource } from "@/lib/resources";
import NotFound from "@/pages/NotFound";

interface ResourceRecord {
  id: string;
  name?: string;
  [key: string]: unknown;
}

const renderValue = (item: ResourceRecord, column: ResourceColumn) => {
  const value = item[column.field];

  if (typeof value === "boolean") {
    return <Badge variant={value ? "default" : "secondary"}>{value ? "Sim" : "Não"}</Badge>;
  }

  if (column.options) {
    const option = column.options.find((item) => item.value === value);

    return option?.label ?? "—";
  }

  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }

  return String(value);
};

const ResourceList = () => {
  const { resource: slug } = useParams();
  const navigate = useNavigate();
  const resource = findResource(slug);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [itemToDelete, setItemToDelete] = useState<ResourceRecord | null>(null);

  const { items, count, isLoading, isError, error } = useCatalogList<ResourceRecord>(
    resource?.endpoint ?? "",
    { search, page }
  );

  const { remove } = useCatalogMutations(resource?.endpoint ?? "", {
    label: resource?.singular ?? "Registro",
    onRemoved: () => setItemToDelete(null),
  });

  if (!resource) {
    return <NotFound />;
  }

  const totalPages = Math.max(1, Math.ceil(count / DEFAULT_PAGE_SIZE));

  // Busca nova sempre recomeça da primeira página, senão a lista pode vir vazia sem motivo aparente.
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{resource.title}</h1>
          <p className="text-muted-foreground mt-1">{resource.description}</p>
        </div>
        <Button onClick={() => navigate(`/${resource.slug}/adicionar`)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              Listagem
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(event) => handleSearch(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <p className="py-8 text-center text-destructive">
              Não foi possível carregar os dados: {error?.message}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {resource.columns.map((column) => (
                    <TableHead key={column.header}>{column.header}</TableHead>
                  ))}
                  <TableHead className="w-28 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={resource.columns.length + 1}
                      className="text-center text-muted-foreground py-8"
                    >
                      {isLoading ? "Carregando..." : "Nenhum registro encontrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      {resource.columns.map((column) => (
                        <TableCell key={column.header}>{renderValue(item, column)}</TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Editar"
                            onClick={() => navigate(`/${resource.slug}/${item.id}/editar`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            onClick={() => setItemToDelete(item)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage((current) => Math.max(1, current - 1));
                }}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter((item) => Math.abs(item - page) <= 2)
              .map((item) => (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    isActive={page === item}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage((current) => Math.min(totalPages, current + 1));
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      <AlertDialog open={itemToDelete !== null} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deseja realmente excluir "{itemToDelete?.name ?? "este registro"}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Após excluir não será mais possível recuperar este cadastro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && remove.mutate(itemToDelete.id)}
              disabled={remove.isPending}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResourceList;
