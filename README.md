# NS Network Spain

**Agentic Business Referral Network.** Un club privado de empresas donde cada miembro dispone de un agente de IA que representa sus intereses comerciales y trabaja 24/7 junto a los agentes de las demás empresas para descubrir, cualificar y facilitar negocio entre ellas.

> Tu empresa no hace networking. Su agente sí. 24/7.

Primera implantación: **NS Sevilla · NS Cumbre** (primera Sala de la zona), una empresa por especialidad en cada Sala. Las Salas llevan nombre propio autorizado por NS; el nombre de la ciudad queda reservado a la zona (D-014).

## Estado del proyecto

**Fase 0 · Fundación → primer vertical slice.** Además de la constitución y los documentos fundacionales, el repositorio contiene en `apps/web` el primer recorrido ejecutable de principio a fin sobre los datos demo de NS Cumbre:

```text
alta de empresa (plaza única) → ADN de Empresa → Indicio → Mesa Permanente (Pista, Encaje explicado,
Salvoconducto) → tarjeta de Cesión (cara A / cara B) → visto bueno → Apertura → Puente → Veredicto → valor contrastado
+ Rastreo público (Indicios desde fuentes públicas) · Encargos · Reloj de la Sala (plazos ejecutados) · Interesado avisado
```

### Ejecutar la demo

```bash
pnpm install
pnpm db:seed      # crea NS Sevilla · NS Cumbre, 10 titulares con ADN y los escenarios A, C y D
pnpm dev          # http://localhost:3000 · portada beta; /acceso con demo / nscumbre · Hoy, Mesa, Cesiones, Mi Sala
pnpm test         # 30 tests: score, puertas, Salvoconducto, máquina de estados, Promesa, Reloj, Rastreo, Encargos y el slice completo
```

Sin configuración usa PGlite (Postgres embebido en `apps/web/.data`) y el proveedor de razonamiento determinista. Con `DATABASE_URL` usa PostgreSQL; con `ANTHROPIC_API_KEY` los Agentes razonan con Claude (`claude-opus-5` por defecto) mediante salidas estructuradas. En la interfaz, el selector "Actúas como" cambia de persona (no hay autenticación en el slice).

## Documentación

| Documento | Contenido |
| --- | --- |
| [`CLAUDE.md`](./CLAUDE.md) | Constitución maestra de producto. Contexto, rol, forma de trabajo, principios no negociables. |
| [`docs/00_NORTH_STAR.md`](./docs/00_NORTH_STAR.md) | Tesis, mantra, métrica primaria, moat y principios. |
| [`docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`](./docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md) | NS-ARP v0.1: objetos, mensajes agente-a-agente, visibilidad y permisos, NS Match Score, máquina de estados, puertas humanas, auditoría, escenarios de referencia. |
| [`docs/05_DESIGN_BRIEF.md`](./docs/05_DESIGN_BRIEF.md) | Brief para Claude Design: identidad, logo, dirección visual, pantallas prioritarias, datos demo y entregables. |
| [`docs/11_IDEAS_DISRUPTIVAS.md`](./docs/11_IDEAS_DISRUPTIVAS.md) | Banco de ideas disruptivas sobre el núcleo: prospección agentic, calidad verificada, reconocimiento escalable, efecto red. |
| [`docs/12_SALAS.md`](./docs/12_SALAS.md) | La Sala como eje: zonas y saturación, apertura de nuevas Salas, clasificación NS-CAT (base CNAE ampliable), plazas y casuística de sectores, enrutamiento Sala → Zona → Red, ciclo de vida de la Sala. |
| [`docs/BITACORA.md`](./docs/BITACORA.md) | Punto de parada de la última sesión de trabajo y siguiente paso acordado. |
| [`docs/13_LEXICO_NS.md`](./docs/13_LEXICO_NS.md) | Léxico oficial de NS: nombres propios para la estructura (Sala, Plaza, Titular, Timonel, Antesala, Pleno, Confluencia), el flujo (Indicio, Pista, Cesión, Embajada, Puente, Valor contrastado), la reputación (Veredicto, Contraste, Mérito, Compromiso) y el día a día (Mesa Permanente, Despacho, Encargo, Rastreo, Sondeo, Parte, Crónica). |
| [`docs/14_PROTOCOLOS_DE_SALA.md`](./docs/14_PROTOCOLOS_DE_SALA.md) | Los tres protocolos obligatorios: Generar Negocio (Cesión, NS-ARP), Dar a Conocer (Comunicado, Gaceta, Dossier, NS-ADP) y Cuentas Claras (Balanza, Ritmo, Brújula, Movimiento, NS-ATP), con especificación agentic completa. |
| [`docs/15_TARJETA_DE_CESION.md`](./docs/15_TARJETA_DE_CESION.md) | La tarjeta de Cesión a dos caras: objetivo, acciones, jerarquía, Promesa, capa 2, plazos, estados, Veredicto y Distinción. |
| [`docs/16_COMPETENCIA.md`](./docs/16_COMPETENCIA.md) | Competencia (BNI, LeTip, Linkeat, Boardy, Lunchclub, Intros, Clay, Common Room, Commsor, Alignable 360): qué hacen, qué NS supera y qué adoptamos mejorado (D-029 a D-032). |
| [`docs/17_DESPLIEGUE.md`](./docs/17_DESPLIEGUE.md) | Cuándo y cómo pasar al servidor: entorno privado de demostración ahora, producción con empresas reales tras la puerta de Fase 1. |
| [`docs/06_DATA_MODEL.md`](./docs/06_DATA_MODEL.md) | Modelo de datos implementado: tablas, ciclos de vida, visibilidad en consultas, persistencia (Drizzle · PostgreSQL · PGlite). |
| [`docs/07_AGENT_ARCHITECTURE.md`](./docs/07_AGENT_ARCHITECTURE.md) | Arquitectura de agentes implementada: roles, contrato con el modelo, lo que el modelo no decide, puertas humanas, observabilidad. |
| [`apps/web/README.md`](./apps/web/README.md) | Estructura del código del vertical slice y comandos. |
| [`brand/README.md`](./brand/README.md) | Monograma NS decidido (D-022): geometría, versiones SVG, reglas de uso y lockups. |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Registro de decisiones estratégicas y arquitectónicas. |

Documentos pendientes según la constitución: `01_PRODUCT_REQUIREMENTS`, `03_USER_ROLES`, `04_INFORMATION_ARCHITECTURE`, `05_DESIGN_SYSTEM` (se derivará del brief y de los tokens entregados por Claude Design), `08_SECURITY_PRIVACY_GDPR`, `09_ANALYTICS`, `10_ROADMAP`.

## Cómo trabajar en este repositorio

1. Leer `CLAUDE.md` completo antes de cualquier cambio.
2. Comprobar `docs/DECISIONS.md`. Las decisiones registradas prevalecen sobre el texto general de la constitución.
3. Toda feature agentic se especifica contra `docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`.
4. Toda decisión estructural nueva se registra en `docs/DECISIONS.md` antes de implementarla.

## Mantra

**Human trust. Agentic execution. Business without idle time.**
