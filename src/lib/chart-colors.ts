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
