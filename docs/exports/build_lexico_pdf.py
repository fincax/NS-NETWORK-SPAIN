# -*- coding: utf-8 -*-
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, KeepTogether)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

F='/usr/share/fonts/truetype/'
pdfmetrics.registerFont(TTFont('Serif', F+'liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('SerifB', F+'liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('SerifI', F+'liberation/LiberationSerif-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Sans', F+'dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('SansB', F+'dejavu/DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Mono', F+'dejavu/DejaVuSansMono.ttf'))

OBSIDIAN=colors.HexColor('#0B0D10'); GRAPHITE=colors.HexColor('#1A1D22')
PORCELAIN=colors.HexColor('#F4F1EC'); BLUE=colors.HexColor('#0F2A4A')
GREEN=colors.HexColor('#2FBF71'); AMBER=colors.HexColor('#E8A33D')
GREY=colors.HexColor('#6B7078'); LINE=colors.HexColor('#D8D3CB'); ROW=colors.HexColor('#F8F6F2')

W,H=A4
M=18*mm

def sty(name, **kw):
    base=dict(fontName='Sans', fontSize=9.2, leading=12.5, textColor=OBSIDIAN)
    base.update(kw); return ParagraphStyle(name, **base)

sTitle=sty('t', fontName='Serif', fontSize=34, leading=38, textColor=PORCELAIN)
sSub=sty('s', fontName='Sans', fontSize=11, leading=15, textColor=colors.HexColor('#AEB4BC'))
sKick=sty('k', fontName='Mono', fontSize=8, leading=10, textColor=colors.HexColor('#9FB7D3'))
sH1=sty('h1', fontName='Serif', fontSize=20, leading=24, textColor=BLUE, spaceBefore=6, spaceAfter=4)
sH2=sty('h2', fontName='SansB', fontSize=10.5, leading=14, textColor=BLUE, spaceBefore=10, spaceAfter=4)
sBody=sty('b', fontSize=9.4, leading=13.5)
sSmall=sty('sm', fontSize=8.2, leading=11, textColor=GREY)
sTerm=sty('term', fontName='SerifB', fontSize=10.5, leading=12.5, textColor=BLUE)
sCell=sty('cell', fontSize=8.6, leading=11.6)
sMono=sty('mono', fontName='Mono', fontSize=7.6, leading=10, textColor=GREY)
sHead=sty('head', fontName='Mono', fontSize=7.2, leading=9, textColor=PORCELAIN)
sQuote=sty('q', fontName='SerifI', fontSize=12, leading=16, textColor=BLUE, leftIndent=10)

def table(rows, widths, header=('TÉRMINO','QUÉ ES','ID TÉCNICO')):
    data=[[Paragraph(h,sHead) for h in header]]
    for r in rows:
        data.append([Paragraph(r[0],sTerm), Paragraph(r[1],sCell), Paragraph(r[2],sMono)])
    t=Table(data, colWidths=widths, repeatRows=1)
    st=[('BACKGROUND',(0,0),(-1,0),BLUE),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LINEBELOW',(0,0),(-1,-1),0.4,LINE),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6)]
    for i in range(1,len(data)):
        if i%2==0: st.append(('BACKGROUND',(0,i),(-1,i),ROW))
    t.setStyle(TableStyle(st)); return t

CW=W-2*M
WIDTHS=[CW*0.20, CW*0.58, CW*0.22]

def cover(c, doc):
    c.saveState()
    c.setFillColor(OBSIDIAN); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(BLUE); c.rect(0,H-14*mm,W,14*mm,fill=1,stroke=0)
    c.setStrokeColor(PORCELAIN); c.setLineWidth(1.2); c.roundRect(M,H-70*mm,16*mm,16*mm,2,stroke=1,fill=0)
    c.setFillColor(PORCELAIN); c.setFont('Serif',15); c.drawCentredString(M+8*mm,H-64.5*mm,'NS')
    c.setFillColor(AMBER); c.rect(M,52*mm,28*mm,1.2,fill=1,stroke=0)
    c.setFillColor(colors.HexColor('#8A9098')); c.setFont('Mono',7.5)
    c.drawString(M,44*mm,'NS NETWORK SPAIN · LÉXICO OFICIAL · v0.4 · 11 SEPTIEMBRE 2026')
    c.drawString(M,39*mm,'DECISIONES D-013 A D-021 · DOCUMENTO INTERNO DEL EQUIPO FUNDADOR')
    c.restoreState()

def later(c, doc):
    c.saveState()
    c.setFillColor(BLUE); c.rect(0,H-6*mm,W,6*mm,fill=1,stroke=0)
    c.setFont('Mono',7); c.setFillColor(GREY)
    c.drawString(M,10*mm,'NS Network Spain · Léxico oficial v0.4')
    c.drawRightString(W-M,10*mm,'%d' % doc.page)
    c.restoreState()

doc=SimpleDocTemplate('NS_Lexico_v0.4.pdf', pagesize=A4, leftMargin=M, rightMargin=M, topMargin=16*mm, bottomMargin=18*mm,
                      title='NS Network · Léxico oficial', author='NS Network Spain', subject='Naming de estructura, protocolos, reputación y día a día')
S=[]
# Cover
S.append(Spacer(1,78*mm))
S.append(Paragraph('Léxico NS', sTitle))
S.append(Spacer(1,4*mm))
S.append(Paragraph('El lenguaje propio de NS Network: estructura, protocolos, flujo de negocio, reputación y día a día.', sSub))
S.append(Spacer(1,3*mm))
S.append(Paragraph('Human trust. Agentic execution. Business without idle time.', sty('m', fontName='SerifI', fontSize=11, leading=14, textColor=colors.HexColor('#AEB4BC'))))
S.append(PageBreak())

# Intro
S.append(Paragraph('Por qué NS tiene lenguaje propio', sH1))
S.append(Paragraph('NS crea una categoría nueva de producto y necesita nombrar sus objetos y sus rituales con palabras que nadie más use. El léxico es propiedad intelectual y es producto: la web pública, la app y el microcopy hablan con él. Ningún término copia terminología de otras organizaciones de networking.', sBody))
S.append(Spacer(1,3*mm))
S.append(Paragraph('Criterios de cada nombre: castellano; una palabra siempre que sea posible; institucional y sobrio; con sentido literal reconocible; sin pistas territoriales; traducible sin perder el concepto; registrable con el prefijo NS.', sBody))
S.append(Spacer(1,4*mm))
S.append(Paragraph('«Los agentes trabajan. Las personas deciden. La reputación se gana con negocio verificado.»', sQuote))

# 1 Marca y jerarquía
S.append(Paragraph('1 · Marca y jerarquía', sH1))
S.append(table([
 ('NS Network','La red mundial. Marca madre.','Network'),
 ('NS España','País. Agrupa las zonas españolas.','Country'),
 ('NS Sevilla','<b>Zona</b>: ciudad o área metropolitana que agrupa Salas. El nombre de la ciudad pertenece a NS; ninguna Sala puede usarlo.','Zone'),
 ('NS Cumbre','<b>Sala</b>: nombre propio elegido por sus fundadoras y autorizado por NS. Prefijo NS, único en toda la red. Nunca un topónimo (ciudad, municipio, provincia, comunidad, país, barrio, distrito) ni ningún término con pista territorial. Ejemplos de demo: NS Cumbre, NS Ágora, NS Meridiana.','Chapter.name'),
], WIDTHS))
S.append(Spacer(1,2*mm))
S.append(Paragraph('Lectura completa: una empresa es miembro de <b>NS Cumbre</b>, Sala de <b>NS Sevilla</b>, dentro de <b>NS España</b>. La Sala no es territorial (principio 16): se define por sus empresas, no por su mapa.', sSmall))

# 2 Estructura
S.append(Paragraph('2 · Estructura de la red', sH1))
S.append(table([
 ('Red NS','La red mundial.','Network'),
 ('Zona','Ciudad o área metropolitana que agrupa Salas. Lleva el nombre de la ciudad y pertenece a NS.','Zone'),
 ('Sala','Unidad fundamental: empresas seleccionadas, una por especialidad. No es territorial. Entre 12 y 15 fundadoras, objetivo 25 a 35, tope 40.','Chapter'),
 ('Plaza','Posición única de una especialidad dentro de una Sala.','CategorySeat'),
 ('Titular','Empresa que ocupa una plaza.','seat.company_id'),
 ('Antesala','Lista de espera de empresas admitidas que aguardan plaza o fundan la siguiente Sala.','Waitlist'),
 ('Candidatura','Solicitud de plaza y proceso de admisión. El paso tras «Solicitar plaza».','Application'),
 ('Directiva','Presidencia y consejo de una Sala.','Director'),
 ('Consejo de Zona','Gobierno de la zona: apertura, escisión y fusión de Salas; Comité de Clasificación.','ZoneDirector'),
 ('Pleno','Reunión periódica de las personas de una Sala.','ChapterSession'),
 ('Confluencia','Encuentro entre dos o más Salas, convocado cuando los agentes detectan demanda cruzada. Agenda generada por los agentes.','CrossChapterMeeting'),
], WIDTHS))

# 3 Flujo
S.append(Paragraph('3 · El flujo de negocio · Protocolo I · Generar Negocio (NS-ARP)', sH1))
S.append(table([
 ('Interesado','Quien busca un producto o servicio de confianza: empresa, persona física, autónomo, asociación, fundación, comunidad de propietarios, administración… Es el objeto de toda Cesión. Si es persona física, su identidad solo se revela con base jurídica y consentimiento.','ThirdParty'),
 ('Indicio','Señal estructurada de que un Interesado puede tener una necesidad. La materia prima.','OpportunitySignal'),
 ('Pista','Hipótesis de encaje entre un Indicio y una plaza, formulada por los agentes y aún sin cualificar.','MatchCandidate'),
 ('Encaje','Grado de ajuste explicable entre necesidad y titular, de 0 a 100 %.','NSMatchScore'),
 ('Fundamento','Explicación obligatoria de una Pista: por qué, evidencia, confianza, incógnitas, siguiente paso.','Explanation'),
 ('Salvoconducto','Veredicto de Cumplimiento que autoriza a una Pista a llegar a personas.','ComplianceVerdict'),
 ('Visto bueno','Decisión humana de aprobar (cedente, cesionario o Directiva).','HumanDecision.APPROVE'),
 ('Apertura','Momento en que el cedente autoriza revelar identidad y contexto al cesionario.','INTRO_AUTHORIZED'),
 ('Cesión','El referido NS: un Interesado con una necesidad concreta que un miembro (cedente) entrega al titular de esa especialidad en su Sala (cesionario). Un Interesado puede originar varias Cesiones. Es la unidad que se cualifica, se contrasta y genera Mérito.','Referral'),
 ('Cedente / Cesionario','Quien entrega la Cesión / quien la recibe.','originator / receiver'),
 ('Embajada','Propuesta Fuera de la Sala: cesión extraordinaria que el miembro propone a un titular de otra Sala de la zona cuando la plaza está vacante en la suya. Prima de Mérito para el cedente. «Hacer una Embajada».','Referral{route: ZONE, embassy: true}'),
 ('Embajadora','La empresa de otra Sala que acoge la Embajada. Representa esa especialidad en la Sala del cedente mientras la plaza siga vacante: sin plaza, sin voto, con mención en su Hoja de Méritos. Máximo dos Salas a la vez.','EmbassyRole'),
 ('Embajada en Red','El mismo acto extendido a otra zona cuando ninguna Sala de la zona cubre la necesidad.','Referral{route: NETWORK}'),
 ('Puente','La introducción cálida: el mensaje o reunión que conecta al cesionario con el Interesado, preparado por el Agente y enviado por la persona.','Introduction'),
 ('Oportunidad','Negociación abierta confirmada por el cesionario tras el Puente.','Opportunity'),
 ('Cierre','Resultado: ganado, perdido o sin decisión.','Outcome'),
 ('Valor contrastado','Valor económico confirmado por ambas partes y verificable por NS. El único que alimenta la métrica principal.','VALUE_CONFIRMED'),
 ('Libro de Valor','Registro acumulado de valor contrastado de una empresa, una Sala, una zona.','ValueLedger'),
], WIDTHS))

# 4 Reputación
S.append(Paragraph('4 · Calidad, reputación y compromiso', sH1))
S.append(table([
 ('Promesa','Valor a priori de una Cesión, fijado al aceptarse a partir de datos estructurados del Indicio y del Fundamento: valor estimado, necesidad real, información completa, decisor identificado, plazo, relación del cedente con el Interesado. La calculan los Agentes; el cesionario la confirma o ajusta con un toque. Da Mérito de Promesa al cedente sin esperar al cierre.','ReferralPromise'),
 ('Veredicto','Valor a posteriori: cualificación de la Cesión por el cesionario en tres ejes, en tres toques: Facilidad (qué fácil fue prestar el servicio), Negocio (cuánto negocio generó) y Trato (cómo fue el trato de las personas). El Agente aporta la evidencia de cada eje.','ReferralQualification'),
 ('Contraste','Auditoría de NS: comparación entre el Veredicto declarado y la evidencia recogida por los agentes.','Audit'),
 ('Mérito','Unidad de reputación verificable. Nace en tres momentos: Mérito de Promesa (al aceptarse la Cesión), Mérito de Veredicto (al valorarla el cesionario) y Mérito de Cierre (al contrastarse el valor). Nunca de cantidad. Nunca «puntos».','TrustEvent.weight'),
 ('Hoja de Méritos','Panel de comportamientos verificables de una empresa: cesiones, calidad media, valor contrastado, tiempo de respuesta, fiabilidad como cesionario. Nunca un número opaco.','ReputationProfile'),
 ('Distinción','Reconocimiento que el cesionario otorga al cedente por una Cesión concreta, nombrando el eje que destacó (Facilidad, Negocio o Trato) y una línea de motivo. Escasa: máximo una por titular y mes. Se publica en la Crónica y alimenta el Mérito. De las Distinciones del mes sale la Cesión del mes.','Recognition{axis, reason}'),
 ('Compromiso','Mínimo de Cesiones válidas por Ejercicio que toda empresa debe aportar (regla inmutable).','ContributionQuota'),
 ('Ejercicio','Periodo de cómputo del Compromiso. Por estipular: mes o trimestre.','QuotaPeriod'),
 ('Niveles','Miembro · Contribuidor · Referente · Consejero · Fundador. Se ganan con Mérito; amplían acceso, nunca lo restringen.','MembershipTier'),
 ('Arbitraje','Resolución de disputas entre cedente y cesionario por la Directiva.','Dispute'),
], WIDTHS))

# 5 Protocolo II
S.append(Paragraph('5 · Protocolo II · Dar a Conocer (NS-ADP)', sH1))
S.append(Paragraph('«Nadie puede ceder bien lo que no conoce bien.»', sQuote))
S.append(Spacer(1,2*mm))
S.append(table([
 ('Comunicado','Informe semanal estructurado que el Agente de una empresa envía a los Agentes de la Sala: lo estable (qué hace) y el delta (qué ha cambiado esta semana). El gerente lo aprueba en el Despacho con un toque.','Communique'),
 ('Comunicado de continuidad','El que envía el Agente cuando el gerente no aprueba a tiempo: solo lo estable ya validado, sin nuevas afirmaciones.','Communique{approved_by: CONTINUITY}'),
 ('Gaceta','Digesto semanal de la Sala compilado por el Chapter Intelligence Agent a partir de los Comunicados, con vista general y «relevante para ti» por gerente. En el Pleno sustituye la ronda de presentaciones.','ChapterGazette'),
 ('Dossier','Ficha viva de cada miembro: qué hace, a quién sirve, Cesión perfecta, capacidad ahora, Encargos, cómo presentarla, Hoja de Méritos, histórico de Comunicados. Dos toques desde cualquier pantalla.','MemberDossier'),
 ('Conocimiento mutuo','Métrica de salud de la Sala: proporción de gerentes que consultan la Gaceta o un Dossier cada semana.','MutualKnowledgeRate'),
], WIDTHS))

# 5bis Protocolo III
S.append(Paragraph('5bis · Protocolo III · Cuentas Claras (NS-ATP)', sH1))
S.append(Paragraph('«Lo que se da y lo que se recibe se ve. Lo que hay que hacer para mejorar, solo lo ve quien tiene que hacerlo.»', sQuote))
S.append(Spacer(1,2*mm))
S.append(table([
 ('Balanza','Panel público en la Sala con lo que cada titular ha dado y recibido: Cesiones hechas y recibidas, valor contrastado generado y recibido, del mes y acumulado, y estado frente al Ritmo. Ordenada por plaza, nunca un ranking. Solo lo válido y contrastado.','MemberBalance'),
 ('Balanza de Sala','Agregado de la Sala: Cesiones y valor contrastado del mes y acumulado, Distinciones, mejor semana.','ChapterBalance'),
 ('Ritmo','Objetivo semanal de Cesiones válidas fijado por la Sala o, en su defecto, por NS. Estados: En Ritmo · Por encima · Por debajo. Visible en la Balanza.','WeeklyPace'),
 ('Brújula','Cuadro privado del titular, recalculado cada noche por su Agente: dónde estás, por qué, qué ganas y qué hacer. Solo lo ven el titular y su Agente.','MemberCompass'),
 ('Movimiento','Acción concreta que la Brújula propone para la semana: ceder, ofrecer, proponer, sondear, Embajada. Tres por semana; cinco si el titular va Por debajo. Un toque para ejecutar.','CompassMove'),
], WIDTHS))

# 6 Agentes y día a día
S.append(Paragraph('6 · Los agentes y el día a día', sH1))
S.append(table([
 ('Agente NS','El agente empresarial de cada miembro. Representa, prospecta, cualifica, prepara, persigue.','CompanyAgent'),
 ('ADN de Empresa','El conocimiento estructurado que entrena al Agente (Business DNA).','BusinessDNA'),
 ('Mesa Permanente','La reunión 24/7 de los agentes de una Sala. En la app, cronología de eventos significativos.','AgentRoom'),
 ('Despacho','Sesión breve y periódica del miembro con su Agente: tres cosas ya preparadas, decisiones de 30 segundos.','AgentCheckIn'),
 ('Encargo','Lo que una empresa busca ahora (cliente ideal, trigger, importe, plazo). Los agentes prospectan contra los Encargos de la Sala.','DemandPosting'),
 ('Rastreo','Prospección del Agente en fuentes públicas (registros, licitaciones, licencias, empleo, noticias) para generar Indicios para otros.','PublicProspecting'),
 ('Sondeo','Pregunta discreta al grafo de relaciones de la Sala: «¿alguien tiene relación con la dirección financiera de Z?». Nadie ve contactos hasta que su dueño da el visto bueno.','RelationshipProbe'),
 ('Hoy','Pantalla de inicio del miembro: qué ha hecho la red por su empresa desde la última vez.','TodayView'),
 ('Parte','Informe ejecutivo de la Directiva y del Consejo de Zona: indicios, pistas, cesiones, compromiso, antesala, saturación.','ExecutiveBriefing'),
 ('Crónica','Muro de la Sala con hechos contrastados: cierres, distinciones, incorporaciones. Nada se publica sin confirmación de ambas partes.','ChapterFeed'),
 ('Carta de Presentación','Página que ve el Interesado cuando recibe un Puente: quién lo recomienda, por qué, agenda en un clic, opción de valorar.','IntroLandingPage'),
 ('NS Radar','Visualización icónica de Indicios, Pistas y Cesiones de la Sala y de la zona. Nunca sobre un mapa.','Radar'),
], WIDTHS))

# 7 Protocolos y clasificaciones
S.append(Paragraph('7 · Protocolos, clasificaciones y reglas', sH1))
S.append(table([
 ('Protocolo I · Generar Negocio','Deber de ceder referidos de calidad. Unidad: la Cesión. Especificación técnica: NS-ARP.','NS-ARP'),
 ('Protocolo II · Dar a Conocer','Deber de comunicar el trabajo propio a la Sala cada semana. Unidad: el Comunicado. Especificación técnica: NS-ADP.','NS-ADP'),
 ('NS-ARP','NS Agentic Referral Protocol: cómo los agentes descubren, comparten, cualifican, puntúan, autorizan y trazan Cesiones.','protocol_version'),
 ('Protocolo III · Cuentas Claras','Deber de NS de hacer visible en la Sala el valor dado y recibido por cada titular. Unidad: la Balanza. Especificación técnica: NS-ATP.','NS-ATP'),
 ('NS-ADP','NS Agentic Disclosure Protocol: cómo los agentes redactan, filtran, envían, acusan y compilan Comunicados, Gaceta y Dossier.','ADP-0.1'),
 ('NS-ATP','NS Agentic Transparency Protocol: cómo se calculan, contrastan y publican la Balanza y el Ritmo, y cómo el Agente genera la Brújula y sus Movimientos.','ATP-0.1'),
 ('NS-CAT','Clasificación NS de Actividades: base CNAE (sección, división, grupo, clase) más el nivel Especialidad NS, ampliable y versionada. Estados: OFICIAL, NS_EXTENDIDA, PROVISIONAL, RETIRADA.','nscat_version'),
 ('Especialidad','Nivel de NS-CAT que otorga plaza. Definición de conflicto: dos empresas son de la misma especialidad si un mismo referido válido debería enviarse a las dos.','Specialty'),
], WIDTHS, header=('TÉRMINO','QUÉ ES','ID')))
S.append(Spacer(1,3*mm))
S.append(Paragraph('Reglas inmutables (D-010, D-018 y D-019)', sH2))
for r in ['<b>Nunca se cobra por una Cesión.</b> Pedir, ofrecer, aceptar o condicionar un referido a dinero, comisión, descuento o favor es motivo de expulsión. NS tampoco cobra por referido.',
          '<b>Toda empresa cumple su Compromiso:</b> un mínimo de Cesiones válidas por Ejercicio. Pertenecer es contribuir.',
          '<b>La calidad importa más que la cantidad.</b> Solo cuenta la Cesión que el cesionario cualifica como válida y NS puede contrastar.',
          '<b>Toda empresa da a conocer su trabajo a la Sala cada semana.</b> El Agente redacta el Comunicado; el gerente lo aprueba.',
          '<b>Lo que se da y lo que se recibe se ve.</b> La Balanza de cada titular es pública en su Sala, exacta y contrastada. La Brújula, privada.']:
    S.append(Paragraph('• '+r, sBody))

# 8 flujo narrado
S.append(Paragraph('8 · El flujo completo dicho en léxico NS', sH1))
flow=['El Agente de Híspalis detecta un <b>Indicio</b> en su <b>Rastreo</b>: un cliente abre sede.',
 'La <b>Mesa Permanente</b> de NS Cumbre formula tres <b>Pistas</b>; una alcanza 91 % de <b>Encaje</b> con <b>Fundamento</b> claro.',
 'Cumplimiento emite <b>Salvoconducto</b>. Carlos da el <b>visto bueno</b> en su <b>Despacho</b>; Lucía acepta y confirma la <b>Promesa</b>: Híspalis ya suma Mérito de Promesa.',
 '<b>Apertura</b>: se revela la identidad del <b>Interesado</b>. Carlos tiende el <b>Puente</b>; el Interesado ve la <b>Carta de Presentación</b>.',
 'La <b>Cesión</b> avanza a <b>Oportunidad</b> y a <b>Cierre</b> ganado. Ambos confirman: 38.000 € de <b>valor contrastado</b> en el <b>Libro de Valor</b>.',
 'Lucía emite su <b>Veredicto</b> (Facilidad, Negocio, Trato); NS hace <b>Contraste</b>. Híspalis suma <b>Mérito</b> y cumple su <b>Compromiso</b> del <b>Ejercicio</b>.',
 'Lucía otorga a Híspalis su <b>Distinción</b> del mes, por Trato; la <b>Crónica</b> de NS Cumbre la publica.',
 'La plaza de Mobiliario estaba vacante en NS Cumbre: Carlos hizo una <b>Embajada</b> a un titular de NS Ágora, que pasó a ser <b>Embajadora</b> de Mobiliario en NS Cumbre; Carlos obtuvo prima de Mérito.',
 'El domingo, el Agente de Híspalis envía su <b>Comunicado</b>; el lunes, la <b>Gaceta</b> lo resume para toda la Sala y el <b>Dossier</b> de Híspalis queda actualizado.',
 'La <b>Balanza</b> de NS Cumbre muestra a Híspalis En <b>Ritmo</b>: 2 de 2 esta semana. Su <b>Brújula</b> le propone tres <b>Movimientos</b> para la próxima.',
 'El <b>Parte</b> del Consejo de Zona anota que Mobiliario debería cubrirse desde la <b>Antesala</b>.']
for i,f in enumerate(flow,1):
    S.append(Paragraph('%d. %s' % (i,f), sBody))

# 9 no usar
S.append(Paragraph('9 · Palabras que NS no usa', sH1))
S.append(Paragraph('«Lead», «referencia» (en el sentido de referido), «capítulo», «grupo», «círculo», «networking» como sustantivo del producto, «sinergia», «match» en la interfaz, «ranking», «puntos», «compliance» y «ticket» en el copy de la app. Y ninguna expresión, lema o formato protegido de otras organizaciones de networking. Los identificadores técnicos del protocolo se mantienen en inglés y se mapean en este léxico.', sBody))
S.append(Spacer(1,6*mm))
S.append(Paragraph('Fuentes: docs/13_LEXICO_NS.md · docs/12_SALAS.md · docs/14_PROTOCOLOS_DE_SALA.md · docs/DECISIONS.md (D-013 a D-021). Términos confirmados por el fundador el 11 de septiembre de 2026; «Extramuros» descartado en favor de «Embajada»; el nivel «Embajador» pasa a «Consejero».', sSmall))

doc.build(S, onFirstPage=cover, onLaterPages=later)
print('ok')
