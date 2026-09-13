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
  // Apunte (D-037): captura en móvil y aparición en Hoy.
  check((await page.request.get(`${base}/manifest.webmanifest`)).status() === 200, "el manifest para 'añadir a inicio' se sirve sin sesión");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/hoy`);
  await page.click("a.fab");
  await page.waitForURL(/\/apunte/);
  await page.fill("#who", "Metalúrgica del Sur");
  await page.fill("#need", "abre planta nueva en Dos Hermanas y contrata 40 empleados, busca obra y seguros");
  await page.click("label:has-text('Es mi cliente')");
  await page.check("input[name='expectsContact']");
  await page.screenshot({ path: process.env.E2E_SHOT_APUNTE ?? "/tmp/apunte.png", fullPage: true });
  await page.click("button:has-text('Guardar en mi Agente')");
  await page.waitForURL(/ok=/);
  check(await page.locator("text=Ya está en la memoria de tu Agente").count() > 0, "Apunte guardado con la lectura del Agente");
  await page.screenshot({ path: process.env.E2E_SHOT_APUNTE_OK ?? "/tmp/apunte-ok.png", fullPage: true });
  await page.goto(`${base}/hoy`);
  check(await page.locator("text=Apunte · borrador").count() > 0, "el Apunte aparece en Hoy como borrador");
  await page.setViewportSize({ width: 1280, height: 900 });
  // Fuentes propias (D-038): alta desde el Dossier.
  await page.goto(`${base}/empresa/hispalis`);
  await page.fill("#fl", "Diario de prueba"); await page.fill("#fu", "https://prensa.example.com/rss");
  await page.click("button:has-text('Añadir fuente')");
  await page.waitForURL(/#fuentes/);
  check(await page.locator("text=Diario de prueba").count() > 0, "fuente propia añadida al Agente");
  await page.screenshot({ path: process.env.E2E_SHOT_FUENTES ?? "/tmp/fuentes.png", fullPage: true });
  // Antesala (D-035): solo la Directiva; despacho con un toque.
  await page.goto(`${base}/antesala`);
  check(await page.locator("text=Solo la Directiva").count() > 0, "un Timonel sin Directiva no ve las candidaturas");
  const directorOption = await page.locator("select[aria-label='Timonel activo (demo)'] option:has-text('Directiva')").first().getAttribute("value");
  await page.selectOption("select[aria-label='Timonel activo (demo)']", directorOption);
  await page.waitForTimeout(800);
  await page.goto(`${base}/antesala`);
  check(await page.locator("h1:has-text('Antesala')").count() > 0, "la Directiva ve la Antesala");
  check(await page.locator("text=Empresa de Prueba").count() > 0, "la candidatura de la portada aparece en la Antesala");
  const first = page.locator("article.cand:has(button:has-text('Contactada'))").first();
  const firstName = await first.locator("h3").innerText();
  await first.locator("button:has-text('Contactada')").click();
  await page.waitForURL(/vista=pendientes/);
  check(await page.locator(`article.cand:has(h3:text-is("${firstName}")) .badge:has-text("Contactada")`).count() > 0, "candidatura despachada con un toque");
  await page.screenshot({ path: process.env.E2E_SHOT ?? "/tmp/antesala.png", fullPage: true });
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
