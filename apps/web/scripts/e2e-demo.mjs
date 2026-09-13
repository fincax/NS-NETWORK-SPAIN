// pnpm e2e · recorrido de humo de la demo privada: portada → candidatura → acceso → Hoy → tarjeta de Cesión. Requiere `next dev` en E2E_URL.
import { chromium } from "playwright";
const base = process.env.E2E_URL ?? "http://localhost:3113";
const user = process.env.DEMO_USER ?? "demo";
const password = process.env.DEMO_PASSWORD ?? "nscumbre";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const check = (cond, msg) => { if (!cond) { console.error("FALLO:", msg); process.exitCode = 1; } else console.log("ok ·", msg); };
try {
  await page.goto(`${base}/`);
  check(await page.locator("h1").first().innerText().then((t) => t.includes("Su agente sí")), "portada beta visible");
  await page.fill("#fn", "Prueba E2E"); await page.fill("#cn", "Empresa de Prueba"); await page.fill("#em", "prueba@example.com");
  await page.click("button:has-text('Presentar candidatura')");
  await page.waitForURL(/ok=1/);
  check(await page.locator("text=Recibido").count() > 0, "candidatura guardada y confirmada");
  await page.goto(`${base}/hoy`);
  await page.waitForURL(/\/acceso/);
  check(page.url().includes("/acceso"), "sin sesión, /hoy redirige a /acceso");
  await page.fill("#u", user); await page.fill("#p", "incorrecta"); await page.click("button:has-text('Entrar')");
  await page.waitForURL(/error=1/);
  check(await page.locator("text=incorrectos").count() > 0, "contraseña incorrecta rechazada");
  await page.fill("#u", user); await page.fill("#p", password); await page.click("button:has-text('Entrar')");
  await page.waitForURL(/\/hoy/);
  check(await page.locator("text=Beta privada").count() > 0, "sesión abierta y barra de beta visible en Hoy");
  const card = page.locator("a[href^='/cesiones/']").first();
  await card.click();
  await page.waitForURL(/\/cesiones\//);
  check(await page.locator("text=Promesa").count() > 0, "tarjeta de Cesión abierta con Promesa");
  await page.click("button:has-text('Salir')");
  await page.waitForURL((u) => new URL(u).pathname === "/");
  await page.goto(`${base}/mesa`);
  await page.waitForURL(/\/acceso/);
  check(page.url().includes("/acceso"), "tras salir, la demo vuelve a estar cerrada");
} catch (e) {
  console.error("FALLO:", e.message); process.exitCode = 1;
} finally {
  await browser.close();
}
