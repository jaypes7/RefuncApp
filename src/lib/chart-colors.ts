// Paleta de cores para gráficos — Guia de Estilos Manserv

export const MANSERV_CHART = {
  primary: "#ff460a",
  dark: "#232323",
  shade: "#9c3022",
  tint: "#ffa78b",
  lightTint: "#ffd7cc",
  navy: "#19365b",
  teal: "#416e7d",
  cream: "#e3d9a3",
  mauve: "#9e708b",
  gray: "#e2e2e2",
} as const;

export const MANSERV_STATUS = {
  danger: "#DA291B",
  warning: "#E5CF61",
  success: "#337246",
  na: "#e2e2e2",
} as const;

// Sequência ordenada para gráficos multi-série (pizza, barras agrupadas)
export const MANSERV_PIE_COLORS = [
  "#ff460a",
  "#19365b",
  "#416e7d",
  "#9c3022",
  "#ffa78b",
  "#e3d9a3",
  "#9e708b",
  "#232323",
  "#ffd7cc",
  "#e2e2e2",
];

export const CHART_GRID_COLOR = "#e2e2e2";

// Props padrão para eixos dos gráficos (Recharts)
export const CHART_AXIS_TICK = {
  fontSize: 10,
  fontFamily: "IBM Plex Sans",
  fontWeight: 300,
  fill: "#737373",
} as const;

// ─── Tokens de série ────────────────────────────────────────────────────────
// Nunca usar a cor default da lib de gráfico (Recharts/Chart.js). O default
// entrega azul berrante / verde neon e faz o app parecer dois produtos
// diferentes — ver ANALISE_PGV.md §5.2. Toda série puxa daqui.

/**
 * Papel semântico da série. O par planejado/realizado é o mais usado: planejado
 * é a referência (neutro, discreto) e realizado é o dado (cor de marca).
 */
export const CHART_SERIES = {
  // Estilo PGV adaptado à Manserv (ver ANALISE_PGV.md §8.3):
  // planejado é a referência ancorada na cor de marca; realizado é o dado
  // que caminha em cor contrastante. Ambas cheias, sem tracejar.
  planejado: MANSERV_CHART.primary,
  realizado: MANSERV_CHART.navy,
  previsto: MANSERV_CHART.navy,
  atrasado: MANSERV_STATUS.danger,
  concluido: MANSERV_STATUS.success,
  pendente: MANSERV_STATUS.warning,
  emAndamento: MANSERV_CHART.teal,
} as const;

/** Dasharray fino do grid (ver ANALISE_PGV.md §8.1). Usar em CartesianGrid. */
export const CHART_GRID_DASH = "2 4";

/**
 * Cores que precisam acompanhar o tema. Os gráficos usavam grays fixos do
 * Tailwind, que somem no dark. Estes leem os tokens de `globals.css`.
 */
export const CHART_THEME = {
  grid: "hsl(var(--border))",
  axis: "hsl(var(--muted-foreground))",
  label: "hsl(var(--foreground))",
  surface: "hsl(var(--card))",
  border: "hsl(var(--border))",
} as const;

/** Tick de eixo tema-aware — prefira este ao CHART_AXIS_TICK de fill fixo. */
export const CHART_AXIS_TICK_THEMED = {
  fontSize: 11,
  fontFamily: "var(--font-mono, monospace)",
  fill: CHART_THEME.axis,
} as const;
