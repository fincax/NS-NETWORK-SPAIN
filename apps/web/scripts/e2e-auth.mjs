// pnpm e2e:auth · recorrido de humo de las cuentas personales (D-042). Requiere `NS_AUTH_MODE=real next dev` en E2E_URL.
import { chromium } from "playwright";
const base = process.env.E2E_URL ?? "http://localhost:3114";
const password = process.env.NS_SEED_PASSWORD ?? "nscumbre-demo";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const check = (cond, msg) => { if (!cond) { console.error("FALLO:", msg); process.exitCode = 1; } else console.log("ok ·", msg); };
try {
  await page.goto(`${base}/hoy`);
  await page.waitForURL(/\/acceso/);
  check(await page.locator("#email").count() === 1, "en modo real, la puerta pide correo y contraseña personales");
  await page.fill("#email", "carlos@hispalis-industrial.es"); await page.fill("#p", "incorrecta"); await page.click("button:has-text('Entrar')");
  await page.waitForURL(/error=1/);
  check(await page.locator("text=incorrectos").count() > 0, "contraseña incorrecta rechazada");
  await page.fill("#email", "carlos@hispalis-industrial.es"); await page.fill("#p", password); await page.click("button:has-text('Entrar')");
  await page.waitForURL(/\/hoy/);
  check(await page.locator("h1:has-text('Carlos')").count() > 0, "Carlos entra con su cuenta y ve su Hoy");
  check(await page.locator("select[aria-label='Timonel activo (demo)']").count() === 0, "sin selector de persona en modo real");
  await page.goto(`${base}/antesala`);
  check(await page.locator("text=Solo la Directiva").count() > 0, "un Timonel sin Directiva no ve la Antesala");
  await page.goto(`${base}/cuenta`);
  check(await page.locator("text=Esta sesión").count() === 1, "Mi acceso lista la sesión abierta");
  await page.click("button:has-text('Salir')");
  await page.waitForURL((u) => new URL(u).pathname === "/");
  await page.goto(`${base}/hoy`);
  await page.waitForURL(/\/acceso/);
  check(page.url().includes("/acceso"), "tras salir, la sesión está cerrada");
  // Directiva: genera un enlace de acceso y el invitado fija su contraseña.
  await page.fill("#email", "ines@bufetealameda.es"); await page.fill("#p", password); await page.click("button:has-text('Entrar')");
  await page.waitForURL(/\/hoy/);
  await page.goto(`${base}/empresa/hispalis`);
  await page.click("button:has-text('Enlace de acceso para el Timonel')");
  await page.waitForURL(/invite=/);
  const link = await page.locator("code.invite-link").innerText();
  check(link.includes("/invitacion/"), "la Directiva obtiene un enlace de acceso de un solo uso");
  await page.click("button:has-text('Salir')");
  await page.waitForURL((u) => new URL(u).pathname === "/");
  const invitePath = new URL(link).pathname; // el enlace lleva la dirección pública; en pruebas se abre en el servidor local
  await page.goto(`${base}${invitePath}`);
  await page.fill("#p1", "clave-nueva-de-carlos"); await page.fill("#p2", "clave-nueva-de-carlos");
  await page.click("button:has-text('Activar mi acceso')");
  await page.waitForURL(/\/hoy/);
  check(await page.locator("h1:has-text('Carlos')").count() > 0, "el invitado fija su contraseña y entra");
  await page.goto(`${base}${invitePath}`);
  check(await page.locator("text=ya no sirve").count() > 0, "el enlace no se puede reutilizar");
} catch (e) {
  console.error("FALLO:", e.message); process.exitCode = 1;
} finally {
  await browser.close();
}
