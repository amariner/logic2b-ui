import registryIndex from "../../public/r/index.json";

export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Component category slugs, in sidebar display order. */
const CATEGORY_ORDER = [
  "form",
  "data-display",
  "overlays",
  "navigation",
  "feedback",
  "layout",
  "motion",
  "guides",
] as const;

type CategorySlug = (typeof CATEGORY_ORDER)[number];

const CATEGORY_LABEL: Record<CategorySlug, string> = {
  form: "Form",
  "data-display": "Data Display",
  overlays: "Overlays",
  navigation: "Navigation",
  feedback: "Feedback",
  layout: "Layout",
  motion: "Motion & Scroll",
  guides: "Guides",
};

// Pages that have a docs page but no registry:ui item of their own — either
// compositions (date-picker, combobox) or recipes/guides (data-table,
// typography). Listed manually, with the category they slot into, so they
// stay discoverable in the grouped sidebar.
const EXTRA_PAGES: (NavItem & { category: CategorySlug })[] = [
  { title: "Combobox", href: "/docs/components/combobox", category: "overlays" },
  { title: "Data Table", href: "/docs/components/data-table", category: "data-display" },
  { title: "Date Picker", href: "/docs/components/date-picker", category: "form" },
  { title: "Typography", href: "/docs/components/typography", category: "guides" },
];

export interface NavGroup {
  slug: CategorySlug;
  title: string;
  items: NavItem[];
}

/** Registry `registry:ui` items grouped by their first `categories` entry,
 *  in `CATEGORY_ORDER`. Powers the collapsible Components sidebar. */
export function buildComponentGroups(): NavGroup[] {
  const byCategory = new Map<CategorySlug, NavItem[]>();

  for (const item of registryIndex) {
    if (item.type !== "registry:ui") continue;
    const category = (item.categories?.[0] as CategorySlug) ?? "guides";
    const nav: NavItem = {
      title:
        item.name.charAt(0).toUpperCase() +
        item.name.slice(1).replace(/-/g, " "),
      href: `/docs/components/${item.name}`,
    };
    byCategory.set(category, [...(byCategory.get(category) ?? []), nav]);
  }

  for (const page of EXTRA_PAGES) {
    byCategory.set(page.category, [
      ...(byCategory.get(page.category) ?? []),
      { title: page.title, href: page.href },
    ]);
  }

  return CATEGORY_ORDER.filter((slug) => byCategory.has(slug)).map((slug) => ({
    slug,
    title: CATEGORY_LABEL[slug],
    items: (byCategory.get(slug) ?? []).sort((a, b) =>
      a.title.localeCompare(b.title)
    ),
  }));
}

export const componentGroups: NavGroup[] = buildComponentGroups();

/** Spanish labels for component pages that have a localized content entry. */
export const SPANISH_COMPONENT_LABELS: Record<string, string> = {
  accordion: "Acordeón",
  alert: "Alerta",
  "alert-dialog": "Diálogo de alerta",
  autocomplete: "Autocompletado",
  avatar: "Avatar",
  badge: "Insignia",
  breadcrumb: "Migas de pan",
  button: "Botón",
  "button-group": "Grupo de botones",
  calendar: "Calendario",
  card: "Tarjeta",
  carousel: "Carrusel",
  chart: "Gráfico",
  checkbox: "Casilla de verificación",
  combobox: "Cuadro combinado",
  command: "Paleta de comandos",
  "data-table": "Tabla de datos",
  "date-picker": "Selector de fecha",
  dialog: "Diálogo",
  drawer: "Cajón deslizante",
  "dropdown-menu": "Menú desplegable",
  field: "Campo de formulario",
  form: "Formulario",
  input: "Campo de entrada",
  "input-group": "Grupo de entrada",
  "input-otp": "Entrada OTP",
  label: "Etiqueta",
  "native-select": "Selector nativo",
  "navigation-menu": "Menú de navegación",
  "number-field": "Campo numérico",
  pagination: "Paginación",
  popover: "Panel emergente",
  progress: "Progreso",
  "radio-group": "Grupo de opciones",
  rating: "Valoración",
  select: "Selector",
  separator: "Separador",
  sheet: "Panel lateral",
  sidebar: "Barra lateral",
  skeleton: "Esqueleto",
  slider: "Control deslizante",
  sonner: "Notificaciones Sonner",
  switch: "Interruptor",
  table: "Tabla",
  tabs: "Pestañas",
  "tags-input": "Entrada de etiquetas",
  textarea: "Área de texto",
  toggle: "Botón de alternancia",
  "toggle-group": "Grupo de alternancia",
  tooltip: "Descripción emergente",
};

export const docsNav: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Theming", href: "/docs/theming" },
      { title: "Cross-platform tokens", href: "/docs/cross-platform-tokens" },
      { title: "3D extras", href: "/docs/3d-extras" },
      { title: "Bring your own backend", href: "/docs/backend" },
      { title: "For LLMs & Agents", href: "/docs/llms" },
      { title: "Compare Integration Paths", href: "/docs/integration-paths" },
      { title: "Framework Benchmarks", href: "/docs/benchmarks" },
      { title: "Agent Benchmarks", href: "/docs/agent-benchmarks" },
    ],
  },
];

export const docsNavEs: NavSection[] = [
  {
    title: "Primeros pasos",
    items: [
      { title: "Introducción", href: "/es/docs" },
      { title: "Instalación", href: "/es/docs/installation" },
      { title: "Temas", href: "/es/docs/theming" },
      { title: "Tokens multiplataforma", href: "/es/docs/cross-platform-tokens" },
      { title: "Extras 3D", href: "/es/docs/3d-extras" },
      { title: "Conecta tu backend", href: "/es/docs/backend" },
      { title: "Para LLM y agentes", href: "/es/docs/llms" },
      { title: "Comparar integraciones", href: "/es/docs/integration-paths" },
      { title: "Benchmarks de frameworks", href: "/es/docs/benchmarks" },
      { title: "Benchmarks de agentes", href: "/es/docs/agent-benchmarks" },
      { title: "Documentación completa (English)", href: "/docs" },
    ],
  },
];
