# 08 · Seguridad, privacidad y RGPD

**Estado:** v0.1 · 15 de septiembre de 2026. Cubre lo que hoy existe en producción (la web pública y la demo privada). Lo que exigen las empresas reales está enumerado como pendiente y requiere revisión jurídica antes de la puerta de Fase 1 (`docs/17` §2, condición 4).

## 1. Principio

La privacidad es arquitectura, no una pantalla legal posterior (constitución §15). Un Agente separa **conocer** un dato de **poder usarlo**; NS separa **recoger** un dato de **poder tratarlo**. Nada se recoge sin decir para qué, y todo lo que se acepta queda registrado con versión y fecha.

## 2. Lo que hay hoy (D-055)

### 2.1 Aviso de privacidad público

- Ruta pública `/privacidad`, fuera de la puerta de la demo. Enlazada desde el pie de la portada y desde el propio formulario.
- Texto único y versionado en `apps/web/src/core/privacidad.ts` (`PRIVACIDAD_VERSION`). Cambiar el texto obliga a subir la versión: así la versión registrada en cada candidatura es exactamente la que estaba publicada.
- Secciones: quién trata, qué datos y para qué, base jurídica, conservación, destinatarios y ubicación, derechos y reclamación ante la AEPD, la demo (datos ficticios; prohibido introducir datos reales), cookies (solo una técnica de sesión).
- Responsable: **Be Trendy, S.L.**, NIF B90130725, calle Valparaíso, 18, 41013 Sevilla, propietaria de NS Network Spain. Contacto `NS_CONTACT_EMAIL` (por defecto `hola@networkspain.com`) y teléfono 627 542 045. Versión vigente del aviso: 2026-09-15.3.

### 2.2 Consentimiento en la candidatura

- El formulario "Solicitar plaza en la beta" lleva una casilla obligatoria con el texto de consentimiento y un campo oculto con la versión del aviso.
- El servidor rechaza la candidatura sin la casilla (`services/candidatura.ts`, error `PRIVACIDAD`) y no guarda nada. Con ella, guarda `privacy_version` y `privacy_accepted_at` (migración 0014).
- Las candidaturas anteriores al 15 de septiembre tienen esos campos a nulo. Si existiera alguna real, la Directiva debe recabar el consentimiento por correo antes de seguir tratándola.

### 2.3 Datos que trata la web pública

| Dato | Dónde | Finalidad | Base | Conservación |
| --- | --- | --- | --- | --- |
| Nombre, empresa, correo, ciudad, especialidad, frase | `beta_requests` | Estudiar la candidatura y contestar | Consentimiento | Hasta 12 meses tras la decisión si no prospera |
| Cookie de sesión de la demo | navegador + `sessions` (modo real) | Mantener la sesión | Interés legítimo (técnica) | Sesión / 30 días en modo real |
| Registro de accesos | `audit_log` | Seguridad y trazabilidad (D-054) | Interés legítimo | Por definir (propuesta: 12 meses) |

### 2.4 Medidas técnicas en el servidor (docs/17 §4c)

- Servidor en la Unión Europea, PostgreSQL solo accesible desde la propia máquina, HTTPS con certificado renovado automáticamente, cortafuegos con solo 22, 80 y 443.
- Contraseñas con scrypt y sal; sesiones con token aleatorio y solo su hash en base de datos (D-054).
- Cada acceso, fallo, invitación y cambio de contraseña queda en el registro de auditoría.

## 3. Pendiente antes de empresas reales

1. ~~Identidad del responsable~~ (hecho: Be Trendy, S.L.). Falta que el buzón `hola@networkspain.com` exista o fijar `NS_CONTACT_EMAIL`.
2. **Condiciones de la plaza**: contrato con las Normas NS (D-043), la cuota por Tramos (D-025) y el tratamiento de datos de la empresa titular. Se aceptan en el alta, con versión, como las Normas.
3. **Datos de terceros en los Indicios**: base jurídica (interés legítimo del cedente, con ponderación documentada), deber de información al Interesado en el Puente, y la regla ya implementada de que nadie contacta sin autorización humana.
4. **Registro de actividades de tratamiento** y, si procede, evaluación de impacto por el uso de Agentes sobre datos de terceros.
5. **Encargados de tratamiento**: proveedor del servidor, proveedor del modelo (Anthropic) y, cuando exista, el envío de correos. Contratos de encargo y transferencias internacionales documentadas.
6. **Retención y borrado** automatizados por tipo de dato: candidaturas, Indicios, Cesiones, registro de accesos.
7. **Copias de seguridad** cifradas con restauración probada (docs/17 condición 3).
8. **Derechos**: procedimiento interno para acceso, rectificación, supresión y portabilidad en el plazo de un mes.
9. Revisión del conjunto por un abogado especializado (docs/17 estima una semana).

## 4. Reglas para el código

- Ningún formulario público recoge un dato sin enlace al aviso y sin consentimiento o base explícita.
- Ninguna versión de un texto legal se edita sin subir su versión; la versión aceptada se guarda siempre junto al dato.
- Ningún dato de tercero sale de la Sala sin pasar por las puertas humanas de NS-ARP.
- La demo nunca contiene datos reales.
