/** All money is stored as integer minor units (paisa). Never floats. */

export const CURRENCY_SYMBOL: Record<string, string> = {
  NPR: "Rs",
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
};

export function toMinor(input: string | number): number {
  const raw = typeof input === "number" ? input.toFixed(2) : input.trim();
  if (!raw) return 0;
  const negative = raw.startsWith("-");
  const clean = raw.replace(/[^0-9.]/g, "");
  const [whole = "0", frac = ""] = clean.split(".");
  const cents = (frac + "00").slice(0, 2);
  const value = Number(whole || "0") * 100 + Number(cents || "0");
  return negative ? -value : value;
}

export function toMajor(minor: number): number {
  return minor / 100;
}

export function formatMinor(minor: number, currency = "NPR", opts?: { sign?: boolean }): string {
  const symbol = CURRENCY_SYMBOL[currency] ?? currency;
  const abs = Math.abs(minor);
  const body = (abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: abs % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  const sign = minor < 0 ? "−" : opts?.sign && minor > 0 ? "+" : "";
  return `${sign}${symbol} ${body}`;
}

/** Split `total` into `n` parts with no lost paisa. Remainder goes to the first parts. */
export function splitEvenly(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const remainder = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function splitByWeights(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return splitEvenly(total, weights.length);
  const raw = weights.map((w) => Math.floor((total * w) / sum));
  let remainder = total - raw.reduce((a, b) => a + b, 0);
  let i = 0;
  while (remainder > 0 && raw.length) {
    raw[i % raw.length] = (raw[i % raw.length] ?? 0) + 1;
    remainder -= 1;
    i += 1;
  }
  return raw;
}
