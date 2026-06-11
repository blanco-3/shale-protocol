/** Map a tone name to its CSS variable string. */
export function shaleToneVar(tone: string): string {
  switch (tone) {
    case "core":    return "var(--core-600)";
    case "seam":    return "var(--seam-600)";
    case "apex":    return "var(--apex-600)";
    case "ink":     return "var(--rock-900)";
    case "accent":  return "var(--accent-600)";
    case "warning": return "var(--warning)";
    case "danger":  return "var(--danger)";
    case "positive":return "var(--positive)";
    default:        return "var(--rock-900)";
  }
}
