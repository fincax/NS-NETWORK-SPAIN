import { renderToStaticMarkup } from "react-dom/server";
import { NSMark } from "./NSMark";

describe("NSMark · El Encuentro", () => {
  it("brand: posición abierta, trazo 3, dos mitades en tinta", () => {
    const html = renderToStaticMarkup(<NSMark />);
    expect(html).toContain('stroke-width="3"');
    expect(html).toContain('transform="translate(-1.75 4)"');
    expect(html).toContain('transform="translate(1.75 -4)"');
    expect(html).not.toContain("var(--color-accent)");
  });
  it("idle: mitades casi alineadas", () => {
    const html = renderToStaticMarkup(<NSMark state="idle" />);
    expect(html).toContain('transform="translate(-0.5 0)"');
    expect(html).toContain('transform="translate(0.5 0)"');
  });
  it("analyzing: anima ambas mitades sin acento", () => {
    const html = renderToStaticMarkup(<NSMark state="analyzing" />);
    expect(html).toContain("ns-half-left");
    expect(html).toContain("ns-half-right");
    expect(html).not.toContain("var(--color-accent)");
  });
  it("found: línea de contacto roja", () => {
    const html = renderToStaticMarkup(<NSMark state="found" />);
    expect(html).toContain('<rect x="15.25" y="8" width="1.5" height="16" fill="var(--color-accent)"');
  });
  it("waiting: mitad derecha en acento, izquierda en tinta", () => {
    const html = renderToStaticMarkup(<NSMark state="waiting" />);
    expect(html.match(/var\(--color-accent\)/g)).toHaveLength(1);
    expect(html).not.toContain("<rect");
  });
  it("watermark: trazo 0.6", () => {
    expect(renderToStaticMarkup(<NSMark watermark />)).toContain('stroke-width="0.6"');
  });
});
