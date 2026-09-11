# NS Network Spain

**Agentic Business Referral Network.** Un club privado de empresas donde cada miembro dispone de un agente de IA que representa sus intereses comerciales y trabaja 24/7 junto a los agentes de las demás empresas para descubrir, cualificar y facilitar negocio entre ellas.

> Tu empresa no hace networking. Su agente sí. 24/7.

Primera implantación: **NS Sevilla · NS Cumbre** (primera Sala de la zona), una empresa por especialidad en cada Sala. Las Salas llevan nombre propio autorizado por NS; el nombre de la ciudad queda reservado a la zona (D-014).

## Estado del proyecto

**Fase 0 · Fundación.** Este repositorio contiene por ahora la constitución de producto y los documentos fundacionales. No hay código de aplicación todavía.

## Documentación

| Documento | Contenido |
| --- | --- |
| [`CLAUDE.md`](./CLAUDE.md) | Constitución maestra de producto. Contexto, rol, forma de trabajo, principios no negociables. |
| [`docs/00_NORTH_STAR.md`](./docs/00_NORTH_STAR.md) | Tesis, mantra, métrica primaria, moat y principios. |
| [`docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`](./docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md) | NS-ARP v0.1: objetos, mensajes agente-a-agente, visibilidad y permisos, NS Match Score, máquina de estados, puertas humanas, auditoría, escenarios de referencia. |
| [`docs/05_DESIGN_BRIEF.md`](./docs/05_DESIGN_BRIEF.md) | Brief para Claude Design: identidad, logo, dirección visual, pantallas prioritarias, datos demo y entregables. |
| [`docs/11_IDEAS_DISRUPTIVAS.md`](./docs/11_IDEAS_DISRUPTIVAS.md) | Banco de ideas disruptivas sobre el núcleo: prospección agentic, calidad verificada, reconocimiento escalable, efecto red. |
| [`docs/12_SALAS.md`](./docs/12_SALAS.md) | La Sala como eje: zonas y saturación, apertura de nuevas Salas, clasificación NS-CAT (base CNAE ampliable), plazas y casuística de sectores, enrutamiento Sala → Zona → Red, ciclo de vida de la Sala. |
| [`docs/13_LEXICO_NS.md`](./docs/13_LEXICO_NS.md) | Léxico oficial de NS: nombres propios para la estructura (Sala, Plaza, Antesala, Pleno, Confluencia), el flujo (Indicio, Pista, Cesión, Embajada, Puente, Valor contrastado), la reputación (Veredicto, Contraste, Mérito, Compromiso) y el día a día (Mesa Permanente, Despacho, Encargo, Rastreo, Sondeo, Parte, Crónica). |
| [`docs/14_PROTOCOLOS_DE_SALA.md`](./docs/14_PROTOCOLOS_DE_SALA.md) | Los dos protocolos obligatorios: Generar Negocio (Cesión, NS-ARP) y Dar a Conocer (Comunicado, Gaceta, Dossier, NS-ADP), con especificación agentic completa. |
| [`docs/DECISIONS.md`](./docs/DECISIONS.md) | Registro de decisiones estratégicas y arquitectónicas. |

Documentos pendientes según la constitución: `01_PRODUCT_REQUIREMENTS`, `03_USER_ROLES`, `04_INFORMATION_ARCHITECTURE`, `05_DESIGN_SYSTEM` (se derivará del brief y de los tokens entregados por Claude Design), `06_DATA_MODEL`, `07_AGENT_ARCHITECTURE`, `08_SECURITY_PRIVACY_GDPR`, `09_ANALYTICS`, `10_ROADMAP`.

## Cómo trabajar en este repositorio

1. Leer `CLAUDE.md` completo antes de cualquier cambio.
2. Comprobar `docs/DECISIONS.md`. Las decisiones registradas prevalecen sobre el texto general de la constitución.
3. Toda feature agentic se especifica contra `docs/02_NS_AGENTIC_REFERRAL_PROTOCOL.md`.
4. Toda decisión estructural nueva se registra en `docs/DECISIONS.md` antes de implementarla.

## Mantra

**Human trust. Agentic execution. Business without idle time.**
