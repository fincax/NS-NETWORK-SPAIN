import { greetingFor, greetingKindForHour, localHour } from "./greeting";

describe("greeting", () => {
  it("<13 buenos días, <21 buenas tardes, si no buenas noches", () => {
    expect(greetingKindForHour(0)).toBe("morning");
    expect(greetingKindForHour(12)).toBe("morning");
    expect(greetingKindForHour(13)).toBe("afternoon");
    expect(greetingKindForHour(20)).toBe("afternoon");
    expect(greetingKindForHour(21)).toBe("night");
    expect(greetingKindForHour(23)).toBe("night");
  });

  it("usa la hora de Sevilla, no la del servidor", () => {
    // 2026-09-11T06:30Z = 08:30 en Europe/Madrid (CEST)
    const d = new Date("2026-09-11T06:30:00Z");
    expect(localHour(d, "Europe/Madrid")).toBe(8);
    expect(greetingFor(d)).toBe("Buenos días");
    // 2026-09-11T19:30Z = 21:30 en Madrid → noches
    expect(greetingFor(new Date("2026-09-11T19:30:00Z"))).toBe("Buenas noches");
  });
});
