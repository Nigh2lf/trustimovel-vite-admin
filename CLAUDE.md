# CLAUDE.md — Painel da plataforma (admin)

Frontend que o **operador da plataforma** usa para administrar o SaaS: cadastra as imobiliárias
clientes, os planos que elas assinam, os usuários de qualquer conta e os catálogos globais que todas
compartilham. Roda em `http://localhost:8081`.

O painel que a imobiliária usa é outro projeto: [`trustimovel-vite`](../trustimovel-vite/).
A visão geral dos três projetos está em [../CLAUDE.md](../CLAUDE.md).

---

## A ideia central: as telas são genéricas

Este painel tem **três páginas de conteúdo, não uma por cadastro**:

```
/:resource            → ResourceList.tsx    listagem
/:resource/adicionar  → ResourceForm.tsx    formulário de criação
/:resource/:id/editar → ResourceForm.tsx    formulário de edição
```

Quem decide o que cada uma mostra é [src/lib/resources.ts](src/lib/resources.ts). Cada item do array
`ADMIN_RESOURCES` descreve um cadastro — o endpoint da API, as colunas da listagem e os campos do
formulário — e disso saem automaticamente **o item de menu, a listagem com busca e paginação, o
formulário e o CRUD inteiro**.

Consequência prática: **para expor um cadastro novo, você acrescenta um objeto num array.** Não cria
página, não cria rota, não mexe no menu.

Escreva uma tela dedicada só quando o cadastro tiver regra que o motor genérico não cobre — etapas,
upload de arquivo, campos aninhados.

---

## Stack

React 18 · TypeScript · Vite 5 · React Router 6 · TanStack Query 5 · shadcn/ui sobre Radix ·
Tailwind · sonner.

Bem mais enxuto que o painel da imobiliária: só os componentes de UI que as telas genéricas usam.

```bash
npm install
cp .env.example .env   # VITE_API_BASE_URL apontando para a API
npm run dev            # http://localhost:8081
npm run build
npm run lint
```

---

## Estrutura

```text
src/
├── App.tsx                 # rotas + AdminLayout (sidebar, cabeçalho, logout)
├── components/
│   ├── AdminSidebar.tsx    # menu derivado de resources.ts, agrupado por `group`
│   ├── ProtectedRoute.tsx  # exige token E user.type === "ADMIN"
│   ├── RemoteCombobox.tsx  # select que busca no servidor (campos do tipo "relation")
│   ├── SessionExpiredListener.tsx
│   └── ui/                 # shadcn/ui
├── hooks/use-auth.ts       # logout, isAuthenticated, getUser
├── lib/
│   ├── api.ts              # ApiClient — cópia do que existe no painel da imobiliária
│   ├── auth.ts             # clearSession, notifyUnauthorized
│   ├── catalog.ts          # useCatalogList / useCatalogItem / useCatalogMutations
│   └── resources.ts        # ★ o catálogo de cadastros: é aqui que se trabalha
└── pages/
    ├── Login.tsx           # recusa quem não é ADMIN antes mesmo de entrar
    ├── Home.tsx            # /inicio
    ├── ResourceList.tsx    # listagem genérica
    └── ResourceForm.tsx    # formulário genérico
```

---

## Cadastros expostos hoje

Os grupos abaixo vêm do campo `group` de cada recurso e viram as seções do menu lateral.

| Grupo | Cadastro | Endpoint |
| --- | --- | --- |
| Contas | Imobiliárias | `/admin-web/agencies/` |
| Contas | Planos | `/admin-web/plans/` |
| Contas | Usuários | `/admin-web/users/` |
| Catálogos do imóvel | Tipos de imóvel | `/admin-web/property-types/` |
| Catálogos do imóvel | Infraestruturas | `/admin-web/features/` |
| Catálogos do imóvel | Taxas | `/admin-web/fees/` |
| Exportação | Exportadores | `/admin-web/exporters/` |
| Exportação | Planos de exportação | `/admin-web/exporter-plans/` |
| Endereços | Países | `/admin-web/countries/` |
| Endereços | Estados | `/admin-web/states/` |
| Endereços | Cidades | `/admin-web/cities/` |
| Endereços | Bairros | `/admin-web/neighborhoods/` |

Todos esses endpoints são servidos pelo app `admin_web` da API, que responde **401 para quem não é
`ADMIN`**.

---

## Fluxos

### 1. Acesso — a trava existe em três camadas

```
Login.tsx        POST /auth-user/ → se user.type !== "ADMIN", recusa e nem grava a sessão
ProtectedRoute   sem access_token ou sem type === "ADMIN" → redireciona para /login
API (admin_web)  AdminPermissionClass → 401 em qualquer requisição de não-ADMIN
```

As duas primeiras são conveniência de interface. **A que vale é a terceira** — a checagem no
frontend só evita que o usuário veja uma tela quebrada.

Sessão expirada segue o mesmo desenho do outro painel: 401 → `clearSession()` →
evento `auth:unauthorized` → `SessionExpiredListener` → `/login`.

### 2. Listagem (`ResourceList`)

```
useParams() dá o slug da URL
  → findResource(slug)                  acha o recurso em ADMIN_RESOURCES
  → useCatalogList(endpoint, {search, ordering, page})
       GET endpoint?search=&ordering=&page=   resposta paginada do DRF
  → renderiza uma coluna por item de `columns`
```

A coluna com `sortKey` ordena pelo cabeçalho, no servidor. Em relação o `sortKey` difere do
`field` mostrado (`plan_name` sai de `plan__name`), e ele precisa estar no `ordering_fields`
do ViewSet correspondente em `admin_web/views.py` — fora de lá o backend ignora o parâmetro.

O `renderValue` traduz o valor cru para exibição: booleano vira badge Sim/Não, campo com `options`
vira o rótulo correspondente (`PROPERTY` → *Imóvel*), vazio vira `—`.

Slug desconhecido cai no `NotFound` — é o que faz `/:resource` não engolir qualquer URL.

### 3. Formulário (`ResourceForm`)

Monta um campo por item de `fields`, conforme o `type`:

| `type` | Vira |
| --- | --- |
| `text`, `email`, `password`, `number` | input correspondente |
| `select` | select com as `options` declaradas |
| `switch` | interruptor booleano |
| `relation` | `RemoteCombobox`, que busca no `endpoint` do campo |

Modificadores que resolvem os casos chatos, todos declarativos:

- `onlyOnCreate` — o campo só aparece no cadastro (é assim que a senha inicial do usuário funciona).
- `dependsOn` + `filterParam` — relação filtrada por outro campo do próprio formulário: cidade só
  busca dentro do estado escolhido, enviando `?state=<id>`.
- `labelField` — de qual campo da resposta sai o rótulo da relação na tela de edição.
- `nullable` — número em branco vira `null` no payload, em vez de `0`.
- `feminine` (no recurso) — faz as mensagens concordarem: "Imobiliária crada" → "criada".

### 4. Gravação

Tudo passa por `useCatalogMutations` ([src/lib/catalog.ts](src/lib/catalog.ts)):

```
create  POST   endpoint
update  PATCH  endpoint{id}/
remove  DELETE endpoint{id}/     (soft delete no backend)
   └─ invalida a queryKey [endpoint] e mostra o toast
```

A invalidação por endpoint atinge de uma vez a listagem, o detalhe e qualquer `RemoteCombobox` que
leia o mesmo cadastro.

---

## Como acrescentar um cadastro

1. Na API: crie o `ViewSet` em `admin_web/views.py` herdando de `AdminViewSet` e registre em
   `admin_web/urls.py`.
2. Aqui: acrescente um item em `ADMIN_RESOURCES`.

```ts
{
  slug: "taxas",                       // vira a URL /taxas
  endpoint: "/admin-web/fees/",
  title: "Taxas",
  description: "Cobranças que podem ser lançadas no imóvel",
  singular: "Taxa",
  feminine: true,
  group: "Catálogos do imóvel",        // seção do menu; se não existe, é criada
  columns: [{ header: "Nome", field: "name" }],
  fields: [{ name: "name", label: "Nome", type: "text", required: true, maxLength: 80 }],
}
```

Menu, listagem, busca, paginação, formulário, validação de obrigatório, exclusão com confirmação e
mensagens: tudo sai pronto.

---

## Observações

- **`src/lib/api.ts` e `src/lib/auth.ts` são cópias** dos arquivos de mesmo nome em
  `trustimovel-vite`. Bug corrigido aqui provavelmente existe lá também.
- **`src/lib/catalog.ts` é uma versão reduzida** da do outro painel — mesma ideia, menos hooks.
- O `ADMIN_RESOURCES` é a fonte da verdade do menu. Não existe array de menu escrito à mão: o
  `AdminSidebar` chama `resourceGroups()`, que agrupa os recursos preservando a ordem de declaração.
