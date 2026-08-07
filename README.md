# Elo Admin

Painel administrativo do sistema. Aqui ficam os cadastros que valem para **todas** as imobiliárias —
imobiliárias, usuários de qualquer conta e os catálogos globais (tipos de imóvel, infraestruturas,
taxas, exportadores e a base de endereços).

O painel da imobiliária é outro projeto: `trustimovel-vite`.

## Como rodar

```bash
npm install
cp .env.example .env   # aponte VITE_API_BASE_URL para a API
npm run dev            # http://localhost:8081
```

## Acesso

Só entra usuário com `type = ADMIN`. A restrição existe nas duas pontas: a tela recusa o login de
quem não é administrador e a API (`/admin-web/`) responde 401 para qualquer outro perfil.

## Como acrescentar um cadastro

As telas são genéricas: `ResourceList` e `ResourceForm` montam listagem e formulário a partir de
`src/lib/resources.ts`. Para expor um recurso novo do app `admin_web`, acrescente um item em
`ADMIN_RESOURCES` com o endpoint, as colunas da listagem e os campos do formulário — o menu lateral,
a busca, a paginação e o CRUD saem prontos.

Escreva uma tela dedicada apenas quando o cadastro tiver regra que a tela genérica não cobre
(etapas, upload de arquivo, campos aninhados).

## Estrutura

```text
src/
├── components/
│   ├── AdminSidebar.tsx     # menu montado a partir de resources.ts
│   ├── ProtectedRoute.tsx   # exige token e perfil ADMIN
│   └── ui/                  # shadcn/ui, igual ao painel da imobiliária
├── lib/
│   ├── api.ts               # cliente HTTP com JWT
│   ├── catalog.ts           # listagem e mutations de cadastro
│   └── resources.ts         # de onde vêm todas as telas
└── pages/
    ├── Home.tsx
    ├── Login.tsx
    ├── ResourceForm.tsx
    └── ResourceList.tsx
```

## Verificações

```bash
npx tsc --noEmit -p tsconfig.app.json
npx eslint .
npm run build
```
