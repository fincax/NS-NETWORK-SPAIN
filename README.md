# NS Network Spain

**Agentic Business Referral Network.** Un club privado de empresas donde cada miembro dispone de un agente de IA que representa sus intereses comerciales y trabaja 24/7 junto a los agentes de las demás empresas para descubrir, cualificar y facilitar negocio entre ellas.

> Tu empresa no hace networking. Su agente sí. 24/7.

Primera implantación: **NS Sevilla**, un círculo, una empresa por especialidad.

## Estado del proyecto

**Fase 0 · Fundación → primer código.** Además de la constitución y los documentos fundacionales, el repositorio contiene la app de miembro (Next.js + TypeScript) con la identidad **"El Encuentro"**, los tokens del design system Modernist y la pantalla **Hoy** de NS Sevilla · Círculo 01 con sus estados (carga, vacío, error). Datos demo del Escenario A de NS-ARP; sin backend ni autenticación todavía.

## Ejecutar la app

```bash
npm install
npm run dev        # http://localhost:3000 → /hoy
npm run check      # typecheck + lint + tests + build
```

Estados demo de Hoy: `/hoy?demo=sin-referidos` (cero rojo) · `?demo=agente-parado` · `?demo=cargando` (arranque) · `?demo=error`.

```text
src/
├── app/                 rutas (App Router): /hoy con loading (arranque) y error; pestañas pendientes
├── components/brand/    NSMark (estados del agente) y Lockup
├── components/hoy/      HoyScreen, ReferralCard, TabBar, Splash
├── domain/              tipos alineados con NS-ARP, saludo, estado del agente
├── demo/                NS Sevilla · Círculo 01 · Carlos / Híspalis / Escenario A
└── lib/                 formatos y carga de la vista Hoy
```

## Documentación

| Documento | Contenido |
| --- | --- |
| [`CLAUDE.md`](./CLAUDE.md) | Constitución maestra de producto. Contexto, rol, forma de trabajo, principios no negociables. |
| [`docs/00_NORTH_STAR.md`](./docs/00_NORTH_STAR.md) | Tesis, mantra, métrica primaria, moat y principios. |
| [`docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`](./docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md) | NS-ARP v0.1: objetos, mensajes agente-a-agente, visibilidad y permisos, NS Match Score, máquina de estados, puertas humanas, auditoría, escenarios de referencia. |
| [`docs/05_DESIGN_BRIEF.md`](./docs/05_DESIGN_BRIEF.md) | Brief para Claude Design: identidad, logo, dirección visual, pantallas prioritarias, datos demo y entregables. Su foundation cromática queda superada por D-009. |
| [`docs/05_DESIGN_SYSTEM.md`](./docs/05_DESIGN_SYSTEM.md) | Design system Modernist e identidad "El Encuentro": tokens, marca y estados del agente, lockups, pantallas Hoy y arranque. |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Registro de decisiones estratégicas y arquitectónicas. |

Documentos pendientes según la constitución: `01_PRODUCT_REQUIREMENTS`, `03_USER_ROLES`, `04_INFORMATION_ARCHITECTURE`, `06_DATA_MODEL`, `07_AGENT_ARCHITECTURE`, `08_SECURITY_PRIVACY_GDPR`, `09_ANALYTICS`, `10_ROADMAP`.

## Cómo trabajar en este repositorio

1. Leer `CLAUDE.md` completo antes de cualquier cambio.
2. Comprobar `docs/DECISIONS.md`. Las decisiones registradas prevalecen sobre el texto general de la constitución.
3. Toda feature agentic se especifica contra `docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`.
4. Toda decisión estructural nueva se registra en `docs/DECISIONS.md` antes de implementarla.

## Mantra

**Human trust. Agentic execution. Business without idle time.**
