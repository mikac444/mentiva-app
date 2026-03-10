// Area colors for dot indicators (replaces emojis)
export const AREA_COLORS: Record<string, string> = {
  business: "#9DB48C", negocio: "#9DB48C",
  health: "#BBCBA8", salud: "#BBCBA8",
  finance: "#6B7E5C", finanzas: "#6B7E5C",
  relationships: "#D8D3C6", relaciones: "#D8D3C6",
  learning: "#A1B392", aprendizaje: "#A1B392",
  creative: "#9CAF88", creativo: "#9CAF88",
  routine: "#B5BFAD", rutina: "#B5BFAD",
  wellness: "#CDDABA", bienestar: "#CDDABA",
  career: "#7E8C74", carrera: "#7E8C74",
  spiritual: "#D8D3C6", espiritual: "#D8D3C6",
  travel: "#A1B392", viajes: "#A1B392",
  home: "#9CAF88", hogar: "#9CAF88",
  other: "#9DA894", otro: "#9DA894",
};

export function getAreaColor(area: string): string {
  const key = area.toLowerCase().trim();
  return AREA_COLORS[key] ?? "#9DA894";
}

export const ENFOQUE_COLORS = [
  "#9DB48C",
  "#BBCBA8",
  "#D8D3C6",
  "#A1B392",
  "#6B7E5C",
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
