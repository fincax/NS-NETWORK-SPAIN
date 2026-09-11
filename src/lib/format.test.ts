import { formatCircle, formatDayRange, formatEuro, formatEuroCompact, formatEuroRange, formatPercent, formatSince } from "./format";

describe("formatos NS", () => {
  it("cifras en euros con separador español y símbolo delante", () => {
    expect(formatEuro(42000)).toBe("€42.000");
    expect(formatEuroRange({ min: 42_000, max: 67_000, currency: "EUR" })).toBe("€42.000 – €67.000");
  });
  it("versión compacta para la card", () => {
    expect(formatEuroCompact(18_000)).toBe("€18K");
    expect(formatEuroCompact(1_500_000)).toBe("€1,5M");
    expect(formatEuroCompact(18_500)).toBe("€18.500");
    expect(formatEuroRange({ min: 18_000, max: 30_000, currency: "EUR" }, "compact")).toBe("€18K – €30K");
  });
  it("timing, score y círculo", () => {
    expect(formatDayRange({ min: 30, max: 60 })).toBe("30–60 días");
    expect(formatPercent(0.91)).toBe("91%");
    expect(formatCircle(1)).toBe("Círculo 01");
  });
  it("desde ayer 19:40 / hoy / fecha", () => {
    const now = new Date("2026-09-11T06:30:00Z"); // 08:30 Madrid
    expect(formatSince(new Date("2026-09-10T17:40:00Z"), now)).toBe("ayer 19:40");
    expect(formatSince(new Date("2026-09-11T05:15:00Z"), now)).toBe("hoy 07:15");
    expect(formatSince(new Date("2026-09-08T17:40:00Z"), now)).toMatch(/^mar,? 8 sept,? 19:40$/);
  });
});
