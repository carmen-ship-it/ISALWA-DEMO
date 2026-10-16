# ISALWA — Addendum A1: interacciones comerciales completas y aislamiento

Fecha 2026-10-16. Complementa ISALWA_MASTER_BUILD_PLAN_V2.md. Encargo de Carmen para implementación local, no declaración de funcionalidad existente. Mantiene todas las restricciones de despliegue, gasto, mensajes reales, migración de teléfonos y datos reales. No requiere reiniciar tareas ya comprobadas: contrastar criterios afectados y ampliar implementación/evidencia. En conflictos sobre interacciones aquí detalladas, A1 prevalece; no relaja seguridad, integridad ni gates de V2. Otros cambios de negocio se escalan.

## 1. Aislamiento obligatorio en cada paso

Tenant = organización autenticada y autorizada, no asesor ni cliente. Dentro del mismo tenant, propietario/cobertura/jefatura/Contabilidad tienen acceso según alcance real. Compartir organización no concede automáticamente acceso a todas las conversaciones, datos financieros o notas. Cargo o título nunca sustituye un permiso. Ninguna organización puede conocer siquiera conteos, nombres, coincidencias, PDFs o existencia de registros ajenos.

Todas las relaciones, consultas, comandos, propuestas AI, documentos, pagos, cuentas bancarias, catálogos, notificaciones, cachés, eventos y jobs están acotados por organizationId server-side y recurso autorizado. Actor proviene de sesión; webhook resuelve organización por conexión verificada. IDs recibidos no autorizan acceso. Constraints compuestos donde compatibles y validación transaccional impiden enlazar recursos de tenants distintos. Conexión de WhatsApp no se cambia por número remitente ni organizationId cliente.

El mismo teléfono/producto/idempotency key puede existir legítimamente en dos organizaciones sin cruce. Búsqueda de duplicados solo dentro del alcance autorizado; coincidencia restringida no revela nombre/contacto por error. Resolver duplicado oculto mediante flujo autorizado sin exponer registro. Archivos privados: reautorizar descarga/preview y emisión de URL corta. Mismo control para PDF existente, regeneración, export, eventos realtime y deep links.

Worker revalida tenant, recurso, permiso actual del iniciador cuando corresponde, conexión, versión y política antes de un efecto. Servicio técnico usa principal limitado explícito, no permiso universal ni actor simulado. Revocación cancela efectos aún no ejecutados; un efecto ya enviado no puede retirarse por magia: registrar estado y no intentar modificar historia.

## 2. Ubicación, controles y aspecto

Reutilizar shell/componentes y tokens V2. Primario navy #18324B, hover #12263D; secundario borde navy sobre blanco; propuesta AI fondo #EDF5F8 con encabezado Propuesto por IA; selección #E2F0ED; error #A63D36 con fondo #FBE9E7; pendiente fondo #FFF5DB y texto navy. Color siempre acompañado por texto/icono. Controles mínimo44px y accesibilidad V2.

Conversaciones: panel contextual derecho en desktop, Ver cliente abre panel en móvil. Bloque Acciones comerciales en este panel, debajo de identificación y próximo paso: Preparar cotización, Registrar pedido, Registrar pago reportado, Crear compromiso, Reportar problema. En header de página Registrar atención. Compartir instrucciones de pago en panel/compositor menú Adjuntar, únicamente cuando existe configuración aprobada y permiso. Acciones sin autoridad no aparecen; si existe autoridad pero falta configuración, deshabilitadas con explicación y acción autorizada de resolver.

Cliente360: mismas acciones en menú Acciones junto al título; Cotizaciones conserva botón Preparar cotización. Formularios reutilizados, no implementaciones distintas por entrada. Desde chat precargar vínculo customer/conversation/contact/receivingLine y sourceMessageIds; desde cliente precargar customer; desde listado pedir selección. Datos precargados no equivalen a confirmados. Nunca abrir múltiples drawers apilados.

Tarjeta propuesta inline sobre compositor/contexto: encabezado específico, campos propuestos, evidencia Ver mensaje, datos faltantes, Editar, acción primaria específica y Descartar. No un botón genérico Aceptar que mezcla confirmar datos, emitir documento, enviar y crear pedido. Descartar no altera el registro comercial; puede indicar motivo opcional, no bloquea atención.

## 3. Detección de intención y captura progresiva

Extender pipeline AI existente de V2; no agente autónomo nuevo. Salida estructurada validada: intent(s), candidateProductIds, quantity/unit, referencedQuoteId/version cuando justificable, sourceMessageIds, missingFields, ambiguity, explanation breve. Todo tenant/resource scoped. No crear precios, grants ni datos definitivos por inferencia.

Propuestas explícitas: quote_request, quote_change, quote_acceptance_candidate, payment_report_candidate además de tipos V2. Mapear/reutilizar tipos equivalentes existentes, no duplicar. Mensaje natural: Me cotizas doce lavamanos; Cuánto salen veinte; Necesito precio para mi ferretería. No tratar una mención casual o negación como solicitud. Si no hay interpretación segura, sugerir aclaración al asesor.

Con varios intentos, guardar una evaluación del inbound y propuestas distintas vinculadas, sin duplicar cliente/oportunidad/ticket. Responder información pública permitida y tramitar cotización; si solicita persona, priorizar handoff/pause y dejar resto al asesor. Una pregunta para dato faltante a la vez, no repetir nombre/ciudad/producto ya confirmado. Responder catálogo no exige completar ficha. Sin extracción AI disponible, acciones manuales siguen funcionando y no fingir detección.

Texto público adicional A21, automático solo si propuesta/ticket quedó guardado y se cumple política V2: Voy a dejar tu solicitud de cotización para que un asesor revise los productos y el precio. Si falta producto usar A04; si falta ciudad A05. Evitar A08 preguntando cantidad ya conocida: usar A21. A21 no afirma cotización emitida ni enviada. Texto fijo, no paráfrasis LLM automática.

## 4. Solicitud → borrador → documento → envío

Tarjeta Solicitud de cotización detectada. Mostrar producto/variante/condición/cantidad/unidad y pendientes. Botones Preparar cotización, Editar datos, Descartar. Preparar abre editor existente prellenado; no emite, aprueba ni envía. Ruta manual produce mismo resultado, con sourceType llamada/visita/manual y evidencia registrada.

Producto: selección muestra imagen aprobada, modelo, variante, condición y unidad comercial. No completar set/accesorios sin composición publicada. Sanitarios/tanques/lavamanos similares requieren selección explícita cuando ambiguos. No sustituir calidad, color, modelo ni unidades por disponibilidad inferida. Campo pendiente muestra Por confirmar y bloquea emisión si afecta términos. Mantener condiciones de precio Showroom/>10/Segunda/Viajes sin inventar reglas numéricas adicionales.

Editor: Guardar borrador, Solicitar aprobación cuando aplica, y Emitir cotización cuando términos completos/aprobación vigente. Emitir genera número único y versión con snapshot; no equivale a enviar. Si el estado actual no tiene emitida, representar emisión como artefacto/evento versionado compatible sin remodelar estados históricos. Draft/emitida/enviada son conceptos distintos, no inventar valor de enum sin mapping documentado.

Al emitir: modal Revisar cotización con cliente/contacto, líneas, moneda, totales, condiciones, fecha validez explícita, aprobación y destinatario si se conoce. Botón Emitir cotización; éxito Cotización emitida. Acciones Descargar PDF, Revisar y enviar por WhatsApp, Abrir cotización. No validez default inventada: usar regla aprobada existente o exigir fecha al humano. Solo BOB V1 salvo soporte existente verificado; no cambio moneda automático.

PDF lleva emisor aprobado, número/versión, fecha/validez, cliente según datos autorizados, productos/unidades/cantidades, totales y términos revisados. No QR/banco ni textos legales improvisados. Diferenciar vista borrador con Borrador · No emitido; descarga de borrador si existente lleva marca clara. PDF emitido inmutable, regenerable desde mismo snapshot si determinístico; hash y versión persistentes. Nunca PDF del estado mutable actual con número de versión antigua.

Descarga: disponible con permiso desde conversación/Cliente360/Cotizaciones, misma referencia, nombre seguro Cotizacion-{numero}-v{version}.pdf. Preview privada. Descargar registra evento técnico apropiado sin marcar enviada/aceptada. Botón no cambia estado comercial.

WhatsApp: revisión muestra contacto/número destino, línea emisora, PDF exacto, versión y texto H02. Enviar cotización encola una sola intención autorizada. En cola/Enviado/Entregado/Leído/Incierto separados. Ventana proveedor cerrada exige plantilla aprobada compatible; no enviar libre para eludirla. Cambio de términos/aprobación/permiso antes de envío cancela candidato stale. Cliente que pidió descarga puede recibir PDF por WhatsApp; no necesita cuenta en ISALWA. Enlace público permanente prohibido.

## 5. Cambios y aceptación del cliente

Mejor quince en lugar de veinte genera propuesta Cambio solicitado con referencia y diff cantidad20→15. Borrador se edita al confirmar; emitida crea revisión y conserva anterior. Nueva revisión invalida aprobaciones/artefactos pendientes afectados. Mensaje ya enviado no se reescribe. No convertir entrega/lectura en aceptación.

Posible aceptación requiere referencia razonable a quote/version y mensaje. Sí, los doce después de una sola quote puede ser candidato; ok aislado, varias quotes, cambio de cantidad/precio o pregunta pendiente = ambiguo. Mostrar revisión, no creación automática de pedido. AI jamás fija aceptación definitiva ni interpreta comprobante como aceptación contractual universal.

Tarjeta Posible aceptación de cotización. Mostrar número/versión/validez/términos y mensaje fuente literal autorizado. Botones Revisar aceptación, Pedir confirmación, Descartar. Revisar abre modal Registrar aceptación: versión, productos/cantidades/totales, fecha/canal, evidencia, observaciones opcionales. Botón Registrar aceptación. Pedido requiere después Crear pedido explícito y revalidación. Si se agrupa wizard, ambos consentimientos siguen visibles; no marcar enviada si aceptación fue por llamada.

Pedir confirmación prepara borrador H07: ¿Confirmas que deseas continuar con la cotización {numero}, versión {version}, por Bs {total}? Humano revisa/envía. No nueva automatización de aceptación por la respuesta. Aceptación manual desde cliente/quote usa mismo modal, canal [WhatsApp,Llamada,Visita,Presencial,Otro], evidencia/nota y actor; no fabricar mensaje cliente. Quote expirada exige revisar/reemitir términos antes de crear pedido. Si cliente acepta versión anterior con revisión vigente, bloquear hasta aclarar; no elegir automáticamente.

Corrección de aceptación o pedido no borra historial. Reutilizar cancel/revision existentes; si no existe contrato para cambios posteriores a despacho/pago, registrar solicitud y escalar decisión, no crear cascada destructiva. Pedido creado no dispara fabricación automática: quemas mixtas y flujo existente permanecen.

## 6. Pagos Bolivia: instrucciones y registro

Extender conocimiento comercial aprobado con Instrucciones de pago en /administracion/comercial/conocimiento. No nuevo proveedor bancario V1. Contenido por tenant y versión: método QR/Transferencia, titular público autorizado, banco/cuenta cuando aplica, moneda, archivo QR aprobado, nota pública, vigencia, aprobador/publicación. No inventar datos ni reutilizar cuenta del desarrollador. No guardar credenciales bancarias. QR estático proporcionado y validado por persona autorizada; no QR dinámico/monto específico sin integración futura aprobada.

Autoridad propuesta si falta equivalente: commercial.payment_instructions.publish, distinta de payments.confirm. Publicador no se autoasigna scope. Cambios de destino requieren aprobador distinto con ese permiso; sin segunda persona autorizada, quedan borrador hasta decisión de Carmen/ISALWA, no workaround. Registrar versión y auditoría, retiros inmediatos. Documento de datos bancarios recibido por cliente nunca puede publicarse automáticamente como instrucción de ISALWA. Permiso de compartir se mapea a alcance comercial existente, no concede publicación.

Compartir instrucciones de pago abre preview: método, destino aprobado, moneda, QR legible, pedido/quote opcional e importe solo como referencia si validado. Texto H08 QR: Te comparto el QR de pago de ISALWA. Verifica el nombre del destinatario antes de pagar y envíanos el comprobante para su revisión. Texto H09 transferencia: Te comparto los datos de transferencia aprobados de ISALWA: {datos_publicos_aprobados}. Envíanos el comprobante para que Contabilidad verifique la recepción. Siempre revisión/envío humano. No prometer acreditación instantánea. Si falta configuración: No hay instrucciones de pago aprobadas para compartir. No impedir otras consultas.

Al encolar y enviar recheck publicación/versión. Cambio/retirada cancela envío pendiente con Las instrucciones de pago cambiaron. Revisa la versión vigente. Material ya enviado conserva evidencia de su destino; no afirmar que se pudo revocar una imagen enviada. Potencial destino erróneo genera incidente interno urgente a Contabilidad y supervisor configurados; humano decide comunicación al cliente.

Pago reportado: total y medios [QR,Efectivo,Transferencia,Otro], monto por medio, fecha, referencia opcional, comprobante(s), moneda, actor y receptor efectivo cuando aplica. Efectivo requiere seleccionar miembro receptor autorizado o registrar Receptor por confirmar con motivo: en este último caso no confirmar fondos hasta resolver. Customer said paid sin comprobante permite reporte con evidencia de mensaje, no confirmación. Contabilidad valida según proceso humano; no simular conciliación bancaria o conexión TR4/SIAT.

Parcial/anticipo: pago existe independiente de asignación. Asignaciones explícitas a uno/varios pedidos del mismo cliente/tenant, suma<=importe confirmado, restante Anticipo sin asignar. Proponer asignación no ejecutarla. Reutilizar modelo existente o extensión mínima; no inventar contabilidad general. Asesor reporta intención; Contabilidad confirma/reasigna monto con permiso y auditoría. Nunca autoaplicar al pedido más reciente. Importe reportado y confirmado se muestran distintos. Si no hay totalidad de datos externos, etiqueta Pagos registrados en ISALWA, no saldo contable definitivo.

Hash de archivo y referencias normalizadas detectan posible duplicado por tenant/permiso: Este comprobante podría estar registrado. Revisar posible duplicado. Hash no prueba fraude ni igualdad de pago; referencias no siempre únicas. Si registro restringido, aviso genérico sin revelar cliente/importe; derivar a Contabilidad. Retry exacto sí dedup determinístico. Corrección/rechazo/reversión no sobrescribe original; referencia a ambos. Reembolso/contracargo/sobrepago no ejecutan dinero: registrar incidencia para Contabilidad, sin botón de refund ficticio.

## 7. Continuidad, múltiples líneas y preferencias del cliente

Separar responsable de cuenta, encargado de conversación y responsable de compromiso. Mostrar los tres cuando difieren. Cobertura acotada permite continuar según grant, no transfiere propiedad. Si miembro ausente/revocado: chat abierto va a cola autorizada de relevo, propuestas y compromisos quedan con responsable pendiente hasta reasignación explícita; no perder trabajo ni asignar al exusuario.

Mismo cliente en varias líneas: sugerencia Atención relacionada con enlaces solo autorizados y resumen mínimo. No unir mensajes/identidades automáticamente ni afirmar mismo interlocutor por teléfono compartido. Mantener receivingLine y thread. Notificar solapamiento al encargado actual/owner con dedup; no ampliar lectura para resolverlo. Sales humano coordina, no bloqueo universal de cliente que impide múltiples solicitudes legítimas.

Audio/fotos: mostrar original permitido, hora y estado No analizado automáticamente cuando no procesado. A20 solo si archivo realmente recibido/accesible; de otro modo No pudimos recibir el archivo. ¿Puedes enviarlo nuevamente? Nunca inventar transcripción ni marcar revisado. Adjuntos agrupados no crean un pago por cada imagen. Revisión humana identifica qué evidencia corresponde a qué reporte.

Solicitud de no contacto: distinguir no más promociones de no me escriban. Registrar preferencia por contacto/canal/tenant, fuente y confirmación humana de vínculo cuando identidad ambigua. Detener followup opcional/marketing inmediatamente de forma conservadora; no borrar registros ni bloquear respuesta solicitada por cliente sin revisar contexto. Plantilla A22: Entendido. Dejaremos de enviarte seguimientos no solicitados por este canal. Solo enviar tras persistir preferencia; no prometer prohibición absoluta de toda comunicación cuando no es lo registrado. No inferir opt-in por un sí genérico. Marketing masivo sigue deshabilitado.

## 8. Notificaciones, responsable y siguiente acción

Reutilizar notificaciones V2, no segundo bus. Eventos persistidos en misma transacción que cambio; entrega después. Dedup por evento+destinatario; mismo usuario con varios cargos recibe una sola. Contenido según permiso actual; ningún aviso concede acceso. Emails sin mensajes/comprobantes/datos bancarios. Sound opt-in y no por cada token/mensaje. Read!=ack!=resuelto. Resolver el trabajo cierra su aviso accionable; conserva historia.

| Evento | Destinatario | Cuándo / CTA | Cancelación/escalamiento |
|---|---|---|---|
| Solicitud quote | Encargado chat; sin encargado cola comercial autorizada | Inmediato UI, Preparar cotización | Confirmar preparación cierra aviso; unassigned sigue regla handoff15min V2 |
| Aprobación solicitada | Aprobador(s) explícitos para alcance | Inmediato UI, Revisar solicitud | Edición/retirada invalida; no autoaprobar por plazo |
| Aprobada/rechazada | Solicitante vigente | Inmediato UI, Revisar cotización | Dedup por decisión/version; no autoenvío |
| Posible aceptación | Encargado chat vigente | Inmediato UI, Revisar aceptación | Descartar/clarificar/registrar cierra; inbound que cambia términos vuelve stale |
| Pedido registrado | Encargado y owner autorizados distintos | Inmediato UI, Abrir pedido | No notificación fabricación automática; ops flujo existente |
| Pago reportado | Verificador Accounting asignado, si no cola Accounting configurada | Inmediato UI, Verificar pago | Confirmar/rechazar cierra; sin responsable readiness bloqueada para pagos |
| Pago confirmado/rechazado/revertido | Reportante y owner autorizados | Inmediato UI, Ver resultado | Nunca enviar H06 al cliente automáticamente |
| Instrucción de pago sospechosa/errónea | Contabilidad y supervisor configurados | Inmediato UI, Revisar incidente | Email5min sin ack según V2; pausa envío afectado |
| Handoff/reclamo | Encargado/cola correspondiente | Inmediato UI y sonido opt-in, Tomar conversación | Manager15min sin tomar; email5min sin ack según V2 |
| Compromiso | Responsable actual | V2:60min antes/al vencer, Abrir compromiso | Cumplir/cancelar/reasignar cancela pendientes obsoletos |
| Envío fallido/incierto | Iniciador autorizado o relevo | Inmediato UI, Revisar envío | Definitivo permite retry; incierto reconciliar, no retry ciego |
| Atención solapada | Encargado y owner con acceso a relación | Una vez por episodio, Revisar atención | Al coordinar/reasignar cerrar, no spam por cada mensaje |

Evento quote/payment no genera email por defecto; respetar preferencias y escalamiento V2, no ampliar indiscriminadamente. Si destinatario no existe o perdió permiso, enviar a cola configurada autorizada; si no hay cola, falla operativa visible a configurador autorizado sin fuga. Nunca fallback automático a Carmen. Jobs verifican estado actual antes de entregar para evitar avisos de trabajo ya terminado.

## 9. Integridad de transiciones y eventos

No nombres de eventos nuevos antes de mapear existentes. Contratos a cubrir: quote.request.detected, quote.draft.created, quote.issued, quote.send.queued, quote.customer_acceptance.recorded, order.created, payment.reported/confirmed/rejected/reversed, payment_instructions.published/retired, contact.followup_preference.changed. Reutilizar equivalentes y registrar mapping. Detección AI es derivado/propuesta, no evento que afirma decisión de cliente.

Cada transición guarda source, actor, tenant, version y vínculo. Idempotencia org+actor+command+payload y current auth de V2. Dos aceptaciones simultáneas no crean dos pedidos; dos verificadores no confirman/rechazan el mismo pago sin conflicto; dos emisores no comparten número; cambio quote pendiente cancela envío incompatible. Transacciones locales + outbox, sin llamada externa dentro de transacción larga. Archivos/PDF fallidos no dejan estado emitido con documento inexistente: estado de generación recuperable e idempotente, no éxito falso.

AI summary muestra Resumen asistido · Actualizado {fecha_hora}, fuentes y límite de cobertura; no sobrescribe campos confirmados ni afirma que revisó mensajes fuera de su watermark. Mensaje nuevo indica Resumen pendiente de actualización hasta recomputar. Datos críticos (pago confirmado, precio aprobado, fecha comprometida) vienen de records, no summary. Revisión de propuesta stale obliga revisar evidencia reciente.

## 10. Incorporación al plan sin duplicar trabajo

T00 mapa A1→modelos/rutas/permiso/command/event/test; T03 identidad/link/multilínea/preferencias; T04 emisión/revisión/aceptación/PDF; T05 conocimiento/instrucciones pago; T06 proposals/manualcontext/multilínea; T07 tender/asignación/duplicados/pagos; T08 promesas; T09 matriz avisos; T10–11 UI/contexto/accesibilidad; T12 provider/adjuntos/estados; T13 A21/A22 y routing mixto; T14 extracción/candidatos/resumen; T15 send/acceptance/order; T16 métricas; T17 operación/races; T18–20 revisión/journeys/entrega. Tareas ya cerradas se reabren solo para delta afectado, no repetir todo.

Pendiente externo no detiene implementación local. No importar cuentas bancarias/datos reales ni publicar configuración ficticia. Fixtures sintéticos claramente rotulados. Mantener scopes propuestos como mapping, no conferir grants reales. Si se necesita nueva autoridad de negocio no definida aquí, escalar caso concreto y continuar lo independiente.

## 11. Evidencia adicional obligatoria

A1-J01 cliente pide quote con alias/typos y tres intentos: información pública correcta, una propuesta, no duplicados ni preguntas repetidas.
A1-J02 manual llamada y AI llegan al mismo editor; reload conserva draft; PDF se descarga y match hash/version emitida; descarga no marca enviada.
A1-J03 quote revisada entre preparación/envío: envío viejo bloqueado; aprobación invalidada; original preservado.
A1-J04 ok con dos quotes: no order; clarificación humana; aceptación por llamada registrada con fuente; expired quote bloqueada.
A1-J05 doble click/concurrencia accept/create produce un order; perdedor recibe resultado seguro/conflicto sin datos ajenos.
A1-J06 QR aprobado compartido por humano; QR entrante malicioso no cambia destino; retirar versión cancela pending send.
A1-J07 pagoQR+cash parcial, anticipo y asignaciones múltiples sin exceso; efectivo receptor pendiente no confirma; comprobante duplicado avisa sin fuga.
A1-J08 notificación llega solo a roles correctos, read/ack/resolve separados, revocación/reasignación cancela aviso stale, dos tabs no duplican sonido.
A1-J09 cliente escribe a dos líneas, no duplicateParty/auto merge; asesor no autorizado no ve relación/historia.
A1-J10 voz sin transcripción no contiene resumen inventado; cuatro fotos no crean cuatro pagos; opt-out cancela seguimiento.
A1-J11 repetir todos los IDs críticos entre dos tenants sintéticos: quote/PDF/payment/instructions/proposal/notification/media/replay/cache/webhook; status seguro y cero escritura/envío/fuga en cada intento.
A1-J12 caída PDF/DB/provider y sesión expirada durante revisión: error honesto, draft protegido, sin duplicado ni supuesto éxito.

Por caso usar evidencia §23 V2: actor/tenant, inputs, pasos, antes/después, HTTP/DB/UI relevantes, versión probada, archivo/hashes y limitaciones. Pruebas fake no equivalen PG/HTTP/provider. No fixtures como prueba live; no auto-revisión como independiente. Rectificar también receipts afectados. Ningún PASS sustituye evidencia.

## 12. Prompt para Cursor

Incorpora este Addendum A1 al plan V2 vigente. Guarda copia exacta en docs/product/COMMERCIAL_INTERACTIONS_A1.md, registra SHA y actualiza el mapa/checkpoint con los criterios afectados. Mantén la autorización local y gates externos del V2.

Si aún no empezaste, inicia T00 del V2 incorporando A1. Si ya empezaste, termina el subpaso en estado seguro, revisa el delta de A1 y ajusta las tareas afectadas sin resetear ni reescribir evidencia histórica. Continúa secuencialmente trabajo local autorizado; no esperes otra asignación por rutina.

Implementa contratos completos: trigger, contexto/evidencia, propuesta/formulario, confirmación humana, comando autorizado, persistencia, efecto externo, destinatario/acción y recovery. Manual y AI usan los mismos comandos. Respeta copy, colores y ubicaciones definidas. No inventes políticas comerciales ni información empresarial faltante.

Tenant isolation y permiso de recurso son obligatorios en cada paso, también propuestas AI, PDF, destinos de pago, búsquedas, notificaciones, jobs, caches y conexiones. Otra organización no recibe datos, conteos ni efectos; pertenecer al mismo tenant tampoco concede poderes ilimitados.

Reporta por tarea qué comportamiento existe ahora, palabras/controles efectivos, evidencia reproducible, versiones probadas y bloqueos reales. No declares completitud por conteo de tests ni PASS. Mantén separados local, proveedor real, revisión independiente, desplegado, journey y aceptación. Sigue el siguiente trabajo habilitado automáticamente.
