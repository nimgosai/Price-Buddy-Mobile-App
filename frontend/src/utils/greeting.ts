export function greeting(): { salutation: string; subtitle: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { salutation: "Good morning", subtitle: "A fresh start — let's see what's ahead today." };
  if (h >= 12 && h < 17) return { salutation: "Good afternoon", subtitle: "Mid-day check-in — here's where things stand." };
  return { salutation: "Good evening", subtitle: "Winding down — quick scan before you log off?" };
}
