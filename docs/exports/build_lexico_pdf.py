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
pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='SansB', italic='Sans', boldItalic='SansB')
pdfmetrics.registerFontFamily('Serif', normal='Serif', bold='SerifB', italic='SerifI', boldItalic='SerifB')

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

def table(rows, widths=None, header=('TÉRMINO','QUÉ ES')):
    widths=widths or WIDTHS
    data=[[Paragraph(h,sHead) for h in header]]
    for r in rows:
        data.append([Paragraph(r[0],sTerm), Paragraph(r[1],sCell)])
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
WIDTHS=[CW*0.24, CW*0.76]

def cover(c, doc):
    c.saveState()
    c.setFillColor(OBSIDIAN); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(BLUE); c.rect(0,H-14*mm,W,14*mm,fill=1,stroke=0)
    c.setStrokeColor(PORCELAIN); c.setLineWidth(1.2); c.roundRect(M,H-70*mm,16*mm,16*mm,2,stroke=1,fill=0)
    c.setFillColor(PORCELAIN); c.setFont('Serif',15); c.drawCentredString(M+8*mm,H-64.5*mm,'NS')
    c.setFillColor(AMBER); c.rect(M,52*mm,28*mm,1.2,fill=1,stroke=0)
    c.setFillColor(colors.HexColor('#8A9098')); c.setFont('Mono',7.5)
    c.drawString(M,44*mm,'NS NETWORK SPAIN · LÉXICO OFICIAL · v0.5 · 22 SEPTIEMBRE 2026')
    c.drawString(M,39*mm,'DECISIONES D-013 A D-063 · DOCUMENTO INTERNO DEL EQUIPO FUNDADOR')
    c.restoreState()

def later(c, doc):
    c.saveState()
    c.setFillColor(BLUE); c.rect(0,H-6*mm,W,6*mm,fill=1,stroke=0)
    c.setFont('Mono',7); c.setFillColor(GREY)
    c.drawString(M,10*mm,'NS Network Spain · Léxico oficial v0.5')
    c.drawRightString(W-M,10*mm,'%d' % doc.page)
    c.restoreState()


doc=SimpleDocTemplate('NS_Lexico_v0.5.pdf', pagesize=A4, leftMargin=M, rightMargin=M, topMargin=16*mm, bottomMargin=18*mm,
                      title='NS Network · Léxico oficial v0.5', author='NS Network Spain', subject='El lenguaje propio de NS: red, negocio, reputación, Agente, protocolos y reglas')
S=[]
# Portada
S.append(Spacer(1,78*mm))
S.append(Paragraph('Léxico NS', sTitle))
S.append(Spacer(1,4*mm))
S.append(Paragraph('El lenguaje propio de NS Network: la red y sus personas, el negocio, la reputación, el Agente, los tres protocolos de Sala y las reglas.', sSub))
S.append(Spacer(1,3*mm))
S.append(Paragraph('Human trust. Agentic execution. Business without idle time.', sty('m', fontName='SerifI', fontSize=11, leading=14, textColor=colors.HexColor('#AEB4BC'))))
S.append(PageBreak())

# Introducción
S.append(Paragraph('Por qué NS tiene lenguaje propio', sH1))
S.append(Paragraph('NS crea una categoría nueva y necesita nombrar sus objetos y sus rituales con palabras que nadie más use. El léxico es producto: la web pública, la app y cada mensaje del Agente hablan con él. Ningún término copia terminología de otras organizaciones de networking.', sBody))
S.append(Spacer(1,3*mm))
S.append(Paragraph('Criterios de cada nombre: castellano; una palabra siempre que sea posible; institucional y sobrio; con sentido literal reconocible; sin pistas territoriales; traducible sin perder el concepto. <b>La única marca registrada es NS Network Spain</b> (D-028): los términos del léxico son lenguaje de producto, no marcas.', sBody))
S.append(Spacer(1,4*mm))
S.append(Paragraph('«El Agente rema y vigila el horizonte 24/7. El Timonel decide el rumbo.»', sQuote))

# 1 Marca y red
S.append(Paragraph('1 · La red y sus personas', sH1))
S.append(table([
 ('NS Network Spain','La marca. Paraguas «NS Network» más el país.'),
 ('Red NS','La red mundial.'),
 ('Zona','La ciudad o el área metropolitana que agrupa Salas. Lleva el nombre de la ciudad y ese nombre pertenece a NS: «NS Sevilla».'),
 ('Sala','La unidad fundamental: empresas seleccionadas, una por especialidad. No es territorial: se define por sus empresas, no por un mapa. Nombre propio con prefijo NS, autorizado y único en la red, nunca un topónimo: «NS Cumbre», «NS Ágora».'),
 ('Plaza','La posición única de una especialidad dentro de una Sala.'),
 ('Titular','La empresa que ocupa una plaza.'),
 ('Titularidad','Cada plaza ocupada por una empresa. Una empresa con varias especialidades puede tener varias titularidades, cada una con su Compromiso; repartirlas por Salas distintas da <b>Mérito de Red</b>.'),
 ('Timonel','La persona que lleva el rumbo de su empresa en NS: da los vistos buenos, autoriza la Apertura, tiende el Puente y emite el Veredicto. El Agente trabaja 24/7; el Timonel manda. Invariable: el Timonel, la Timonel. Cada titular puede designar un <b>Timonel suplente</b>.'),
 ('Manantial','Un Timonel, un titular, que por su condición de empresa o de profesión es propicio desde el inicio para facilitar multitud de referidos de sectores distintos. Es una condición de la titularidad, no un rol ni una especialidad concreta: administración de fincas, asesoría fiscal, seguros o arquitectura son solo ejemplos. Mismas reglas que cualquier titular. NS los prioriza al fundar Salas y reconoce la amplitud de lo cedido, nunca la cantidad.'),
 ('Directiva','Quien dirige la Sala: despacha la Antesala, revisa las excepciones, propone bajas a NS, promueve acciones entre Salas y resuelve dudas entre Timoneles. Dirigir bien suma Valoración.'),
 ('Consejo de Zona','El gobierno de la zona: apertura, escisión y fusión de Salas, y clasificación de especialidades.'),
 ('Candidatura','La solicitud de plaza y su proceso de admisión, tras pulsar «Solicitar plaza».'),
 ('Antesala','La lista de espera de empresas que aguardan plaza o fundan la siguiente Sala.'),
 ('Fundación','El proceso por el que nace una Sala nueva desde la Antesala. La impulsa una <b>Promotora</b>: la empresa cuya plaza estaba ocupada, que recibe una gratificación de cuota si la Sala se funda. Nunca dinero por referidos.'),
 ('Prueba de Valor','Siete días de Agente para un candidato antes de tener plaza: ve lo que su Agente habría cedido a la Sala y, en agregado, lo que la Sala ya encontró para su especialidad.'),
 ('Pleno','La reunión periódica de las personas de una Sala.'),
 ('Confluencia','El encuentro entre dos o más Salas, convocado cuando los Agentes detectan demanda cruzada.'),
]))

# 2 Negocio
S.append(Paragraph('2 · El negocio · Protocolo I · Generar Negocio (NS-ARP)', sH1))
S.append(table([
 ('Interesado','Quien busca un producto o servicio de confianza: empresa, autónomo, persona, asociación, comunidad de propietarios, administración… Es el objeto de toda Cesión y nunca es miembro por serlo. Sustituye a «lead».'),
 ('Indicio','La señal estructurada de que un Interesado puede tener una necesidad. La materia prima.'),
 ('Pista','La hipótesis de encaje entre un Indicio y una plaza, formulada por los Agentes y aún sin cualificar.'),
 ('Encaje','El grado de ajuste explicable entre necesidad y titular, de 0 a 100 %.'),
 ('Fundamento','La explicación obligatoria de cada Pista: por qué, evidencia, confianza, lo que falta y el siguiente paso.'),
 ('Salvoconducto','La autorización de cumplimiento (permisos, privacidad, conflictos) para que una Pista llegue a personas.'),
 ('Visto bueno','La decisión humana de aprobar.'),
 ('Apertura','El momento en que el cedente autoriza revelar la identidad del Interesado al cesionario.'),
 ('Cesión','El referido NS: un Interesado con una necesidad concreta que un miembro, el <b>cedente</b>, entrega al titular de esa especialidad en su Sala, el <b>cesionario</b>. Un Interesado puede originar varias Cesiones. Es la unidad que se cualifica, se contrasta y genera Mérito.'),
 ('Pregunta al cedente','Lo que el cesionario pide saber antes de aceptar. Va al cedente, que responde con el borrador de su Agente, y vuelve como evidencia. Como mucho dos por Cesión.'),
 ('Interesado avisado','El hecho que distingue una Cesión de verdad: el Interesado sabe que le van a llamar.'),
 ('Puente','La presentación cálida que conecta al cesionario con el Interesado: la prepara el Agente y la envía la persona. El Interesado ve una <b>Carta de Presentación</b>.'),
 ('Oportunidad · Cierre','La negociación abierta tras el Puente, y su resultado: ganado, perdido o sin decisión.'),
 ('Valor contrastado','El valor económico confirmado por ambas partes y verificable por NS. Se anota en el <b>Libro de Valor</b> y es el único que alimenta la métrica principal.'),
 ('Embajada','Cuando la plaza está vacante en la Sala del cedente, este cede a un titular de otra Sala de la zona, que queda como <b>Embajadora</b> de esa especialidad mientras siga vacante: sin plaza ni voto. Prima de Mérito para el cedente. Si ninguna Sala de la zona la cubre: <b>Embajada en Red</b>.'),
]))

# 3 Reputación
S.append(Paragraph('3 · Calidad, reputación y compromiso', sH1))
S.append(table([
 ('Promesa','Lo que vale una Cesión a priori, fijado al aceptarse con datos estructurados: valor estimado, necesidad real, información completa, decisor, plazo y relación del cedente con el Interesado. Da Mérito al cedente sin esperar al cierre.'),
 ('Veredicto','Lo que valió a posteriori, en tres toques del cesionario: <b>Facilidad</b> (qué fácil fue prestar el servicio), <b>Negocio</b> (cuánto generó) y <b>Trato</b> (cómo fue el trato de las personas).'),
 ('Contraste','La auditoría de NS: compara lo declarado con la evidencia de los Agentes.'),
 ('Mérito','La unidad de reputación verificable. Nace en tres momentos: Promesa, Veredicto y Cierre. Nunca de cantidad; nunca «puntos».'),
 ('Hoja de Méritos','El panel de comportamientos verificables de cada empresa. Nunca un número opaco.'),
 ('Distinción','El reconocimiento escaso (una por titular y mes) que el cesionario da al cedente por una Cesión, nombrando el eje que destacó y un motivo. Se publica en la Crónica; de ellas sale la <b>Cesión del mes</b>.'),
 ('Valoración','El porcentaje mensual y explicable de cada titular: calidad de lo cedido, Compromiso, plazo de respuesta, Comunicado y servicio a la red. Nunca mide cantidad. Con 80 % o más durante un mes, el titular puede acoger una Embajada.'),
 ('Compromiso','Al menos una Cesión válida a la semana, sin excusas. Con una se cumple; para destacar, varias y a varias especialidades.'),
 ('Escalera','Semanas seguidas sin Cesión válida: 1.ª constancia, 2.ª <b>Aviso diplomático</b> del Agente, 3.ª <b>Aviso formal</b> de la Directiva, 4.ª <b>Baja</b> de la titularidad. Una Cesión válida pone la cuenta a cero.'),
 ('Plazo de respuesta','Las 48 horas del cesionario para responder al Interesado tras el Puente.'),
 ('Niveles','Miembro · Contribuidor · Referente · Consejero · Fundador. Se ganan con Mérito y amplían acceso.'),
 ('Arbitraje','La resolución de disputas entre cedente y cesionario.'),
 ('Para los demás','El principio que lo sostiene todo: nadie busca para sí. El negocio propio no entra en NS; solo lo que se cede.'),
]))

# 4 Agente
S.append(Paragraph('4 · El Agente y el día a día', sH1))
S.append(table([
 ('Agente NS','El agente empresarial de cada titular: representa, prospecta, cualifica, prepara y hace seguimiento.'),
 ('ADN de Empresa','El conocimiento estructurado del negocio que entrena al Agente. Se construye en la <b>Entrevista</b> del Agente con su Timonel y se valida al final.'),
 ('Hoy','La pantalla de inicio: qué ha hecho la red por tu empresa desde la última vez.'),
 ('Despacho','La sesión breve del Timonel con su Agente: tres cosas preparadas, decisiones de 30 segundos.'),
 ('Mesa Permanente','La reunión 24/7 de los Agentes de una Sala, vista como una cronología de hechos significativos.'),
 ('Encargo','Lo que una empresa busca ahora. Los Agentes priorizan las Pistas que responden a un Encargo abierto.'),
 ('Apunte','Lo que el Timonel anota en treinta segundos, en la calle, sobre un posible referido. Nunca se publica solo.'),
 ('Rastreo','La búsqueda del Agente en fuentes públicas (licitaciones, registros, prensa…) para encontrar Indicios para otros titulares. El Timonel puede sumar su <b>Fuente propia</b>.'),
 ('Ronda','La pasada de cada mañana de los Agentes, sin que nadie abra la aplicación.'),
 ('Reloj de la Sala','El mecanismo que lleva los plazos: recuerda, caduca y avisa. El empujón lo recibe el Timonel, nunca el Interesado.'),
 ('Sondeo','La pregunta discreta a las relaciones de la Sala. Nadie ve contactos sin el visto bueno de su dueño.'),
 ('Parte','El informe ejecutivo de la Directiva y del Consejo de Zona.'),
 ('Crónica','El muro de la Sala con hechos contrastados. Nada se publica sin confirmación de ambas partes.'),
 ('NS Radar','La visualización icónica de Indicios, Pistas y Cesiones. Nunca sobre un mapa.'),
 ('Latido','Solo en la Sala de demostración: la mantiene viva a cualquier hora, sin decidir nunca por la empresa protagonista.'),
]))

# 5 Protocolos II y III
S.append(Paragraph('5 · Protocolo II · Dar a Conocer (NS-ADP)', sH1))
S.append(Paragraph('«Nadie puede ceder bien lo que no conoce bien.»', sQuote))
S.append(Spacer(1,2*mm))
S.append(table([
 ('Comunicado','El informe semanal que el Agente de cada empresa envía a la Sala: qué hace y qué ha cambiado esta semana. El Timonel lo aprueba con un toque. Si no llega a tiempo, sale un <b>Comunicado de continuidad</b> solo con lo ya validado.'),
 ('Gaceta','El resumen semanal de la Sala hecho con los Comunicados, con una vista «relevante para ti» por Timonel.'),
 ('Dossier','La ficha viva de cada miembro: qué hace, a quién sirve, su Cesión perfecta, sus Encargos y su Hoja de Méritos. A dos toques desde cualquier pantalla.'),
 ('Conocimiento mutuo','La salud de la Sala: cuántos Timoneles consultan la Gaceta o un Dossier cada semana.'),
]))
S.append(Paragraph('6 · Protocolo III · Cuentas Claras (NS-ATP)', sH1))
S.append(Paragraph('«Lo que se da y lo que se recibe se ve. Lo que hay que hacer para mejorar, solo lo ve quien tiene que hacerlo.»', sQuote))
S.append(Spacer(1,2*mm))
S.append(table([
 ('Balanza','Lo que cada titular ha dado y recibido, visible en su Sala: Cesiones y valor contrastado, del mes y acumulado. Ordenada por plaza, nunca un ranking. Existe también la <b>Balanza de Sala</b>.'),
 ('Ritmo','El objetivo semanal de Cesiones válidas. Estados: En Ritmo · Por encima · Por debajo.'),
 ('Brújula','El cuadro privado de cada titular: si consigue sus objetivos, por qué, qué gana, qué puede ofrecer y qué referidos tiene para ceder. Solo lo ven el titular y su Agente.'),
 ('Movimiento','Una acción concreta que propone la Brújula para la semana. Tres por semana; cinco si se va Por debajo. Un toque para hacerla.'),
]))

# 7 Reglas y dinero
S.append(Paragraph('7 · Reglas, clasificación y cuota', sH1))
S.append(table([
 ('Normas NS','El texto único y versionado que toda empresa acepta, norma a norma, al ocupar su plaza. Sin aceptación no hay alta.'),
 ('NS-CAT','La Clasificación NS de Actividades: base CNAE más la <b>Especialidad</b> NS, que es el nivel que otorga plaza.'),
 ('Cuota','Lo que paga cada empresa a NS por su plaza y su Agente: una cuota inicial al incorporarse y una cuota mensual, las dos muy bajas; los importes los anuncia NS. Un plano distinto de la regla entre miembros: nunca un porcentaje del negocio ni un cargo por Cesión.'),
 ('Tramo','El nivel de cuota. Se entra en un Tramo bajo y solo se sube cuando NS te ha generado más negocio contrastado; también se baja. Importes públicos; el Tramo de cada empresa, privado.'),
 ('Ejercicio','El año natural, de enero a diciembre: NS revisa el Tramo de cuota cada enero con el negocio contrastado del año anterior y cuenta las Embajadas por año. El primero de cada empresa va desde su alta hasta el 31 de diciembre.'),
]))
S.append(Spacer(1,3*mm))
S.append(Paragraph('Reglas inmutables', sH2))
for r in ['<b>Nunca se cobra por un referido.</b> Pedir, ofrecer, aceptar o condicionar un referido a dinero, comisión, descuento o favor es motivo de expulsión. NS tampoco cobra por referido.',
          '<b>Al menos una Cesión válida a la semana, sin excusas.</b> Cuatro semanas seguidas sin ninguna suponen la baja de la titularidad.',
          '<b>La calidad vale más que la cantidad. Siempre.</b> Solo cuenta la Cesión que el cesionario cualifica como válida y NS puede contrastar.',
          '<b>Toda empresa da a conocer su trabajo a la Sala cada semana.</b> El Agente redacta el Comunicado; el Timonel lo aprueba.',
          '<b>Lo que se da y lo que se recibe se ve.</b> La Balanza es pública en la Sala; la Brújula, privada.',
          '<b>Tu Agente y tú buscáis para los demás.</b> NS es lo que cedes.']:
    S.append(Paragraph('• '+r, sBody))

# 8 flujo narrado
S.append(Paragraph('8 · Una Cesión, contada en léxico NS', sH1))
flow=['El Agente de Híspalis detecta un <b>Indicio</b> en su <b>Rastreo</b>: un cliente abre sede.',
 'La <b>Mesa Permanente</b> de NS Cumbre formula tres <b>Pistas</b>; una alcanza un 91 % de <b>Encaje</b> con <b>Fundamento</b> claro.',
 'Llega el <b>Salvoconducto</b>. Carlos, <b>Timonel</b> de Híspalis, da el <b>visto bueno</b> en su <b>Despacho</b>.',
 'Lucía, la cesionaria, hace una <b>Pregunta al cedente</b>; Carlos responde y Lucía acepta. Se fija la <b>Promesa</b>: Híspalis ya suma Mérito.',
 '<b>Apertura</b>: se revela el <b>Interesado</b>, que ya estaba avisado. Carlos tiende el <b>Puente</b>.',
 'La <b>Cesión</b> llega a <b>Oportunidad</b> y a <b>Cierre</b> ganado: 38.000 € de <b>valor contrastado</b> en el <b>Libro de Valor</b>.',
 'Lucía emite su <b>Veredicto</b> y otorga a Híspalis su <b>Distinción</b> del mes, por Trato. La <b>Crónica</b> lo publica.',
 'Híspalis cumple su <b>Compromiso</b> de la semana y su <b>Balanza</b> lo refleja. Su <b>Brújula</b> le propone tres <b>Movimientos</b> para la próxima.',
 'La plaza de Mobiliario estaba vacante: Carlos hizo una <b>Embajada</b> a un titular de NS Ágora, que pasó a ser <b>Embajadora</b> de Mobiliario en NS Cumbre.']
for i,f in enumerate(flow,1):
    S.append(Paragraph('%d. %s' % (i,f), sBody))

# 9 no usar
S.append(Paragraph('9 · Palabras que NS no usa', sH1))
S.append(Paragraph('«Lead», «referencia» (en el sentido de referido), «capítulo», «grupo», «networking» como nombre del producto, «sinergia», «match» en pantalla, «ranking», «puntos». Y ninguna expresión, lema o formato protegido de otras organizaciones de networking.', sBody))

# 10 pendiente
S.append(Paragraph('10 · Pendiente de cerrar', sH2))
for r in ['<b>Directiva</b>: composición, elección y mandato.']:
    S.append(Paragraph('• '+r, sBody))
S.append(Spacer(1,6*mm))
S.append(Paragraph('Fuente: docs/13_LEXICO_NS.md y docs/DECISIONS.md (D-013 a D-063). Versión del 22 de septiembre de 2026. Sustituye a la v0.4 del 11 de septiembre.', sSmall))

doc.build(S, onFirstPage=cover, onLaterPages=later)
print('ok')
