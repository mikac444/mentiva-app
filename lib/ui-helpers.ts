export const AREA_EMOJI: Record<string, string> = {
  business: "\u{1F4BC}", negocio: "\u{1F4BC}",
  health: "\u{1F4AA}", salud: "\u{1F4AA}",
  finance: "\u{1F4B0}", finanzas: "\u{1F4B0}",
  relationships: "\u2764\uFE0F", relaciones: "\u2764\uFE0F",
  learning: "\u{1F4DA}", aprendizaje: "\u{1F4DA}",
  creative: "\u{1F3A8}", creativo: "\u{1F3A8}",
  routine: "\u{1F305}", rutina: "\u{1F305}",
  wellness: "\u{1F9D8}", bienestar: "\u{1F9D8}",
  career: "\u{1F4C8}", carrera: "\u{1F4C8}",
  spiritual: "\u{1F64F}", espiritual: "\u{1F64F}",
  travel: "\u2708\uFE0F", viajes: "\u2708\uFE0F",
  home: "\u{1F3E0}", hogar: "\u{1F3E0}",
  other: "\u2728", otro: "\u2728",
};

export function getEmoji(area: string): string {
  const key = area.toLowerCase().trim();
  return AREA_EMOJI[key] ?? "\u2728";
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
