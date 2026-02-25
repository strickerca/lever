export function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatHeight(meters: number, unit: "cm" | "inches" = "cm"): string {
  if (unit === "inches") {
    const totalInches = meters * 39.3701;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(meters * 100)} cm`;
}

export function formatWeight(kg: number, unit: "kg" | "lbs" = "kg"): string {
  if (unit === "lbs") {
    return `${Math.round(kg * 2.20462)} lbs`;
  }
  return `${Math.round(kg)} kg`;
}

export function formatLiftFamily(family: string): string {
  const labels: Record<string, string> = {
    squat: "Squat",
    deadlift: "Deadlift",
    bench: "Bench",
    pullup: "Pull-up",
    pushup: "Push-up",
    ohp: "OHP",
    thruster: "Thruster",
  };
  return labels[family] ?? family;
}
