/**
 * Catálogo de cadastros do painel administrativo.
 *
 * Cada item aqui vira automaticamente um menu, uma listagem e um formulário — as telas
 * são genéricas. Para expor um cadastro novo do app admin_web basta acrescentar um item.
 */

export type FieldType = "text" | "email" | "password" | "number" | "select" | "switch" | "relation";

export interface FieldOption {
  value: string;
  label: string;
}

export interface ResourceField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  /** Texto de apoio abaixo do campo. */
  help?: string;
  /** Opções do select. */
  options?: FieldOption[];
  /** Endpoint do combobox quando o campo é uma relação. */
  endpoint?: string;
  /** Campo da resposta que traz o rótulo da relação, para a tela de edição. */
  labelField?: string;
  /** Campo do formulário que filtra a busca da relação, ex.: cidade depende de estado. */
  dependsOn?: string;
  /** Nome do parâmetro enviado ao endpoint da relação, ex.: `state`. */
  filterParam?: string;
  /** Campos que só fazem sentido no cadastro, como a senha inicial. */
  onlyOnCreate?: boolean;
  /** Número que pode ficar em branco: o payload envia null em vez de 0. */
  nullable?: boolean;
  defaultValue?: string | boolean;
}

export interface ResourceColumn {
  header: string;
  field: string;
  /** Traduz o valor gravado para o rótulo mostrado, ex.: PROPERTY -> Imóvel. */
  options?: FieldOption[];
}

export interface AdminResource {
  /** Trecho da URL do painel e chave do menu. */
  slug: string;
  endpoint: string;
  title: string;
  description: string;
  /** Nome no singular, usado nas mensagens. */
  singular: string;
  /** Marca o nome como feminino, para as mensagens concordarem ("criada"). */
  feminine?: boolean;
  /** Agrupamento no menu lateral. */
  group: string;
  columns: ResourceColumn[];
  fields: ResourceField[];
}

const USER_TYPES: FieldOption[] = [
  { value: "USER", label: "Usuário" },
  { value: "ADMIN", label: "Administrador" },
];

const FEATURE_TYPES: FieldOption[] = [
  { value: "PROPERTY", label: "Imóvel" },
  { value: "CONDOMINIUM", label: "Condomínio" },
];

export const ADMIN_RESOURCES: AdminResource[] = [
  {
    slug: "imobiliarias",
    endpoint: "/admin-web/agencies/",
    title: "Imobiliárias",
    description: "Empresas que usam o sistema",
    singular: "Imobiliária",
    feminine: true,
    group: "Contas",
    columns: [
      { header: "Nome", field: "name" },
      { header: "E-mail", field: "email" },
      { header: "Telefone", field: "phone" },
      { header: "Plano", field: "plan_name" },
      { header: "Ativa", field: "is_active" },
    ],
    fields: [
      { name: "name", label: "Nome", type: "text", required: true, maxLength: 100 },
      { name: "email", label: "E-mail", type: "email", maxLength: 255 },
      { name: "phone", label: "Telefone", type: "text", maxLength: 20 },
      { name: "site", label: "Site", type: "text", maxLength: 200 },
      {
        name: "plan",
        label: "Plano",
        type: "relation",
        endpoint: "/admin-web/plans/",
        labelField: "plan_name",
        help: "Plano contratado, com os limites de imóveis e fotos da imobiliária.",
      },
      {
        name: "is_active",
        label: "Ativa",
        type: "switch",
        defaultValue: true,
        help: "Uma imobiliária inativa continua cadastrada, mas não deve operar no sistema.",
      },
    ],
  },
  {
    slug: "planos",
    endpoint: "/admin-web/plans/",
    title: "Planos",
    description: "Limites de imóveis e fotos por imobiliária",
    singular: "Plano",
    group: "Contas",
    columns: [
      { header: "Nome", field: "name" },
      { header: "Limite de imóveis", field: "property_limit" },
      { header: "Limite de fotos", field: "photo_limit" },
    ],
    fields: [
      { name: "name", label: "Nome", type: "text", required: true, maxLength: 100 },
      {
        name: "property_limit",
        label: "Limite de imóveis",
        type: "number",
        nullable: true,
        help: "Deixe em branco para não limitar a quantidade de imóveis.",
      },
      {
        name: "photo_limit",
        label: "Limite de fotos",
        type: "number",
        nullable: true,
        help: "Deixe em branco para não limitar a quantidade de fotos.",
      },
    ],
  },
  {
    slug: "usuarios",
    endpoint: "/admin-web/users/",
    title: "Usuários",
    description: "Acessos ao sistema, de todas as imobiliárias",
    singular: "Usuário",
    group: "Contas",
    columns: [
      { header: "Nome", field: "name" },
      { header: "E-mail", field: "email" },
      { header: "Imobiliária", field: "agency_name" },
      { header: "Perfil", field: "type", options: USER_TYPES },
      { header: "Ativo", field: "is_active" },
    ],
    fields: [
      { name: "email", label: "E-mail", type: "email", required: true, maxLength: 255 },
      { name: "name", label: "Nome", type: "text", maxLength: 255 },
      {
        name: "agency",
        label: "Imobiliária",
        type: "relation",
        endpoint: "/admin-web/agencies/",
        labelField: "agency_name",
        help: "Deixe em branco apenas para administradores do sistema.",
      },
      { name: "type", label: "Perfil", type: "select", options: USER_TYPES, defaultValue: "USER" },
      { name: "is_active", label: "Ativo", type: "switch", defaultValue: true },
      {
        name: "password",
        label: "Senha",
        type: "password",
        required: true,
        help: "Na edição, preencha somente se quiser trocar a senha.",
      },
    ],
  },
  {
    slug: "tipos-de-imovel",
    endpoint: "/admin-web/property-types/",
    title: "Tipos de imóvel",
    description: "Casa, apartamento, terreno e afins",
    singular: "Tipo de imóvel",
    group: "Catálogos do imóvel",
    columns: [{ header: "Nome", field: "name" }],
    fields: [{ name: "name", label: "Nome", type: "text", required: true, maxLength: 100 }],
  },
  {
    slug: "infraestruturas",
    endpoint: "/admin-web/features/",
    title: "Infraestruturas",
    description: "Itens de infraestrutura do imóvel e do condomínio",
    singular: "Infraestrutura",
    feminine: true,
    group: "Catálogos do imóvel",
    columns: [
      { header: "Nome", field: "name" },
      { header: "Aparece em", field: "type", options: FEATURE_TYPES },
    ],
    fields: [
      { name: "name", label: "Nome", type: "text", required: true, maxLength: 120 },
      {
        name: "type",
        label: "Aparece em",
        type: "select",
        options: FEATURE_TYPES,
        defaultValue: "PROPERTY",
        help: "Define em qual cadastro a infraestrutura fica disponível.",
      },
    ],
  },
  {
    slug: "taxas",
    endpoint: "/admin-web/fees/",
    title: "Taxas",
    description: "Condomínio, IPTU e outras taxas do imóvel",
    singular: "Taxa",
    feminine: true,
    group: "Catálogos do imóvel",
    columns: [{ header: "Nome", field: "name" }],
    fields: [{ name: "name", label: "Nome", type: "text", required: true, maxLength: 120 }],
  },
  {
    slug: "exportadores",
    endpoint: "/admin-web/exporters/",
    title: "Exportadores",
    description: "Portais que recebem os imóveis",
    singular: "Exportador",
    group: "Exportação",
    columns: [
      { header: "Nome", field: "name" },
      { header: "Identificador", field: "slug" },
      { header: "Ativo", field: "is_active" },
    ],
    fields: [
      { name: "name", label: "Nome", type: "text", required: true, maxLength: 120 },
      {
        name: "slug",
        label: "Identificador",
        type: "text",
        maxLength: 120,
        placeholder: "zap-imoveis",
        help: "Identifica o portal na URL de exportação. Em branco, é gerado a partir do nome.",
      },
      {
        name: "is_active",
        label: "Ativo",
        type: "switch",
        defaultValue: true,
        help: "Um portal inativo não aparece para as imobiliárias ativarem.",
      },
    ],
  },
  {
    slug: "planos-de-exportacao",
    endpoint: "/admin-web/exporter-plans/",
    title: "Planos de exportação",
    description: "Planos oferecidos por cada portal",
    singular: "Plano",
    group: "Exportação",
    columns: [
      { header: "Portal", field: "exporter_name" },
      { header: "Plano", field: "name" },
      { header: "Ordem", field: "position" },
    ],
    fields: [
      {
        name: "exporter",
        label: "Portal",
        type: "relation",
        required: true,
        endpoint: "/admin-web/exporters/",
        labelField: "exporter_name",
      },
      { name: "name", label: "Nome do plano", type: "text", required: true, maxLength: 60 },
      {
        name: "position",
        label: "Ordem",
        type: "number",
        defaultValue: "0",
        help: "Define a posição do plano na tela de cadastro do imóvel.",
      },
    ],
  },
  {
    slug: "paises",
    endpoint: "/admin-web/countries/",
    title: "Países",
    description: "Base do endereço",
    singular: "País",
    group: "Endereços",
    columns: [
      { header: "Nome", field: "name" },
      { header: "Sigla", field: "code" },
    ],
    fields: [
      { name: "name", label: "Nome", type: "text", required: true, maxLength: 80 },
      {
        name: "code",
        label: "Sigla",
        type: "text",
        required: true,
        maxLength: 3,
        placeholder: "BRA",
      },
    ],
  },
  {
    slug: "estados",
    endpoint: "/admin-web/states/",
    title: "Estados",
    description: "Estados de cada país",
    singular: "Estado",
    group: "Endereços",
    columns: [
      { header: "Nome", field: "name" },
      { header: "UF", field: "abbreviation" },
      { header: "País", field: "country_name" },
    ],
    fields: [
      {
        name: "country",
        label: "País",
        type: "relation",
        required: true,
        endpoint: "/admin-web/countries/",
        labelField: "country_name",
      },
      { name: "name", label: "Nome", type: "text", required: true, maxLength: 80 },
      {
        name: "abbreviation",
        label: "UF",
        type: "text",
        required: true,
        maxLength: 4,
        placeholder: "RJ",
      },
    ],
  },
  {
    slug: "cidades",
    endpoint: "/admin-web/cities/",
    title: "Cidades",
    description: "Municípios de cada estado",
    singular: "Cidade",
    feminine: true,
    group: "Endereços",
    columns: [
      { header: "Nome", field: "name" },
      { header: "Estado", field: "state_name" },
      { header: "Código IBGE", field: "ibge_code" },
    ],
    fields: [
      {
        name: "state",
        label: "Estado",
        type: "relation",
        required: true,
        endpoint: "/admin-web/states/",
        labelField: "state_name",
      },
      { name: "name", label: "Nome", type: "text", required: true, maxLength: 120 },
      {
        name: "ibge_code",
        label: "Código IBGE",
        type: "text",
        required: true,
        maxLength: 7,
        placeholder: "3304557",
      },
    ],
  },
  {
    slug: "bairros",
    endpoint: "/admin-web/neighborhoods/",
    title: "Bairros",
    description: "Bairros de cada cidade",
    singular: "Bairro",
    group: "Endereços",
    columns: [
      { header: "Nome", field: "name" },
      { header: "Cidade", field: "city_name" },
      { header: "UF", field: "state_abbreviation" },
    ],
    fields: [
      {
        name: "city",
        label: "Cidade",
        type: "relation",
        required: true,
        endpoint: "/admin-web/cities/",
        labelField: "city_name",
      },
      { name: "name", label: "Nome", type: "text", required: true, maxLength: 120 },
    ],
  },
];

export const findResource = (slug?: string): AdminResource | undefined =>
  ADMIN_RESOURCES.find((resource) => resource.slug === slug);

/** Menu lateral: os grupos aparecem na ordem em que surgem na lista de recursos. */
export const resourceGroups = (): { group: string; resources: AdminResource[] }[] => {
  const groups: { group: string; resources: AdminResource[] }[] = [];

  for (const resource of ADMIN_RESOURCES) {
    const existing = groups.find((item) => item.group === resource.group);

    if (existing) {
      existing.resources.push(resource);
      continue;
    }

    groups.push({ group: resource.group, resources: [resource] });
  }

  return groups;
};
