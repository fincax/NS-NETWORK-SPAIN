# 05 · Design System · "Modernist" e identidad "El Encuentro"

**Versión:** 0.1 · 2026-09-11
**Origen:** handoff de Claude Design (tablero `NS Hoy.dc.html`, turnos t1–t5; aprobados **3a**, **4b**, **5a**, **5b**) y su `styles.css`.
**Fuente de verdad en código:** `src/app/globals.css` (tokens) · `src/components/brand/` (marca) · `src/components/hoy/` (Hoy).
**Sustituye** a la foundation cromática del brief `05_DESIGN_BRIEF.md` §4.3 (ver `DECISIONS.md` · D-009).

---

## 1. Sistema visual

**Modernist.** Plano, retícula visible, radio 0, reglas de 2 px entre secciones y de 1 px dentro de ellas, todo alineado a la izquierda, **Archivo** como única familia tipográfica, **un solo acento (rojo)** y tinta sobre fondo claro.

La semántica del brief (verde señal / ámbar valor) **no se usa**. El acento, el peso tipográfico y las reglas llevan la semántica:

- **Rojo = estado**, nunca decoración ni color de marca. Si no hay referido pendiente, no hay rojo en la pantalla.
- El texto de párrafo en acento usa `accent-700` (contraste AA), no el acento base.

## 2. Tokens

### Color

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-bg` | `#f3f2f2` | fondo de página |
| `--color-surface` | `#eae9e9` | cards |
| `--color-text` | `#201e1d` | tinta |
| `--color-accent` | `#ec3013` | estado, CTA primario, cifra del referido |
| `--color-divider` | `rgba(32,30,29,.4)` | reglas |

Neutral 100–900: `#f8f4f4 #eae7e7 #d7d3d3 #bab6b6 #9b9797 #7d7979 #605d5d #444141 #2d2b2b`
Accent 100–900: `#fff2ef #ffe0d9 #ffc4b8 #ff9783 #ff563c #dd2b0f #ae1800 #7c1405 #4d170e`

Ramps generadas en OKLCH sobre una misma escala de luminosidad: el mismo paso de cualquier rol tiene el mismo valor visual.

### Tipografía

- **Archivo** 400 · 600 · 800 (Google Fonts, licencia OFL). Cargada con `next/font` y expuesta como `--font-archivo`.
- Cifras siempre `font-variant-numeric: tabular-nums`.
- Titulares: 800, `letter-spacing −0.02em`, `line-height 1.05–1.15`.
- Wordmark: 600, `−0.02em`, `line-height 1`.
- Kickers: 10 px, uppercase, `letter-spacing 0.1em`, `neutral-700`.

### Espaciado, radio, reglas, sombras, motion

- Espaciado: 4 · 8 · 12 · 16 · 24 · 32. Márgenes laterales de la app móvil: **20 px**.
- Radio: **0** en todo. El SO redondea el app icon; nosotros no.
- Reglas: 2 px (`divider`) entre secciones, 1 px dentro.
- Sombras: sm `0 1px 2px rgba(45,43,43,.14)` · md `0 3px 10px rgba(45,43,43,.16)` · lg `0 12px 32px rgba(45,43,43,.22)`.
- Motion: **solo se anima el hueco de contacto de la marca.** 2,4 s en UI, 4 s en el arranque, `ease-in-out`. `prefers-reduced-motion` desactiva toda animación.
- Focus visible: `outline 2px solid accent, offset 2px`. Área táctil mínima 44 px.

## 3. Identidad · "El Encuentro"

### Concepto

Un círculo (el club: 30 plazas, completo) partido verticalmente en dos mitades que se desplazan en sentidos opuestos y forman una S. Dos empresas, dos agentes, que **se tocan sin fundirse**. El hueco de contacto es el único elemento que la app anima.

### Geometría (viewBox 0 0 32)

- Círculo centro (16,16), r = 12.
- Mitad izquierda `M16 4 A12 12 0 0 0 16 28 Z`, trasladada **(−1.75, +4)**.
- Mitad derecha `M16 4 A12 12 0 0 1 16 28 Z`, trasladada **(+1.75, −4)**.
- Versión aprobada (4b): **sin relleno, trazo 3 u**, miter. Hueco de contacto 3,5 u. Desplazamiento vertical = 1/3 r (máximo permitido).
- Versión de reserva (bordado, grabado): relleno sólido con desplazamiento (±1.25, ∓4), sin trazo.

```svg
<svg viewBox="0 0 32 32" fill="none" stroke="#201e1d" stroke-width="3">
  <path d="M16 4A12 12 0 0 0 16 28Z" transform="translate(-1.75 4)"/>
  <path d="M16 4A12 12 0 0 1 16 28Z" transform="translate(1.75 -4)"/>
</svg>
```

Componente: `NSMark` (`src/components/brand/NSMark.tsx`).

### Estados del avatar del agente

Mismo dibujo; solo cambia posición o color.

| `state` | Nombre | Geometría | Color |
| --- | --- | --- | --- |
| `brand` | Marca | abierta (S) | tinta |
| `idle` | En reposo | mitades casi alineadas (±0.5, 0) | tinta |
| `analyzing` | Analizando | oscila entre (0,0) y (∓1.75, ±4), 2,4 s infinito | tinta, sin acento |
| `found` | Ha encontrado algo | abierta + línea de contacto roja (`rect x15.25 y8 w1.5 h16`) | tinta + acento |
| `waiting` | Espera tu decisión | abierta, fija, sin pulso | izquierda tinta, **derecha acento** |

Uso en Hoy (tal como está aprobado en 5a): cabecera → `analyzing` si el agente trabaja, `waiting` si no y hay referido pendiente, `idle` si no hay nada; fila del ledger y kicker de la card → `waiting` (el referido espera tu decisión); pestaña Agente → `brand` en `currentColor`. `found` se reserva al instante de la detección (Agent Room, notificación).

### Versiones de color

Positivo (tinta sobre fondo), negativo (fondo sobre tinta), sobre acento (fondo sobre rojo), "activa" (estados). **Nunca la marca entera en rojo.**

### Lockups

- Marca + wordmark **NS Network / NS España / NS Sevilla** (Archivo 600, −0.02em, lh 1). La marca no cambia entre niveles; solo la palabra.
- Sufijo de círculo: `Círculo 01` en 10–11 px uppercase 0.1em `neutral-700`, regla vertical de 2 px a la izquierda, padding-left 8–10 px.
- Proporción: marca = 1.1–1.3× la fuente del wordmark (28/18 en la cabecera de la app; 24/22 en papelería).

Componente: `Lockup` (`src/components/brand/Lockup.tsx`).

### Mínimos, protección y usos incorrectos

- Mínimos: marca sola 12 px (favicon), 16 px en UI; lockup 14 px de texto.
- Protección: 1/8 del ancho de la marca en todos los lados.
- Incorrecto: rotar (el corte es siempre vertical); rojo entero; exagerar el desplazamiento (>1/3 r); contorno fino salvo marca de agua (trazo ≤ 0,6 u sin relleno).

### Otras piezas

- **App icon / favicon** (`src/app/icon.svg`): cuadrado tinta, marca en `bg` al 62 % del lado, radio 0.
- **Sello de miembro:** borde 2 px tinta, marca 20 px + "Miembro NS Sevilla" (600 · 12 px) / "CÍRCULO 01 · PLAZA 02" (9 px uppercase 0.1em `neutral-700`), padding 8 12 8 10. Pendiente de implementar.
- **Marca de agua:** `NSMark watermark` (trazo 0,6 u).

## 4. Pantallas implementadas

### Arranque (5b) · `src/components/hoy/Splash.tsx`

Marca 160 px centrada, animación "Analizando" a 4 s. Pie alineado a la izquierda con regla superior de 2 px: "NS Sevilla" (600 · 22 px) y "CÍRCULO 01 · HUMAN TRUST. AGENTIC EXECUTION." Se usa como `loading.tsx` de la ruta `/hoy`.

### Hoy (5a) · `src/components/hoy/HoyScreen.tsx`

1. **Cabecera:** lockup `NS Sevilla · Círculo 01` (28/18) y, a la derecha, indicador del agente (marca 16 px + etiqueta 11 px 600 uppercase 0.08em; acento cuando analiza).
2. **Saludo:** h1 34 px 800 según hora de Sevilla (<13 Buenos días, <21 Buenas tardes, si no Buenas noches) + "Mientras estabas fuera · desde ayer 19:40".
3. **Ledger:** regla superior 2 px; filas `64px 1fr` con cifra 28 px 800 tabular y texto 14 px; la fila del referido es un enlace en acento con la marca en `waiting`.
4. **Valor potencial:** kicker + cifra 36 px 800 tabular.
5. **Referral card:** surface + shadow-sm, kicker "Oportunidad detectada", "91% · Confianza alta", título 19 px, origen/trigger, valor y timing, "Por qué encaja · Ver/Ocultar" (toggle sin animación de altura; `+` a favor, `–` pendiente), "Nada se ha compartido todavía. Tú decides.", CTA primario alineado a la izquierda con flecha.
6. **Acciones rápidas:** "He sabido que…" (`mic`) y "Radar" (`radar`), grid 2 col con regla interior.
7. **Tab bar:** sticky, 5 columnas, iconos 20 px sobre etiqueta 10 px 600, alineados a la izquierda; Agente usa la marca en `currentColor`.

Estados cubiertos: **carga** (arranque 5b), **vacío** (`?demo=sin-referidos`: cero rojo, la card se sustituye por un bloque tranquilo), **agente en reposo** (`?demo=agente-parado`), **error** (`?demo=error`, con reintento), **carga lenta** (`?demo=cargando`). Pendientes de diseño: offline, permiso denegado, baja confianza, datos obsoletos.

## 5. Iconos

Lucide (ISC), trazo 2, 20 px: `house`, `inbox`, `radar`, `layout-grid`, `mic`, `arrow-right`, `chevron-right`. Inline en `src/components/icons.tsx`; sin dependencia de paquete.

## 6. Pendiente

- Modo oscuro cálido (el tablero lo propone como prueba; no aprobado).
- Referral card completa (dos caras, estados), Radar, Agent Room, Mi Círculo (grid de 30 plazas de la referencia 1c), Nueva señal, Mi agente.
- Sello de miembro y versiones negativo / sobre acento como componentes.
