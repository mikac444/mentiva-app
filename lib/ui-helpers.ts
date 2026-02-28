// Area colors for dot indicators (replaces emojis)
export const AREA_COLORS: Record<string, string> = {
  business: "#D4BE8C", negocio: "#D4BE8C",
  health: "#8CB39A", salud: "#8CB39A",
  finance: "#C4A86B", finanzas: "#C4A86B",
  relationships: "#B3A18C", relaciones: "#B3A18C",
  learning: "#A1B392", aprendizaje: "#A1B392",
  creative: "#9CAF88", creativo: "#9CAF88",
  routine: "#D4BE8C", rutina: "#D4BE8C",
  wellness: "#8CB39A", bienestar: "#8CB39A",
  career: "#C4A86B", carrera: "#C4A86B",
  spiritual: "#B3A18C", espiritual: "#B3A18C",
  travel: "#A1B392", viajes: "#A1B392",
  home: "#9CAF88", hogar: "#9CAF88",
  other: "#D4BE8C", otro: "#D4BE8C",
};

export function getAreaColor(area: string): string {
  const key = area.toLowerCase().trim();
  return AREA_COLORS[key] ?? "#D4BE8C";
}

export const ENFOQUE_COLORS = [
  "#D4BE8C",
  "#8CB39A",
  "#B3A18C",
  "#A1B392",
  "#C4A86B",
  "#9CAF88",
];

export function getEnfoqueColor(index: number): string {
  return ENFOQUE_COLORS[index % ENFOQUE_COLORS.length];
}

export const TASK_TYPE_CONFIG = {
  non_negotiable: {
    color: "#E57373",
    labelEn: "Non-negotiable",
    labelEs: "No negociable",
  },
  secondary: {
    color: "#FFD54F",
    labelEn: "Secondary",
    labelEs: "Secundaria",
  },
  micro: {
    color: "#81C784",
    labelEn: "Quick win",
    labelEs: "Victoria r\u00E1pida",
  },
} as const;
