# ISALWA — Plan maestro de ejecución comercial V2

Fecha: 2026-10-16. Autor: ingeniero de Carmen. Estado: encargo consolidado de implementación local solicitado por Carmen. Se activa al entregarlo a Cursor con el prompt de §22. Sustituye V1 e incorpora navegación, usabilidad, seguridad por tarea, operación y capacidad. No afirma implementación ni autorización de despliegue. Las reglas de integridad y seguridad permanecen.

## 1. Resultado y límites

Un asesor debe atender una consulta real por WhatsApp, llamada o visita; reconocer o registrar al cliente; consultar productos; preparar una cotización; obtener la aprobación necesaria; enviarla por el mismo chat; registrar pedido, pago reportado y compromisos; y continuar el seguimiento sin volver a capturar la información. Otro asesor autorizado debe poder continuar con el contexto completo. Gerencia debe ver pendientes y resultados reales. Contabilidad confirma fondos y conserva la autoridad contable.

Se extiende apps/os-web + apps/os-api y los paquetes OS existentes. No construir otro CRM, otra identidad de cliente, otro almacén, otro sistema contable ni otra aplicación de chat. Conservar datos y funciones operativas existentes. No mezclar apps/web legado con os-web. No asumir que el código recibido coincide con lo desplegado.

Enmiendas de este encargo: Comercial conectado es la prioridad de entrega; mapa básico vuelve a alcance; IA puede crear propuestas aceptadas mediante comandos normales y responder automáticamente contenido público aprobado; se amplía configuración solo para conocimiento comercial, conexiones y preferencias necesarias. No se levantan indiscriminadamente los holds de Administración/Auditoría.

La venta inmediata recibe una entrada rápida sobre Cliente → Oportunidad → Cotización → Pedido, con pasos agrupados y valores explícitos. No se crea una entidad Sale ni se fabrica aprobación, aceptación del cliente, despacho o cobro. Si el contrato actual no permite agrupar un paso, se mantiene visible hasta que el ingeniero apruebe su cambio.

## 2. Evidencia y correcciones de deriva

Fuentes recibidas: paquete ISALWA_ENGINEERING_TAKEOVER_20261016_TRANSFER.zip, SHA256 539bd75d05b73162c26a0bd81aec5630c47419f6138c6c498cbb8ab265290336; originales O07/O08/O09/O18/O21/O23; CatalogoVitriCompleto2026.pdf; ISALWA_OS_Vision_y_Arquitectura.docx; recuperación de Cursor pegada por Carmen; JSON de Supabase aportados por Carmen.

JSON workspace: Pasted text(20261016-201910).txt, conversationMemory.knownFacts = 38 registros; meetings = 6. JSON activo Pasted text(20261016-202246).txt conserva las mismas 38 facts y 13 turnos, con solo yes como respuesta de esa sesión. Seis exportaciones de conversaciones posteriores conservan snapshots de 26–38 facts, sin nuevas facts únicas. No son 38 respuestas independientes verificadas; incluyen inferencias erróneas. El participante registrado es Carmen: no atribuir cada frase a Álvaro o Isa sin evidencia.

Usar evidence textual y respuestas conservadas, no los porcentajes de confianza generados. Architect clasificó servicios cuando una respuesta dice productos, añadió cuellos de aprobación contra una respuesta que dice que son raros, y enlazó evidencia no relacionada. No importar esas inferencias como verdad comercial.

Hechos de diseño: tres asesores; atención WhatsApp/visitas; venta en camioneta a ferreterías; pérdida de historial; necesidad de nombre/dirección/teléfono/histórico; TR4 fuera del acceso de vendedores; SIAT/TR4 y validación de fondos por Contabilidad; validar stock con Almacén; geografía y rutas son necesidad real. Deseo de número compartido en julio; números corporativos por asesor en relay de septiembre. No imponer tres números ni migrar líneas sin verificar la situación actual.

Isa: asesor registra clientes; un propietario por cuenta y cobertura explícita; cobertura puede modificar y continuar dentro de su alcance; jefe ve trabajo del equipo sin administración técnica; descuentos especiales requieren autoridad comercial. Precio por Showroom, Más de 10 unidades, Calidad Segunda, Viajes son contextos recuperados, no tarifas ni umbrales implementables completos. Producción por quemas mixtas, no por pedido; fecha cliente y fecha interna separadas. Pago puede tener excepción autorizada. Documento recuperado muestra pago mixto QR+efectivo.

No hay precios numéricos actuales aprobados recuperados. No inventar horarios, dirección, banco/QR, garantía, capacidad de stock, plazos ni nombre del responsable por cargo. Estos son datos configurables; su ausencia desactiva esa respuesta específica, no el resto del producto.

## 3. Identidad de implementación y gobierno

Escritor Mac: /Users/carmen/projects/isalwa-wt-v1-repairs, branch ct3/v1-repairs, HEAD inicial 7fe8772a0918dbe759577c2e77edf2b2beebb200 + 19 paths S11. Verificado por Cursor; comprobar al inicio de T00. Preservar esos cambios. No reset/stash/clean, no recrear worktrees eliminados, no tocar primary preserve/main-wip-20261001, stash oa4-wip ni otros trabajos.

Una tarea activa, un escritor. Implementar, verificar y registrar cada tarea antes de la siguiente. No mantener un turno abierto releyendo toda la historia. Cada tarea lee este documento, el checkpoint y los archivos concretos afectados. Un commit local por tarea aprobada; si una tarea necesita separación técnica, registrar subcommits sin mezclar otra tarea. Implementación y commits locales T00–T20 autorizados por §16. Push, merge y deploy requieren autorización de entrega correspondiente; no activación externa implícita.

Cursor puede resolver tipos, queries, índices, componentes, validación, errores, fallos de pruebas y bugs del mismo flujo, con cambios mínimos. Puede añadir tablas/campos faltantes aquí especificados después de demostrar que no existen equivalentes. Reutilizar repositorios, transacciones, contratos y eventos actuales. No tabla paralela cuando ya exista el concepto. Los nombres nuevos de comandos de este documento son contratos propuestos a mapear, no afirmaciones de que ya existen.

Escalar al ingeniero si requiere cambiar autoridad, política/precio, significado de estado, datos históricos, proveedor, costo fuera de límites, contrato de otra área o migración destructiva. Dejar intacto lo que no puede decidir; continuar solo con tareas independientes ya habilitadas. No pedir a Carmen decisiones de programación rutinarias. Ante contradicción entre este documento y código, reportar la evidencia y aplicar la intención aquí explícita cuando esté aprobada; no tratar un bug previo como política.

## 4. Diseño visual obligatorio

Reutilizar @isalwa/ui Button, Panel, StatusPill, ContextDrawer y estilos de apps/os-web/app/globals.css, tokens en packages/ui/src/tokens/tokens.css. No rediseñar marca ni añadir librería UI.

| Uso | Color / token |
|---|---|
| Fondo | porcelana #F6F1E8 |
| Panel de trabajo | blanco #FFFFFF |
| Texto/títulos/acción primaria | navy #18324B |
| Hover primario | #12263D |
| Acción contextual | teal #287A78; hover #1D635F |
| Selección | #E2F0ED |
| Contexto/IA | #EDF5F8 |
| Texto secundario os-web | #4A5D73 |
| Confirmado | texto #3A7A52 / fondo #E7F4EC |
| Pendiente/advertencia | texto navy con icono ámbar #B8872E / fondo #FFF5DB |
| Error/rechazado | #A63D36 / fondo #FBE9E7 |

Color nunca es la única señal. Verificar contraste; ámbar no se usa para texto pequeño sobre blanco. Focus visible 3px teal; errores con texto y foco al primer error. Respetar reduced-motion. Fuente operativa Plus Jakarta Sans/Segoe UI/sans-serif existente; no descargar nuevas fuentes. Campos y mensajes 16px; metadatos 13px; encabezados de página estilo existente. Botones mínimo 44px alto, iconos con etiqueta accesible; radius controles 8px/paneles 16px. Padding panel 16px móvil/24px escritorio. Una acción primaria visible por contexto; acciones secundarias con borde navy. Destructivas en menú con confirmación, nunca junto a Enviar como acción primaria.

Desktop >=1200px: menú lateral existente; conversación lista 300px, hilo flexible mínimo 420px, contexto 320px. 768–1199px: lista 280px + hilo, contexto drawer. <768px: lista o hilo a ancho completo; Volver a conversaciones arriba; Ver cliente abre drawer. Móvil: barra inferior Hoy, Chats, Clientes, Más; Más contiene Comercial, Catálogo, Mapa y funciones autorizadas. Mantener menú desktop y accesos profundos existentes.

Nuevos botones primarios a la derecha del título; en móvil debajo del título a ancho completo. Formularios drawer desktop hasta 560px, full-screen móvil. Footer Guardar/Cancelar fijo dentro del drawer, nunca tapa errores. Tabla 25 por página, búsqueda servidor, filtros/selección en URL, Back conserva estado. No descarga de tenant completo en el cliente.

No cambiar colores globales fuera de os-web ni formatos históricos PDF salvo tarea explícita. Todo texto nuevo centralizado por módulo en copy.ts; nombres accesibles iguales a etiquetas visibles.

## 5. Navegación y pantallas

No renombrar URLs canónicas existentes. Menú: Hoy (/inicio), Conversaciones (/conversaciones), Clientes (/clientes), Comercial (grupo con /oportunidades, /cotizaciones, /pedidos), Catálogo (/productos), Mapa (/mapa). Operaciones en grupo secundario por permisos. Administración/configuración solo a autorizados. Evitar duplicar /mensajes como una segunda bandeja: mantener enlace/redirect compatible hacia conversaciones donde corresponda.

### 5.1 Hoy — /inicio

Título Hoy. Subtítulo Tu atención y tus próximos compromisos. Selector Mi trabajo / Mi equipo / Empresa solo según autoridad. Orden fijo: conversaciones pendientes, compromisos vencidos/hoy, cotizaciones pendientes, pagos por verificar (solo lectores autorizados), aprobaciones asignadas. No tarjetas vacías fingiendo ceros: error = No pudimos cargar estos datos. Reintentar; vacío = No tienes pendientes en esta sección.

Fila: cliente, asunto, responsable, vencimiento, estado, botón contextual Abrir. Click lleva al recurso exacto y conserva filtro. Encabezado derecho Registrar atención abre el formulario 5.3. No estadísticas de ingresos sin fuente. Mostrar actualizado a HH:mm y Actualizar; no banner triunfal de negocio saludable sin base.

### 5.2 Conversaciones — /conversaciones

Título Conversaciones. Botón secundario Registrar atención arriba derecha. Filtros Todos, Sin asignar, Mis chats, Por responder, Seguimiento; búsqueda Buscar cliente, teléfono o conversación. Manager puede filtrar equipo; el filtro nunca amplía permisos.

Lista: nombre confirmado o teléfono, preview último mensaje, tiempo, responsable, estado y contador no leído. AI suggestion badge Propuesta pendiente solo si existe. No convertir perfil WhatsApp en nombre confirmado. Orden por atención pendiente y última actividad, estable con cursor.

Hilo header: nombre/teléfono, canal + línea receptora, responsable, estado. Botones Tomar conversación, Asignar (si autoridad), Ver cliente; menú Resolver/Reabrir. Asignación inicial: contacto existente → propietario activo autorizado; si no, cola Sin asignar. Sin round robin ni geografía automáticos V1. Claim concurrente tiene un ganador y muestra Ya la tomó {asesor}. No reasignar cuenta al asignar chat.

Estados de atención: Nueva, En atención, Esperando al cliente, Esperando al equipo, Resuelta. Control IA separado: Respuestas automáticas activas / IA pausada. Tomar conversación y enviar mensaje humano pausan IA automáticamente. Reanudar respuestas automáticas es acción explícita y no devuelve propiedad de la cuenta a nadie. Un mensaje nuevo reabre conversación resuelta y reinicia atención.

Compositor fijo inferior: tabs Mensaje / Nota interna; placeholder Escribe un mensaje… o Escribe una nota para el equipo…; adjuntar con etiqueta Adjuntar archivo. Botón navy Enviar; secundaria Guardar nota interna en modo nota. Notas fondo cielo, encabezado Solo equipo; jamás cruzan el adaptador WhatsApp. Enter envía texto, Shift+Enter nueva línea; no envío mientras IME composing. Seleccionar mensaje/archivo no dispara envío.

Estado mensaje: En cola, Enviado, Entregado, Leído, No enviado, Resultado por confirmar. Solo webhook autoritativo cambia entrega/lectura; API aceptación no significa entrega. Error conserva texto y ofrece Reintentar solo si fracaso definitivo; resultado incierto no se reenvía automáticamente. Mostrar No pudimos confirmar el envío. Revisa el estado antes de reenviar.

Debajo header de hilo, indicador Fuera del horario de atención si horario aprobado; no inventar horario. Fuera ventana proveedor: no enviar texto libre; banner Para retomar este chat, usa una plantilla aprobada. Botón Elegir plantilla; si no existe: No hay una plantilla aprobada disponible. Manual entry sigue funcionando, no se simula envío externo.

Panel derecho: Cliente (Vincular cliente / Registrar cliente), Responsable de cuenta, resumen asistido con enlaces de evidencia, cotizaciones activas, pagos visibles por permiso, compromisos, incidencias. Acciones Preparar cotización, Registrar pago, Crear compromiso, Reportar problema; abren registros existentes con referencias al chat. Propuesta IA tiene chips campo actual → propuesto, fuente, Editar, Confirmar datos, Descartar. Confirmar no envía mensaje al cliente.

### 5.3 Registrar atención — mismo modelo de interacciones

Drawer título Registrar atención. Campos Canal [Llamada, Visita, Atención presencial, Registro manual de WhatsApp]; Cliente buscar/registrar; Contacto opcional; Fecha y hora default ahora editable; Motivo [Consulta, Cotización, Pedido, Pago, Reclamo, Seguimiento, Otro]; Nota requerida; Próximo paso opcional con responsable y vencimiento. Botón Guardar atención; éxito Atención guardada. Abrir historial. No llamada grabada, transcripción ni telefonía externa V1.

### 5.4 Clientes y Cliente 360

/clientes: título Clientes; botón Registrar cliente; búsqueda Buscar por nombre, teléfono o empresa. Alta primero busca coincidencias: Este teléfono ya aparece en estos registros. Opciones Vincular contacto, Abrir cliente, Registrar otro cliente con motivo obligatorio. Nunca bloquear legítimo teléfono compartido ni fusionar sin permiso.

Drawer alta: tipo Empresa / Persona; Nombre de la empresa o Nombre completo; Nombre del contacto cuando Empresa; Teléfono (país + número, default Bolivia +591 editable); Ciudad; Departamento; Dirección o referencia opcional; Responsable default actor para asesor; Interés de producto opcional. Un método de contacto o motivo Sin teléfono disponible. Captura provisional de chat no requiere ficha completa. Guardar cliente confirma datos persistentes explícitos; sin NIT obligatorio para consulta, sin correo obligatorio, sin coordenada inventada.

Cliente 360 mantiene tabs Resumen, Comercial, Operación, Trabajo, Documentos, Historial. No pestaña nueva redundante de pagos. Resumen: datos, responsable, cobertura y próximos pasos. Comercial: oportunidades/cotizaciones/pedidos. Trabajo: compromisos/incidencias. Documentos: catálogo enviado, cotizaciones emitidas, comprobantes y facturas externas con tipo y fuente. Historial: una secuencia con actor/canal/fecha/enlace, paginada; incluye correcciones, anulaciones y handovers. Nunca sustituir historial derivado legado al añadir eventos.

Clasificación: Cliente potencial / Cliente con pedido registrado como estados derivados; Tipo de cliente [Ferretería, Distribuidor, Particular, Otro] confirmado por humano, sin inferir condiciones de crédito. Etiquetas de interés y zona propuestas por IA requieren confirmar. Calidad Segunda describe condición del producto, no categoría del cliente. Cliente inactivo es una señal por período explícito, no una verdad permanente ni desactivación automática.

### 5.5 Catálogo — /productos

Título Catálogo. Search Buscar producto o modelo. Filtros categorías recuperadas y activos. Cards foto, nombre, categoría, variantes/condición aprobadas, Ver ficha y Agregar a cotización (contextual). Precio solo con lista/contexto activo aprobado; si no: Precio por confirmar. No usar transacción histórica como precio vigente.

Ficha: imágenes aprobadas, descripción, medidas con unidades, compatibilidad confirmada, condición, código interno si autorizado, fuente/página y fecha de revisión. Campos inconsistentes: Especificación pendiente de revisión; excluir esos valores de respuestas automáticas. Botón Compartir catálogo prepara PDF aprobado en conversación para envío humano; auto envío permitido con comando catálogo y versión publicada. Reconciliar preview25 y starter21 con PDF: no inferir que son 25 SKUs distintos; no borrar claves históricas. IDs estables, aliases explícitos. No exponer precio de costo/margen.

### 5.6 Comercial — rutas existentes

Oportunidad: título/cliente, productos/cantidades conocidas, owner, etapas Nueva consulta / En conversación / Cotización preparada / Cotización enviada / Pedido registrado / Cerrada sin pedido. Mapear explícitamente estados existentes; no reescribir pasado ni marcar ganada por IA. Campo Próximo paso + fecha; motivo requerido al cerrar sin pedido.

Quote editor existente: botón Agregar producto; opción Ítem especial; qty, unidad, descripción, precio y descuento explícitos; contexto precio [Showroom, Más de 10 unidades, Calidad Segunda, Viajes]; basis/version aprobado y totales BOB en centavos. Catalog change nunca modifica línea guardada. Sin pricing válido: Pendiente de precio aprobado. Puede guardar borrador, no emitir como oferta válida.

Footer: Guardar borrador navy; Solicitar aprobación cuando necesita excepción; después Revisar y enviar. Modal revisión: cliente/contacto/línea WhatsApp, versión PDF inmutable, productos, totales, validez, condiciones, aprobación y texto exacto a enviar; botón Enviar cotización. Cualquier cambio relevante invalida aprobación y artefacto pendiente; recheck al encolar y al enviar. Mensaje lleva versión guardada, no proyección retrasada. Prohibida autoaprobación; aprobación con autoridad explícita, actor y fecha. Sin límites aprobados, todo precio manual sin base válida requiere aprobación del propietario autorizado de ISALWA (no inferir que Carmen es ese aprobador).

Convertir en pedido visible para propietario/cobertura explícita/convertidor autorizado; revalidación actual, aprobación y evidencia de aceptación. Confirmación Crear pedido; éxito Pedido registrado; link al pedido. No despacho ni producción ni cobro implícito.

Entrada rápida desde Cliente 360 / conversación: Registrar pedido abre wizard de 3 pasos Cliente y productos → Condiciones y revisión → Registrar. Reutiliza quote/order commands, evidencia de acuerdo con cliente requerida y pasos agrupados. Si falta precio, solicita aprobación. No hace pasar una cotización no enviada por enviada ni una aceptación interna por aceptación cliente. Guardar relaciones/eventos; fallos parciales retomables, no pedidos duplicados.

### 5.7 Pagos reportados — Cliente 360 y Finanzas existentes

Drawer Registrar pago reportado: cliente, pedido opcional, fecha, moneda BOB, total, medios múltiples [QR, Efectivo, Transferencia, Otro], monto por medio, referencia y comprobante opcionales, observación. Total de medios debe igualar total; cantidades positivas en centavos. Pago sin pedido permitido como anticipo no asignado; no inventar saldo. Botón Guardar pago reportado; éxito Pago reportado. Pendiente de verificación de Contabilidad.

Estados Reportado → Confirmado / Rechazado; corrección de confirmado mediante anulación/reversión autorizada y registro nuevo, sin editar historia. Contabilidad ve /finanzas con filtro Por verificar; Ver comprobante, Confirmar recepción, Rechazar reporte (motivo requerido). Recheck autoridad server. Confirmación modal Confirmar recepción de Bs {importe}; muestra cliente, métodos y evidencia. No confirmar solo porque existe foto, OCR o mensaje del cliente. Confirmado significa validación operativa humana de fondos, no asiento contable ni factura fiscal.

No exigir pago universal para pedido/producción. Excepción comercial autorizada con motivo y evidencia separada; los acuerdos de crédito no se deducen de Distribuidor. No exponer estado financiero privado a contacto no verificado por coincidir teléfono.

### 5.8 Compromisos, problemas y seguimiento

Reutilizar /compromisos y /incidencias. Drawer Crear compromiso: descripción, cliente/contacto, responsable, fecha y hora, fuente mensaje/llamada, recordatorio. Vencimiento obligatorio si se presenta como promesa; una tarea sin fecha muestra Sin fecha, no Vencida. Hora America/La_Paz; guardar UTC y zona. Si fuente dice mañana resolver a fecha absoluta y mostrarla antes de confirmar; si dice pronto pedir fecha, no inventarla. Compromiso interno no equivale a promesa comunicada al cliente; sentMessageId prueba comunicación.

Acciones Marcar cumplido (nota/evidencia), Cambiar fecha (motivo e historial), Reasignar autorizado, Cancelar compromiso (motivo). Renombrar fecha no borra incumplimiento histórico. Fecha de entrega acordada con cliente distinta de objetivo interno producción. Reportar problema vincula cliente/pedido/chat y asigna responsable; resolver requiere resultado y comunicación separada si corresponde.

Seguimiento: esperando cliente + sin nuevo inbound durante 2 días hábiles configurados genera sugerencia interna, no etiqueta cliente perdido. Si no hay calendario aprobado usar 48 horas transcurridas con etiqueta exacta y sin afirmar días hábiles. Cancelar señal al responder cliente, resolver o registrar próxima fecha; no contacto automático inicial. CTA Revisar seguimiento abre borrador, no envía.

### 5.9 Mapa — /mapa

Título Mapa de clientes. Mapa carga solo al abrir página; panel Lista accesible. Filtros responsable, departamento/ciudad, tipo confirmado, con seguimiento, con pedido registrado. Pin solamente ubicación confirmada con coordenadas válidas. Sin coordenadas: Pendiente de ubicación en lista. No geolocalizar teléfono ni centroides como direcciones exactas. Botón Confirmar ubicación desde ficha permite pin manual y muestra dirección/ref, fuente, editor y fecha. Una ciudad puede alimentar agregado por departamento, nunca simular pin exacto.

Pin navy habitual; anillo ámbar con seguimiento vencido, teal seleccionado; etiquetas/iconos además de color. Click tarjeta cliente, interés, responsable, próximo paso, Abrir cliente. No pagos/datos sensibles en popup de mapa por defecto. Sin optimización de rutas ni seguimiento GPS de empleados. Botón Abrir ubicación abre proveedor solo con coordenada confirmada y gesto humano.

### 5.10 Configuración comercial acotada

Extender Administración con subrutas nuevas /administracion/comercial/conocimiento y /administracion/comercial/conexiones, protegidas por permisos específicos. Preferencias usuario en menú perfil, no permiso admin. Conocimiento tiene Empresa, Preguntas frecuentes, Catálogo, Precios y respuestas; draft/review/publish/retire con versión, público/interno y aprobación. Formularios horarios por día + zona y excepciones; ubicación nombre/dirección/map link; FAQ pregunta/aliases/respuesta/fuentes; variantes copy solo publicadas.

Conexiones muestra WhatsApp, Correo, Mapa, IA: No configurado / En prueba / Conectado / Con error; último evento válido y prueba realizada. Secretos nunca retornan a browser/logs; configuración secure env/secret store con IDs, no formularios que revelan tokens existentes. Para conectar línea productiva requiere propietario de cuenta, prueba y gate explícito. Un badge Conectado no significa release verificado.

## 6. Autoridad: reglas funcionales

| Actor funcional | Acceso esperado |
|---|---|
| Asesor | Sus cuentas/chats y cobertura activa; alta comercial limitada; cotizar, reportar pagos, compromisos e incidencias; convertir con autoridad vigente |
| Asesor de cobertura | Acciones comerciales explícitamente delegadas en esa cuenta; fechas de inicio/fin, motivo, revocación; conserva propietario y actor real |
| Jefatura comercial | Lectura de equipo definido, asignación de conversaciones y aprobación solo si scope explícito; no people.admin implícito |
| Gerencia | Lectura comercial de organización y decisiones expresamente asignadas; no superusuario por cargo |
| Contabilidad | Lectura y validación de pagos/reportes autorizados; no asignación de clientes ni acceso a todo por título |
| Configurador comercial | Publicar conocimiento/conexiones según scopes; no otorga permisos laborales |

Reutilizar scopes existentes; propuestos faltantes: commercial.customer.create, conversations.assign, payments.report, payments.confirm, commercial.knowledge.publish, integrations.manage. Nombres finales registrados en matriz sin duplicar sinónimos. Definir scopes de lectura necesarios y distinguir report/confirm. Ningún permiso conferido por Cargo, IA o posesión de URL. No mapear Carmen/Isa/Álvaro a grants reales automáticamente. Pending roster es configuración de negocio, no bloqueo del desarrollo con miembros sintéticos.

Todos los listados, contadores, searches, attachments, exports, jobs, conexiones, cache y replay incluyen organizationId del contexto autenticado. Webhooks resuelven tenant por conexión verificada/phone_number_id, nunca por organizationId del payload de usuario. Actor session, no body. Current resource auth en read y en cada comando/replay/envío. AI context filtra por actor/tenant/visibility. Jobs actúan como principal de servicio limitado, no suplantan asesor.

## 7. IA y lenguaje: contrato exacto V1

Español claro y amable, tuteo respetuoso, sin emojis por defecto. Saludo solo al inicio, sin repetir nombre innecesariamente; máximo una pregunta por mensaje (dos datos relacionados pueden preguntarse juntos). Evitar promesas de respuesta temporal sin dato aprobado. No decir que es humano. Campos {x} son placeholders de datos verificados, nunca literales enviados. Si falta un valor obligatorio, seleccionar fallback; no completar por intuición. Los textos siguientes son plantillas obligatorias; no paráfrasis automática V1 para respuestas públicas. IA generativa propone borradores al asesor; autoenvío solo plantillas aprobadas y render determinístico.

| ID / caso | Texto exacto o plantilla |
|---|---|
| A01 Inicio | Hola, soy el asistente virtual de ISALWA. Puedo ayudarte con productos, cotizaciones o contacto con un asesor. ¿Qué necesitas? |
| A02 Catálogo disponible | Claro, aquí tienes nuestro catálogo. ¿Qué producto te interesa? |
| A03 Catálogo no publicado | Un asesor puede ayudarte a conocer nuestros productos. ¿Qué producto estás buscando? |
| A04 Elegir producto | ¿Qué modelo buscas y cuántas unidades necesitas? |
| A05 Ubicación cliente | ¿En qué ciudad necesitas los productos? |
| A06 Nombre | ¿Me compartes tu nombre y, si corresponde, el de tu negocio? |
| A07 Ficha aprobada | {nombre_producto}: {descripcion_publica_aprobada}. {especificacion_aprobada_opcional} |
| A08 Precio | Para confirmar el precio que corresponde a tu compra, necesito que un asesor revise tu solicitud. ¿Cuántas unidades necesitas? |
| A09 Stock/plazo | Un asesor debe confirmar la disponibilidad y la fecha de entrega. Voy a dejarle tu consulta. |
| A10 Horario conocido | Nuestro horario de atención es {horario_publicado}. |
| A11 Horario desconocido | No tengo un horario confirmado para compartirte. Voy a pasar tu consulta al equipo. |
| A12 Ubicación conocida | Estamos en {direccion_publicada}. Puedes ver la ubicación aquí: {enlace_publicado}. |
| A13 Ubicación desconocida | Voy a pedir al equipo que te confirme la dirección. |
| A14 Agente | Claro. Dejé tu solicitud para que un asesor continúe contigo. |
| A15 Fuera de horario | Recibimos tu mensaje. En este momento estamos fuera de nuestro horario de atención: {horario_publicado}. Dejamos tu consulta pendiente para el equipo. |
| A16 Comprobante | Gracias, recibimos tu comprobante. Contabilidad debe verificar la recepción del pago. |
| A17 Descuento/crédito | Esa condición necesita revisión del equipo comercial. Voy a dejar tu solicitud para un asesor. |
| A18 Reclamo | Lamento el inconveniente. Voy a pasar tu caso a un asesor para que revise lo ocurrido contigo. |
| A19 No sé | No tengo información confirmada para responderte con precisión. Voy a pasar tu consulta a un asesor. |
| A20 Archivo no procesable | Recibimos tu archivo. Un asesor lo revisará para continuar contigo. |
| H01 Humano / presentación | Hola, {nombre_contacto_opcional}. Soy {nombre_asesor}, del equipo de ISALWA. Ya revisé tu consulta y continúo contigo. |
| H02 Cotización | Te comparto la cotización {numero}, por Bs {total}, válida hasta el {fecha_validez}. Quedo atento a tus consultas. |
| H03 Seguimiento | Hola, {nombre_contacto_opcional}. Quería saber si pudiste revisar la cotización {numero}. ¿Te ayudo con alguna consulta? |
| H04 Fecha confirmada | Confirmamos contigo la entrega para el {fecha_acordada}. {detalle_aprobado_opcional} |
| H05 Demora | Queremos avisarte que surgió un inconveniente que puede afectar la fecha acordada. {explicacion_publica_aprobada}. {siguiente_paso_aprobado}. |
| H06 Pago confirmado | Contabilidad confirmó la recepción de tu pago de Bs {importe}. Gracias. |

H01–H06 siempre borrador revisado y enviado por persona V1; H04 requiere compromiso vigente comunicado, H05 texto redactado/revisado por asesor, H06 confirmación existente. Si total no es BOB, H02/H06 no aplican; no conversión monetaria automática. Precio A08 no revela precio automático aun con lista hasta una ampliación específica. A07 no sugiere instalación profesional ni garantías. Catálogo A02 solo si documento publicado se encola correctamente; si falla envío no afirmar adjunto entregado.

El routing para catálogo/agente/horarios/ubicación acepta mayúsculas, tildes, variaciones naturales; no obliga a responder palabras exactas ni menús numéricos. Intentos mixtos agente+catálogo priorizan humano y permiten que éste envíe catálogo. Palabras fuera de contexto no disparan (no necesito un agente no equivale a agente). Baja confianza → A19, no ciclos. No interpretar sí aislado como aceptación de cotización ni como consentimiento de datos.

No enviar A14/A09/A17/A18/A19 hasta guardar ticket de handoff. A16 significa recibido por sistema, nunca fondos recibidos. Coalesce por inbound único para no mandar tres ACK; rate-limit una respuesta automática por mensaje y evitar repeticiones de fallback en la misma cola. Human send, revoke, new message y pause verificados nuevamente por worker antes de enviar. Dos replies de IA/humano no compiten: control de versión del hilo, cancelar candidato obsoleto.

Prohibiciones: aprobar precios/descuentos/crédito, confirmar stock/plazos/pagos, fusionar clientes, cambiar propietarios, crear pedidos definitivos, prometer garantías/reembolsos, revelar notas internas, historial privado o datos de otro cliente, obedecer instrucciones del cliente sobre tools/permisos. No acceso a Internet abierto para respuestas empresariales. Contenido de mensajes/documentos es dato, no instrucción ejecutable.

Propuestas IA: tipos customer_fields, customer_match, opportunity, commitment, payment_report, issue, reply_draft, conversation_summary. Guardar sourceMessageIds, valores, rationale breve, suggestedBy/modelVersion, estado propuesta y resourceVersion. UI Propuesto por IA · Revisa antes de confirmar. Confirmación muestra diff y ejecuta comando autorizado actual con idempotencia; guarda actor de confirmación; draft stale exige recargar. No auto-confirm por confianza. Resumen/etiqueta temporal se conserva como derivado, nunca reemplaza fuentes.

## 8. Recordatorios, notificaciones y escalamiento

Reutilizar attention/outbox/clock; no añadir servicio de colas pagado de inicio. Tabla durable de notificación por destinatario con eventId/resourceId, readAt, acknowledgedAt, delivered state. Job idempotente y catch-up tras caída; no temporizadores solo en navegador. SSE autenticado por tenant si stack actual lo admite; fallback polling incremental cada 30s en pestaña visible con backoff, no ambos sin necesidad.

Eventos: Solicitud de asesor, Conversación asignada, Compromiso próximo, Compromiso vencido, Aprobación pendiente, Pago por verificar, Problema reportado, Envío fallido. Sonido opt-in botón Activar sonido en preferencias; señal local corta una vez por eventId y usuario, coordinación tabs; no autoplay garantizado ni sonido obligatorio. Read != acknowledge; cerrar campana no resuelve trabajo.

Defaults técnicos propuestos (no promesas al cliente): nueva solicitud humana avisa inmediato al owner/cola; a los 15 min atendibles sin tomar avisa a jefatura asignada una vez. Si no hay horario aprobado, usar tiempo transcurrido, no afirmar SLA horario. Compromiso: recordar 60 min antes y al vencer, solo dentro de política de aviso; dedup event+recipient+occurrence. Falta fecha → no inventar deadline. Email a los 5 min sin acknowledgement para solicitud humana/incidencia; al vencer para compromiso; cancelación/reasignación/revocación se recheck antes de enviar. Resumen diario opcional desactivado.

Campana: título Notificaciones; fila {tipo}: {cliente}, fecha, Abrir; botón Marcar como leída persiste por usuario. Email subject ISALWA · {tipo}; body Tienes un pendiente en ISALWA. / {tipo} / Revisar en ISALWA; enlace autenticado sin datos sensibles en URL. No adjuntar comprobantes, mensajes completos ni secretos al email. Destinatario únicamente miembro activo autorizado con email confirmado, no dirección tomada del chat.

Sin jefatura configurada: cola Sin responsable de escalamiento visible a administrador comercial, fallo de readiness, no inventar destinatario. No enviar a Carmen por defecto.

## 9. Integraciones reales y confiabilidad

Decisión propuesta: WhatsApp Cloud API oficial Meta directo; conservar adaptador intercambiable. No automatizar WhatsApp Web ni añadir BSP de pago sin decisión. Meta requiere portfolio, WABA y teléfono empresarial: un número por sí solo no basta. Verificar elegibilidad, propiedad, coexistencia/migración, historial y limitaciones actuales antes de tocar línea usada. Probar con número de prueba y destinatario de prueba consentido. No prometer importar todo el historial ni continuidad automática de app móvil.

Backend: endpoint propuesto GET/POST /v1/integrations/whatsapp/webhook; GET challenge validado con verify token; POST HMAC sobre bytes raw antes de confiar payload. Guardar inbox durable y aceptar solo conexión verificada. Mensajes únicos connectionId+providerMessageId; estados idempotentes/out-of-order. No crear Party en cada webhook: guardar contacto de canal provisional y propuesta de vínculo. Asociar sender, destinatario, timestamps fuente/recepción, tipo y media privada; inbound no asigna grants.

Sender transaction: intención autorizada + outbox + auditoría en misma transacción. Worker actual revalida autorización/política/versiones y obtiene tenant connection server-side. Firma/version API soportada fijada en configuración y probada; no dependencia del SDK archivado. lastInboundAt controla ventana de servicio; regla estándar 24h a verificar con documentación Meta vigente en T12. Fuera ventana requiere plantilla aprobada e intención/consentimiento aplicables; opt-out bloquea seguimientos promocionales. No tratar utilidad como marketing para evadir reglas. Respuestas de agentes respetan misma política.

Garantía honesta: deduplicación interna no produce exactly-once externo por magia. Timeout después de aceptación proveedor = Resultado por confirmar; reconciliar por ID/status si disponible, no retry ciego. 429 respeta Retry-After; errores transitorios definitivos backoff exponencial limitado; poison → revisión visible. Backlog y webhook lag monitoreados. API aceptado != entregado; read receipt puede faltar. Matar worker/reiniciar no duplica efectos locales.

Medios: PDF/JPEG/PNG hasta 10MB en V1, límite proveedor menor prevalece; validar MIME/contenido, tamaño, origen permitido, descarga server-side sin SSRF, storage privado y signed links cortos con autorización. Binario sospechoso en cuarentena; no render activo ni fetch de URLs arbitrarias del mensaje. Audio/otros tipos se conservan como referencia disponible si proveedor permite, sin extracción automática; A20 y handoff. No transcribir audios silenciosamente. Envío PDF renderizado de snapshot aprobado; metadatos/version/hash persistentes y enlaces privados, no bucket público.

Correo: reutilizar proveedor transaccional existente si hay uno funcional y seguro; si no, Resend detrás de adaptador. Requiere remitente/dominio verificado, key y webhook firmado de delivery/bounce. Usar idempotency provider más outbox durable local (retención proveedor limitada; no confiar indefinidamente). Probar destinatarios internos consentidos; no email cliente automático V1. No comprar dominio/plan ni cambiar DNS sin gate concreto.

Mapa: conservar Mapbox ya integrado, public token de mínimo alcance limitado a dominios permitidos; secret token nunca frontend. Carga lazy, no geocoding masivo, no servicios directions/optimization V1. Datos de cliente autorizados en API, no atributos privados a proveedor fuera de lo necesario.

IA: conservar integración OpenAI server-side si validada, modelo existente compatible fijado tras prueba de calidad/costo; no cambiar a modelo premium automáticamente. Primero reglas/plantillas sin LLM para FAQs. LLM solo extracción/resumen/borrador con contexto mínimo autorizado y salida JSON validada. Attachments financieros no enviados a modelo por defecto; OCR/transcripción fuera de V1. Secretos/PII innecesaria excluidos, logs sin texto crudo por defecto. Nunca credential desde browser.

## 10. Datos, comandos y costo

Nuevos campos son semántica, no mandato de tablas duplicadas. Mapear en T00 contra schema actual. Reusar Party/Contact/Location/CommercialAccount, opportunities/quotes/orders, commitments/issues, business events/audit/outbox, documents, attention y catalog existentes. Modelos faltantes: conexión de canal tenant-scoped; contacto provisional; mensajes y eventos proveedor; asignación/chat state; propuesta; conocimiento público versionado; reporte pago/tenders/confirmación; delivery de notificación. Toda FK referenciada debe demostrar mismo tenant, con constraints compuestos donde posible. Dinero enteros, timestamps UTC, display es-BO / America/La_Paz.

Comandos requeridos (mapear existentes primero): RegisterCommercialCustomer, LinkConversationCustomer, RecordInteraction, Claim/AssignConversation, Pause/ResumeAutomation, QueueCustomerMessage, AddInternalNote, ConfirmProposal, RecordPaymentReport, Confirm/RejectPaymentReport, Revise/CancelCommitment, PublishKnowledge. Mutación = validación+permiso+resource version+transaction+event/audit/outbox cuando aplica. Actor/context server-side. No mezclar campos reservados de replay dentro de objeto que usuario puede sobrescribir.

S11 cierre: identidad org+actor+command+canonical validated payload fingerprint; retries exactos devuelven mismo resultado solo tras current authorization; diferente comando/payload → conflicto sin body anterior. Legacy sin actor/fingerprint falla cerrado sin reejecutar efectos; texto Esta solicitud anterior necesita revisión antes de repetirse. Incluye import concurrency, outbox retry recovery y otros replay paths alcanzables, no lista incompleta. Workforce llamadas externas requieren intención durable/dedup, no afirmar exactly-once con fake store. HTTP mantiene códigos compatibles mientras se documenta conflicto; no cambio global de protocolo no relacionado.

Coste: sin nuevo microservicio, Redis, vector DB, plataforma no-code ni motor multiagente. Monolito y Postgres existentes; worker reutilizado. Un task de Cursor a la vez, lecturas dirigidas, test afectado primero, suite amplia solo en gates. No escaneos repetidos completos ni screenshots de cada botón.

Límites iniciales técnicos propuestos para IA: máximo 3 llamadas por inbound/version (extracción, borrador, resumen opcionales), no las 3 obligatorias; máximo 1 resumen por cambio material, cached por conversación+watermark+permisos+modelo; 100 solicitudes/día/tenant, 20/hora/actor, presupuesto estimado USD10/mes/tenant desactivando llamadas nuevas al agotarse. Cifras son configuración propuesta, no compra ni garantía de precio. Reserva de presupuesto atómica y persistente antes de llamada, cargo real reconciliado; tarifa desconocida → no estimación falsa. Provider project cap adicional donde disponible. Manual/FAQ siguen funcionando al agotarse. Texto Alcanzaste el límite de asistencia por IA. Puedes continuar manualmente.

WhatsApp/email/mapa tienen costo independiente: registrar uso y tarifa verificada al conectar; no prometer total gratis ni tarifa fija no comprobada. Marketing masivo desactivado. Sin nuevo gasto recurrente ni cambio de plan sin decisión de Carmen. Publicar desglose real base+proveedor+IA+almacenamiento antes de activación.

## 11. Plan secuencial: una tarea por vez

Cada tarea termina con receipt §12, pruebas relevantes y commit local. Avanzar automáticamente a la siguiente si está habilitada y aprobada por el encargo inicial; no detenerse para una confirmación rutinaria. Orden y prerequisitos obligatorios. Si falta dato externo, terminar lo local, marcar proveedor pendiente y ejecutar solo siguientes tareas independientes. No simular PASS.

| ID | Entregable / archivos de entrada | Prueba de salida y límite |
|---|---|---|
| T00 | Congelar decisiones y mapa de reutilización. docs/product/COMMERCIAL_RELEASE_V2.md copia del encargo; docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md; mapear cada ruta/modelo/comando/scopes a archivo actual. Verificar escritor y preservar S11. Revisar brand tokens y source exclusions. | Manifest S11 coincide; matriz existentes/extensiones; registrar decisiones nuevas vs previas. Sin modificar app ni inventar grants. |
| T01 | Cerrar S11 por §10 en packages/os-events y command services afectados; conservar reparación 7fe8772. | Postgres desechable: mismos/diferentes actor, permiso revocado, otro tenant, comando/payload distinto, legacy, races y efectos; HTTP real session actor. No staging DB. |
| T02 | Tenant/resource checks conversaciones y nueve GET pendientes del ledger; archivos apps/os-api controllers y repos correspondientes. | HTTP negativos list/detail/search/count/media por dos tenants, owner/coverage/manager/suspended. Cero body privado en error/replay. Sin widening por people.admin. |
| T03 | Registro comercial y cobertura: scopes/party commands/coverage existing + clientes/nuevo. Retirar people.admin como bypass comercial no autorizado en rutas afectadas. | Asesor crea cliente acotado; duplicado y teléfono compartido; coverage continúa quote sin cambiar owner; expiración/revocación; permisos financieros/admin denegados. |
| T04 | Aprobaciones y precios seguros, numbering concurrente y PDF snapshot en os-commercial/aprobaciones. | No selfapprove, terms edit invalidates, send/convert recheck, sin price basis bloquea oferta, números únicos concurrentes, PDF igual a términos. Sin nuevos límites numéricos de negocio. |
| T05 | Catálogo unificado desde PDF y package os-catalog, preview/starter mapping y /productos. Precios versionados y conocimiento draft/publish mínimo. | Fuente/página por dato; contradicciones pendientes; alias históricos; quote saved unchanged al editar catálogo; solo publicado entra en IA. No import de clientes reales. |
| T06 | Conversación durable extendiendo controller/model/repos actuales: mensajes, notas, asignación, estados, manual call/visit, optimistic version. | Recargar/reiniciar conserva todo; claim race un ganador; nota interna nunca sale; una atención con followup atómica; eventos en history. |
| T07 | Pago reportado/tenders/confirmación en módulo existente o extensión mínima, /finanzas y manual-payment-form. | QR200+efectivo1070=1270 en fixture sintético; suma errónea rechazada; replay no duplica; asesor no confirma; rechazo/reversión auditados; reload persistencia. |
| T08 | Promesas, incidencias y seguimiento determinístico; conservar legacy history; /compromisos, Cliente360. | Fecha cliente!=interna; overdue/reschedule/cancel/reassign; reinicio clock; no contacto externo automático; permisos owner/coverage y resolución. |
| T09 | Notificaciones durables + preferencias + sonido + adaptador email/outbox. | Read persistente, dos tabs un sonido, revocado no recibe, catch-up sin doble aviso, reglas15min/5min; envío real email solo entorno/recipiente autorizado. |
| T10 | UI Hoy/menú/Cliente360 y formulario atención con §4/§5; reutilizar shell. | 390px/1440px, teclado, back/filter25, sin scroll horizontal, acciones con writer real. No salto al legacy app. |
| T11 | Inbox UI completo + compositor + preview envío + adjuntos + vínculos, aún provider off. | Historial y estados honestos; nota aislada; fallo mantiene draft; inbox reload; pause/resume, proposed fields review. Env sin proveedor muestra desconectado. |
| T12 | WhatsApp Cloud API adaptador/inbox/outbox/webhook y configuración T05/T06. Verificar documentación oficial vigente y registrar versión/ventana/precios/coexistencia. | HMAC corrupto, tenant por conexión, replay webhook, status reorder, retries/timeout incierto, revoked send; número Meta de prueba autorizado ida/vuelta y PDF. No línea real sin gate. |
| T13 | Motor A01–A20 determinístico/public knowledge y handoff, pruebas de políticas. | Preguntas naturales/agente/negación/mixed intent; falta horario/precio; handoff antes ACK; humano pausa; budget exhausted; sin claims falsos. |
| T14 | IA propuestas/resumen/borrador + quotas persistentes y H01–H06; ampliar existing ai/assist con comandos separados. | Prompt injection, cross-tenant, datos stale, same proposal accepted twice, extracción malformada, fecha ambigua, PII mínima, costo cap; no acción definitiva automática. |
| T15 | Cotización review→WhatsApp y Registrar pedido rápido reutilizando commands. | Aprobación por versión, exact PDF/text/recipient, aceptación humana explícita; ventana cerrada/template; timeout sin doble envío; pedido duplicado rechazado. |
| T16 | Mapa y métricas factuales por permiso, lazy Mapbox y agrupación. | Sin coordenada no pin, filtros/counts respetan equipo, cero geocoding masivo; ceros distintos de error; quotation!=sales!=funds. |
| T17 | Preflight operacional staging: migraciones compatibles, backup/restore, rollback, health, pending jobs, credenciales/roteos, dependencia proveedor y presupuesto. | Aplicación solo en entorno autorizado; old/new code sobre filas nuevas, restore en DB desechable, outbox recovery. Revisar fallos A1/D5/dispatch alcanzables: corregir en tareas acotadas o bloquear esa ruta y entrega; jamás declarar reparados por diferirlos. |
| T18 | Freeze candidato y revisión independiente por otro AI/ingeniero read-only, antes de cliente. | Commit/tree exactos, tests/evidence; revisor recibe requisitos y fuente, emite hallazgos antes de leer conclusiones builder. Hallazgos P0/P1 reparados individualmente y reprobados. |
| T19 | Journey staging completa con dos tenants sintéticos, roles y proveedor test; Desktop1440/móvil390. | Matriz §13 y receipt; nada de clientes reales. Medir tiempos/usabilidad con pasos reales; no PASS por componentes. |
| T20 | Paquete activación y owner acceptance. Lista exacta datos/conexiones, costo, deploy/rollback y capacitación breve. | Gate Carmen para entorno/SHA/migraciones/contactos/linea concreta. No confundir aprobación diseño con permiso enviar a clientes. |
| T21 | Tras autorización: deploy candidato, verificar salud y smoke con contactos consentidos; habilitar piloto limitado y soporte. | Web/API SHA, provider real inbound/outbound/PDF, handoff/pago/recordatorio; owner aceptación registrada, kill switch probado. Solo entonces piloto operativo. |

T10 puede usar APIs completas T03–T09, no fixtures como sustituto. T12 puede quedar en provider-blocked y continuar T13–T16 localmente. No etiquetar integración real sin prueba externa. Si una tarea excede una unidad revisable, descomponer antes de editar dentro del mismo ID y registrar subpasos; no usar arbitrariedad de límite de archivos para omitir cambios necesarios.

## 12. Receipt exacto obligatorio de Cursor

Guardar docs/operations/commercial-release/receipts/Txx.md; actualizar checkpoint corto con task terminado/siguiente/bloqueos y commit. No reescribir takeover ZIP ni originales. Formato fijo:

1. Tarea y resultado de negocio (una frase).
2. Inicio/fin: path, branch, commit/tree y dirty paths restantes; S11 preservado cuando aplica.
3. Qué cambió: archivos y contratos; migración creada/aplicada y entorno; eventos/audit/outbox.
4. Interfaz: tabla ruta | componente | ubicación | texto exacto | token/color efectivo | estado habilitado | acción/backend | destino posterior. Solo elementos añadidos/cambiados; NO omitir palabras. Si backend-only: Sin cambios visuales.
5. IA: IDs de plantillas y texto literal cambiado, variables permitidas, evidencia/política, cuándo escala; si no aplica decirlo.
6. Pruebas: comandos, resultados, PG/HTTP/browser/provider real vs fake, casos negativos y screenshot local sintético por pantalla cambiada390/1440. No credentials/PII en receipt.
7. Proveedores: ninguno o proveedor/entorno/IDs de mensajes redactados + estado comprobado. Costo observado o no medido, no inventar ahorro.
8. Problemas encontrados y reparación dentro del scope; desviaciones (deben ser cero salvo decisión registrada).
9. Pendientes y siguiente tarea automática; bloqueos con dueño y acción concreta.
10. Estados separados: IMPLEMENTADO / PROBADO LOCAL / REVISADO INDEPENDIENTE / INTEGRADO / DESPLEGADO / JOURNEY VERIFICADA / ACEPTADO; cada uno SÍ/NO con evidencia.

No enviar diff completo cada vez ni repetir todas las suites. Un resumen breve en chat y receipt completo en archivo. Los colores se informan desde estilos efectivos, no desde intención.

## 13. Aceptación de extremo a extremo

Ejecutar con datos sintéticos y destinatarios autorizados. Para cada caso: usuario/tenant inicial, pasos/copy, estado antes/después, persistencia tras reload, audit y resultado visible. Journey debe usar UI y HTTP reales, no solo llamar service directamente.

J01 WhatsApp nuevo → catálogo real publicado → nombre/ciudad → propuesta → confirma cliente → asigna asesor → histórico durable.
J02 cliente existente desde otro contacto → coincidencia propuesta, no merge; persona equivocada no obtiene historial privado.
J03 cotización con precio aprobado → revisión humana/PDF → entrega WhatsApp comprobada → aceptación registrada → pedido único.
J04 precio manual → aprobación distinta persona → cambio cantidad invalida → envío bloqueado hasta reaprobación.
J05 llamada/visita → atención guardada → quote/pedido mismo cliente; venta inmediata sin campos/copias innecesarios.
J06 QR+efectivo → reportado → Accounting confirma → advisor ve estado permitido; repetición no duplica y cliente no recibe confirmación falsa.
J07 agente/reclamo → ticket y aviso UI/sonido/email → humano toma → IA calla → cobertura con contexto → revocación efectiva.
J08 promesa → recordatorio → vencimiento → cambio fecha con historia → cumplimiento; caída/reinicio no pierde ni duplica aviso.
J09 cliente sin respuesta → sugerencia interna48h/calendario correcto → revisión humana; inbound cancela suggestion stale.
J10 mapa ubicación confirmada/ausente → filtros/metrics correctos → ficha autorizada.
J11 otro tenant intenta IDs/search/count/PDF/media/replay/AI/webhook → denegado sin fuga ni efecto.
J12 proveedor cae/429/timeout/status fuera orden → cola/error honestos, recuperación sin envío duplicado ciego; manual sigue operativo.
J13 IA prompt injection/fecha ambigua/stock falso/tarifa ausente → no inventa; caps sobreviven restart; budget agotado conserva FAQ/manual.
J14 mañana/fin de semana/zona horaria, móvil teclado, attachments, back y listas26+/100+ no esconden pendientes.
J15 quote/order enlazado a entrega existente: comprobar límite físico agregado, reversión, recibo sin doble conteo, revisión qty y legacy history antes de exponer acciones operativas. Si defectos heredados abiertos afectan ruta real, release bloqueado para esa capacidad; no esconderla y declarar alcance completo.

No lanzamiento hasta P0/P1 cerrados, backup/restore y rollback comprobados, privacidad/aislamiento comprobados, equipo/horario/escalamiento configurados y prueba humana de uso aceptada. No exige funciones futuras de fabricación avanzada ni proyecciones especulativas.

## 14. Dependencias externas concretas antes del piloto

Solicitar una vez en un checklist, sin pedir de nuevo lo ya entregado: propietario Meta y acceso administrado, WABA/phone_number_id y línea elegible, método de verificación y política de migración; remitente correo y control DNS; Mapbox token restringido; OpenAI proyecto/key y presupuesto; nombres reales a activar y matriz de grants confirmada; horario/dirección/FAQ publicables; catálogo PDF recibido reconciliado; lista de precios vigente o aprobador explícito para cada excepción; responsables/backup de cola y Accounting.

Si falta lista de precios, la operación puede preparar borradores y solicitar aprobación caso a caso; no ofrecer precios autónomos ni llamar esa modalidad automatización completa. Si falta WhatsApp, manual usable pero WhatsApp NO listo. Si falta email, UI usable pero email NO listo. Ninguna cuenta se compra, ningún DNS se cambia y ninguna línea se migra silenciosamente.

## 15. Referencias técnicas verificadas / a revalidar

Meta official collection: https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api — portfolio/WABA/business number y flujos Cloud API. Documentación directa Meta devolvió429 durante preparación; T12 debe comprobar políticas/API/precio actuales antes de integración. SDK antiguo archivado no es dependencia elegida.

Meta webhook signature reference (oficial, SDK archivado solo como referencia): https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/ — challenge y x-hub-signature-256.

Resend: https://resend.com/docs/dashboard/emails/idempotency-keys — keys de proveedor expiran24h; conservar outbox/dedup propio más allá de ello.

Mapbox: https://docs.mapbox.com/help/getting-started/access-tokens/ — tokens y restricciones URL. No se verificaron tarifas exactas aquí.

## 16. Orden de ejecución autorizada por este encargo

Este documento consolidado V2 sustituye el V1 como contrato del encargo. Carmen pide ejecutar ahora el desarrollo local, pruebas y preparación de entrega T00–T20, secuencialmente. No requiere otra aprobación rutinaria después de T00. T21 conserva el gate de activación externa. Esta autorización se hace efectiva cuando Carmen entrega este documento con el prompt de inicio a Cursor; el documento no afirma que ya se ejecutó nada.

T00: comprobar identidad actual y leer instrucciones aplicables. Si coincide el baseline y los 19 cambios S11, mapear y continuar T01 automáticamente. Si HEAD avanzó con cambios atribuibles a esta tarea, verificar continuidad por checkpoint/diff, no resetear. Cambios de procedencia desconocida o otro escritor activo bloquean las ediciones afectadas: informar el conflicto concreto. No tratar un SHA histórico como permiso para retroceder.

Crear el mapa de reutilización antes de añadir modelos/rutas. Reutilizar inventarios existentes, comprobar solo lo necesario contra fuente actual. No volver a buscar entrevistas o hacer otra auditoría de todo el disco. Recuperación histórica incompleta permanece registrada; no impide trabajo sustentado en contratos explícitos de esta especificación.

Una tarea activa. Cada tarea puede tener subpasos pequeños. Terminar código, pruebas relevantes, receipt y commit local antes de avanzar. No detenerse tras escribir el plan. Si el turno se interrumpe, guardar checkpoint con último paso confirmado, comando siguiente y cambios no comprometidos; continuar desde ahí al reanudarse. No afirmar que seguirá ejecutándose fuera de una sesión activa.

Autorizado: editar este writer; instalar dependencias bloqueadas por lockfile con herramientas del proyecto; crear DB desechable local inequívocamente separada de datos reales; ejecutar pruebas; migraciones locales; commits locales; preparar artefactos de despliegue. Prohibido borrar volúmenes/DB no creados para estas pruebas. No cambiar lockfile/proveedor por conveniencia; vulnerabilidad alcanzable permite actualización mínima compatible documentada y probada, no major upgrade no relacionado.

No autorizado por este encargo: push/merge/deploy, escribir DB compartida o productiva, enviar mensajes reales, migrar números, cambiar DNS, comprar servicios, aumentar presupuestos, borrar datos históricos, conceder permisos a personas reales. Preparar estos pasos hasta que sean concretos y revisables. Si una autorización específica previa sigue vigente y cubre exactamente el entorno/acción, registrarla y no volver a pedirla. No intentar eludir un rechazo de seguridad.

Decisiones rutinarias permitidas: índices, tipos, funciones, componentes existentes, queries, transacciones, pruebas, paginación, locks/versiones, corregir regresiones del flujo, extensión mínima del esquema sin pérdida de datos. Decisiones reservadas: precios, descuentos y crédito; nuevos poderes de usuario; cambio del significado de estados; promesas al cliente; proveedor/costo; nueva área funcional; migraciones destructivas. No inventar reglas nuevas para hacer pasar una prueba. Si falta decisión reservada, implementar el comportamiento seguro ya definido, marcar dependencia y continuar solo trabajo independiente.

## 17. Navegabilidad y facilidad de uso: contratos obligatorios

### 17.1 Continuidad de trabajo

El asesor trabaja principalmente desde Hoy y Conversaciones. Una acción contextual mantiene cliente, conversación, contacto, línea y origen; no exige capturarlos otra vez. Preparar cotización, Registrar pago, Crear compromiso y Reportar problema abren panel sobre el hilo. Tras guardar, cerrar panel, restaurar foco al botón de origen, conservar scroll y borrador, actualizar referencias persistidas. En móvil volver al hilo correcto. Si se abre ruta completa, registrar returnTo relativo permitido, nunca URL externa arbitraria.

Separar ver del editar: abrir una fila no modifica estado comercial ni asigna conversación. Leído puede actualizarse únicamente según la política de lectura; nunca equivale a atendido/resuelto. Al recibir nuevos chats, mantener estable la fila enfocada y el hilo abierto; mostrar Hay nuevas conversaciones con botón Actualizar lista en lugar de mover elementos debajo del dedo. Nuevos mensajes no desplazan a quien lee historia: mostrar Nuevos mensajes y bajar solo por gesto o si ya estaba al final.

Buscadores de cada módulo visibles bajo el título, placeholder definido en §5. Consultas server-side con debounce 300ms y cancelación/ignorar respuesta antigua. No búsqueda global adicional V1. Normalizar teléfono para coincidencia sin mostrar resultados fuera de permiso. Filtros vacíos: No encontramos resultados con estos filtros. Limpiar filtros. Preservar filtros, búsqueda, página/cursor y posición al volver. Acceso por URL directa reautoriza y no revela existencia de recurso privado.

Cliente360: antes de tabs mostrar Próximo paso, Responsable, Última atención y Problemas abiertos con fuentes/enlaces. Si no existen: Sin próximo paso registrado; Sin responsable asignado; Sin atención registrada; Sin problemas abiertos. No poner vacío/error como ausencia real. Prioridad de próximo paso: vencido primero, luego vencimiento más cercano, desempate estable por ID. No resumen AI inventado para llenar espacio.

### 17.2 Formularios, seguridad del borrador y mensajes

No guardar mensajes, comprobantes ni datos privados en localStorage o caché pública del navegador. Borrador en memoria durante navegación interna; si existe persistencia de borradores del servidor, debe ser privada por tenant+actor+conversación con caducidad y logout limpia estado cliente. Nunca compartir borradores entre usuarios en equipo compartido. Recarga/salida con datos no guardados avisa cuando el navegador lo permita. No prometer recuperación tras cerrar navegador si no existe persistencia segura.

Cada error distingue validación, permiso, conflicto, conexión y resultado incierto. Botón muestra Guardando… mientras persiste, impide doble submit, pero idempotencia servidor sigue obligatoria. Tras éxito se confirma con referencia y estado real. Nunca toast Guardado sobre un stub.

| Situación | Texto exacto / acción |
|---|---|
| Guardado fallido | No pudimos guardar los cambios. Tus datos siguen aquí. / Reintentar |
| Conflicto versión | Este registro cambió mientras lo editabas. Revisa la versión actual antes de guardar. / Revisar cambios |
| Sin conexión | No tienes conexión. Puedes revisar lo que ya está abierto; los cambios aún no se han guardado. |
| Sesión vencida | Tu sesión terminó. Inicia sesión para continuar. / Iniciar sesión |
| Permiso revocado | Tu acceso cambió. Esta acción no se realizó. Solicita ayuda a tu responsable. |
| Cambios sin guardar | Tienes cambios sin guardar. ¿Quieres salir? / Seguir editando / Salir sin guardar |
| Archivo inválido | Este archivo no es compatible. Usa PDF, JPG o PNG de hasta 10 MB. |
| Fallo desconocido | No pudimos completar la acción. Referencia: {id_seguro}. / Reintentar solo si es seguro |

Sesión vencida: conservar memoria solo en contexto bloqueado, no visible a otro usuario; si actor cambia, purgar. No reenviar mutaciones automáticamente tras login. Sobre pérdida de conexión, no prometer escrituras offline: no hay sincronización offline V1. Abrir con baja conectividad debe conservar navegación disponible y mostrar errores recuperables.

Cambiar compositor §5: desktop Enter envía texto solo cuando hay foco en Mensaje y no hay composición IME; Shift+Enter salto. Móvil Enter inserta salto, botón Enviar envía. Nota interna se guarda mediante Guardar nota interna, nunca por atajo de envío. Cotización/adjunto financiero requieren revisión explícita; atajo no salta confirmación. No focus trap roto ni drawer anidado: selector de producto dentro del panel, cerrar devuelve foco.

### 17.3 Accesibilidad y aceptación humana

390px y 1440px obligatorios; comprobar además 320px, 768px y zoom200% en shell y formularios críticos. Sin contenido/acciones ocultos por teclado móvil o footer. Labels persistentes, instrucciones vinculadas, errores anunciados, landmarks, orden de foco lógico, estado no solo color, objetivos44px. Contraste mínimo4.5:1 texto normal y3:1 texto grande/controles relevantes como criterio de diseño; verificar colores efectivos. Reutilizar componentes accesibles, no introducir framework nuevo.

Prueba humana con asesor ISALWA o, antes de su disponibilidad, evaluador sustituto claramente identificado: encontrar cliente; responder; preparar/enviar quote; registrar pago dividido; crear promesa; continuar caso de otro asesor. Sin instrucciones paso por paso durante medición. Registrar éxito, errores, retrocesos y ayuda requerida. Objetivo: encontrar conversación existente y siguiente acción en <=30s; localizar compromiso pendiente desde Hoy en <=20s; registrar atención simple con cliente existente en <=90s, excluyendo la conversación real. Son objetivos de prueba, no SLA contractual. Fracaso repetido requiere simplificar dentro del contrato; cambio de negocio se escala. Aceptación humana real pendiente no puede sustituirse por evaluación AI.

## 18. Seguridad dentro de cada tarea

Antes de implementar cada Txx anotar brevemente actor, datos, límites de confianza y efectos externos. Después probar lo relevante: permitido, denegado, otro tenant, recurso ajeno, revocado, replay, concurrencia, error/reinicio. Casos no aplicables llevan razón; no repetir matrices completas sin cambio de riesgo.

### 18.1 Sesión y plataforma

Reutilizar proveedor de identidad actual, no crear autenticación propia. Invitaciones expiran, uso único y destinatario/tenant verificados. Rol no viene del formulario ni de metadata cliente. Miembro suspendido o eliminado pierde acceso actual en requests y workers; cache de permisos debe invalidarse o revalidarse antes de efectos. Probar pestaña abierta, sesión antigua y acción encolada. Logout limpia caches y suscripciones; no datos de tenant previo al cambiar organización. Implementar MFA con mecanismo del proveedor para administración sensible cuando disponible; si configuración externa falta, bloquear activación de esos privilegios hasta resolver, no inventar autenticador nuevo.

Cookies seguras/HttpOnly/SameSite según flujo; CSRF para mutaciones basadas en cookie; CORS allowlist explícita. No GET mutante, no confiar Origin como autorización. Validación esquema y límites de tamaño en servidor; queries parametrizadas; protección XSS en Markdown y notas, nunca HTML cliente ejecutable. CSP compatible probada, TLS en entorno publicado. No secretos en NEXT_PUBLIC, bundles, PDFs, URLs, logs ni receipts. Ejemplos env solo nombres/placeholders. Rotación y revocación documentadas sin copiar valores.

Rate limits server-side compartidos entre instancias para login/invitaciones, búsqueda, mutaciones, uploads, webhook y AI; usar primitives existentes/Postgres, no nueva plataforma. Registrar configuración y pruebas de exceso sin bloquear tráfico normal; respuesta de límite no filtra usuarios. Límites de upload/timeout/concurrencia y protección ante payloads enormes. Webhook autenticado y deduplicado antes de trabajo caro.

### 18.2 Datos y archivos

En cada entidad nueva registrar tenant, creador, timestamps, versión, referencias y clasificación. Constraints/queries impiden enlazar IDs de tenant distinto. Filtros de UI nunca son frontera. List/count/search/export/download tienen mismos permisos; errores sin cuerpos privados. Service credentials solo servidor, con repositorios que no permitan omitir tenant. RLS existente se preserva y prueba; no declarar RLS activo si no existe. Añadirlo globalmente requiere diseño compatible, no sustituto de autorización de aplicación.

Adjuntos privados con inspección de formato/contenido, tamaño y nombres seguros. Sanitizar SVG/HTML no permitido: tipos V1 solo §9. Si no hay scanner adecuado, estado Pendiente de revisión de seguridad y sin render/descarga al usuario hasta cumplir el control; no afirmar antivirus por revisar MIME. Selección de nuevo servicio pagado requiere gate. URLs firmadas cortas no en email/logs; reautorizar antes de emitir. Documentar que URL ya emitida puede vivir hasta expiración; usar proxy autenticado para recursos que requieren revocación inmediata.

Phone match no prueba identidad. Link de chat propone coincidencia; humano confirma identidad/contexto antes de divulgar datos privados. No pedir documento personal por defecto. Corrección de vínculo erróneo conserva auditoría y no mueve en silencio mensajes a otro cliente; bloquear divulgación hasta revisión.

### 18.3 IA, auditoría y dependencias

Pruebas de instrucciones maliciosas en mensaje, documento y nombre de cliente. Modelo no recibe secretos ni herramientas con poderes generales. Salida schema-validada y comandos con autorización independiente. No razonamiento interno guardado; rationale es explicación breve basada en fuente. Aceptación de propuesta requiere versión vigente, actor y permiso actuales. Public/internal knowledge separados en recuperación y caché.

Auditoría estructurada append-only a nivel aplicación: actor real/principal servicio, tenant, comando, recurso, versión, fecha, request/correlation ID, campos cambiados sin secretos. No exponer audit a asesores por defecto. Eventos fallidos relevantes sin contenido sensible. Revisar dependencias nuevas/alcanzables y secret scan del diff; remediar hallazgos explotables del alcance. No afirmar certificación ni seguridad absoluta.

## 19. Operación, rendimiento, privacidad y costo

### 19.1 Capacidad y medición

Objetivo de prueba inicial: 25 sesiones staff concurrentes, 10.000 clientes y100.000 mensajes sintéticos distribuidos en al menos2 tenants, mezcla aproximada70% lecturas/listas,20% búsqueda,10% escrituras no externas. Ramp-up5min y medida15min. Registrar hardware/plan, versión, warm/cold, p50/p95/p99, errores y CPU/memoria/DB. Proveedores externos simulados en carga; una integración real aparte. No ejecutar carga sobre producción ni pagar ampliaciones automáticamente.

Criterios iniciales: p95 list/search API<=1s, p95 commit de comando local<=1.5s, errores inesperados<1%, cero pérdidas/fugas/duplicados; primer contenido útil de inbox<=3s en perfil de red documentado (10Mbps,100ms RTT), sin descarga del historial completo. Notificación visible<=5s con canal realtime o<=35s con polling en sesión visible. Estos son gates de laboratorio, no promesas comerciales ni capacidad ya probada. Si no se cumplen, corregir índices/N+1/tamaño/queries del alcance antes de ampliar infraestructura. Si hace falta otro costo, informar opciones concretas.

Cursor pagination con orden estable para chats/history; tablas25 registros. Prueba26/100 y múltiples páginas sin omisión/duplicación bajo inserts. Índices tenant+filtros+orden justificados por plan query. No contadores costosos por cada fila. Map clustering/viewport y lista paginada; no todas las coordenadas cada render. Polling solo visible con backoff; evitar fetch cascadas y llamadas LLM por render/keystroke. Búsqueda rechaza respuestas obsoletas.

Workers con claim/lease, retries limitados, jitter, dead-letter y recuperación autorizada. Reservas/leases expirables recuperables después de crash; no transacción DB abierta mientras llama proveedor. Límites por tenant evitan monopolio; un tenant en error no detiene todos. Métricas backlog, edad del pendiente más antiguo, fallos y resultado incierto. Prueba caída después de persistir y antes/después de side effect; no prometer exactly-once externo.

### 19.2 Soporte y salud

Extender /administracion/comercial/conexiones con Salud operativa para integraciones.manage: último webhook válido, número/edad de pendientes, fallos definitivos, inciertos y enlace al recurso autorizado. No nuevos dashboards de infraestructura generales. Botones Reintentar solo en fallo definitivo, Revisar resultado en incierto, Pausar respuestas automáticas por conexión. Botones peligrosos exigen permiso+confirmación+auditoría; no SQL manual como experiencia normal.

Alertas de operador: fallo de worker/check continuo>5min, pendiente enviable>5min, dead-letter nueva, backup fallido, presupuesto80%/100%. Umbrales técnicos configurables documentados, no SLA cliente. Dedup para no tormenta; destinatario configurado explícito. Sin operador no marcar soporte listo. Runbook: síntoma, diagnóstico seguro, reparación, verificación, cuándo escalar. P0=exposición/corrupción/acción externa no autorizada; P1=flujo esencial bloqueado o resultado incorrecto sin alternativa segura. Ambos bloquean capacidad afectada y release cuando esencial.

### 19.3 Datos de empresa y recuperación

No importar clientes reales en tareas locales. Preparar preview de import, campos/duplicados, filas inválidas, conteos y confirmación separada. Imports tienen ID, procedencia e idempotencia; no overwrite por teléfono ni borrar faltantes. CSV export escapa fórmulas; export requiere alcance explícito y no incluye notas privadas fuera de permiso. Extender export existente para datos comerciales y documentos vinculados, generación asíncrona y descarga privada. No otorgar export a todo asesor; nuevo permiso específico si falta, asignado solo en fixtures hasta configurar personas reales.

Retención: no purgar registros comerciales históricos automáticamente sin política acordada. Config técnica inicial: borrar adjuntos temporales no vinculados tras24h; artefactos de export tras24h; propuestas AI no aceptadas tras30d conservando metadatos mínimos cuando hay auditoría; logs técnicos sin cuerpos30d. Estas cifras se documentan y validan contra configuración existente antes de activar limpieza; si afecta obligación/historia previa, reportar y mantener limpieza desactivada. Borrado de cliente no cascada sobre pedidos/pagos; correcciones/anulaciones por comandos. No afirmar cumplimiento legal sin revisión de política aplicable.

Backup cifrado DB+objetos, acceso restringido, restauración en entorno separado con conexiones/worker de envío desactivados. Objetivos operativos de preparación RPO<=24h y RTO<=4h, comprobar factibilidad con plan actual y ejercicio; si no cumple, reportar antes del piloto sin comprar upgrade. Restaurar también referencias/archivos; no disparar outbox restaurado sin conciliación. Política de retención de backups se documenta con proveedor real, no inventar capacidad. Manual fallback de servicio y contactos no depende del mismo worker fallido.

Costos observables por tenant/proveedor: uso, estimado según tarifa vigente, real cuando disponible y fecha de tarifa. No misma cifra para tokens/WhatsApp/email/storage. AI100% cap detiene nuevos calls,80% alerta; manual sigue. No overage silencioso ni recalcular precio con tasa inventada. Mantener monolito modular, DB/worker existentes; no microservicios, billing SaaS, marketplace, chatbot builder, campañas masivas, proyecciones predictivas ni app móvil nativa en este alcance.

## 20. Incorporación, medición de valor y publicación

Setup acotado en Conexiones: checklist Equipo y permisos / Responsable de escalamiento / Catálogo publicado / Precios o aprobador / Horario y ubicación / WhatsApp / Correo / Presupuesto IA / Prueba de atención. Cada fila estado Pendiente, En prueba, Listo, Bloqueado y acción Abrir configuración o Ver requisito. Listo exige evidencia, no toggle manual. Demo/synthetic claramente etiquetado; nunca fixture visible como dato real.

Preparar guía española de una página por asesor, jefatura y Contabilidad con tareas y capturas sintéticas. Incluir diferencia entre Guardar, Enviar, Reportar pago, Confirmar recepción y Resolver. Cliente final puede pedir humano en lenguaje natural; bot no exige formulario completo para ayudar. Captura progresiva respeta nombre/ciudad/producto ya conocidos y no repite preguntas; faltantes van a propuesta, no ficha definitiva automática.

Definiciones de métricas: tiempo primera respuesta humana desde inbound que abre atención hasta primer outbound humano, excluir bot; chats pendientes no resueltos que requieren equipo; conversión cotización→pedido enlazado, excluir borradores/anulados; pagos reportados y confirmados por separado; compromisos a tiempo comparados contra fecha comprometida vigente con historial de cambios, no borrar retraso al reprogramar. Mostrar denominador/período/zona, datos faltantes y fuente. No llamar facturación a suma de pedidos. Geografía usa ubicación confirmada y agrega sin pin falso. No inferir éxito por mensaje leído.

Ready para piloto exige usuario autorizado recorriendo journey, integraciones reales probadas con destinatarios consentidos, protecciones por paso, capacidad medida, restore/rollback y responsable soporte. Sellable no significa software certificado ni disponibilidad garantizada: contratos de soporte, precios de venta, privacidad y obligaciones comerciales quedan decisiones de Carmen/ISALWA, fuera de aprobación automática de Cursor. No añadir pago de suscripción para demostrar que es vendible.

## 21. Ampliaciones obligatorias de T00–T21 y aceptación por tarea

Estas extensiones complementan §11 y prevalecen donde hagan más preciso el gate. No son una lista opcional para después del desarrollo.

| Tarea | Ampliación / cierre obligatorio |
|---|---|
| T00 | Matriz requisito→fuente→ruta/modelo/comando→test→Txx; cada requisito §§17–20 tiene propietario de tarea. Registrar política de autorización vigente sin CCA/Rose. Si source mapping compatible, continuar automáticamente T01. |
| T01 | Casos replay y current resource auth; intents externos, límites de retries/lease; guardar snapshot de19 paths antes de modificarlos, sin reset ni publicación de secretos. |
| T02 | Añadir subpasos identidad/revocación/invitación/sesión, HTTP/CSRF/CORS/validación; tests cruzados conteos/media/export y cambio tenant. No reemplazar proveedor identidad. |
| T03 | Customer link seguro, coverage expiración, optimistic version, import/export existente acotado con preview/permiso; sin escrituras reales. |
| T04 | Montos enteros y rounding explícito consistente, no impuestos/fiscalidad nueva; conflictos de edición y aceptación cliente; PDF escape texto, límites y snapshot. |
| T05 | Conocimiento versionado, fuente y derechos de uso proporcionados; no inventar precios; onboarding de conocimiento y sanitización de fuente AI. |
| T06 | Durable interacciones y drafts seguros/continuidad/races; scoped event stream y recuperación. |
| T07 | Historial pago, rechazo/reversión, permiso financiero, nunca confirmación bancaria por foto. |
| T08 | Timezone/calendario, overdue/reschedule y recordatorio persistente; fuentes y deadlines humanos. |
| T09 | Operador/escalamiento y preferencias; notificaciones no filtran datos tras revocación; reintentos seguros. |
| T10 | Navegación §17, Cliente360 above-fold, accessible shell/forms, configuración de setup por rol. |
| T11 | Mobile keyboard, scroll/newmessage behavior, draft/Back/error, controles exactos y media privada/quarantine. |
| T12 | Salud provider y runbook, cola/recovery/timeout, verificación documentos actuales. Sin acceso externo autorizado, integrar local y registrar bloqueo específico. |
| T13 | Captura progresiva no repite, bot sin navegación rígida, claims solo tras persistencia; A11/A13/A15/A20 también requieren handoff durable antes de afirmar consulta pendiente. |
| T14 | Test injection/cost/cache/actor, eliminar propuesta stale/noaccept por confianza; cap persistente. |
| T15 | Continuidad chat→quote→order y recuperación parcial, envío versionado y autoridad revalidada. |
| T16 | Métricas definidas §20, clustering/viewport, eficiencia de queries y permisos. |
| T17 | Seguridad transversal residual, pruebas de carga §19, restauración/rollback, retención/export, dependencia y secret scan, runbooks; desglosar17a… si necesario. Nada de deploy compartido sin gate. |
| T18 | Otro AI/ingeniero independiente si disponible/autorizado; mismo writer único. Si no hay revisor, preparar fuente+requisitos+hash y continuar preparación independiente, no autoaprobarse. |
| T19 | JourneysUI/HTTP y prueba humana §17; si staging no autorizado, probar local equivalente y dejar hosted explícitamente pendiente. No falsear prueba humana con bot. |
| T20 | Checklist final, evidencia/costos/capacidad/limitaciones/guías, manifest candidato, plan de activación concreto y rollback. Pedir solo decisiones externas realmente pendientes. |
| T21 | Solo tras autorización externa concreta; comprobar cada release environment/SHA, smoke real, soporte y aceptación ISALWA. |

Definition of done por tarea: comportamiento principal funciona; permisos/tenant negativos relevantes; invariantes y concurrencia relevantes; failure/recovery; UI/copy exacta cuando aplica; auditoría y costos; receipt y commit. Bloqueo externo no equivale DONE: estado LOCAL_COMPLETE_EXTERNAL_BLOCKED con dependencia y tarea siguiente independiente. P0/P1 corregidos antes de considerar completo el flujo. P2 se corrige dentro de alcance si impide facilidad de uso; no backlog infinito de detalles cosméticos no solicitados.

Añadir al receipt §12: requisitos cubiertos por ID/sección; pasos de usuario y clicks/retrocesos observados; datos/permiso afectados; métricas medidas vs no medidas; motivo de cada N/A; bug descubierto y evidencia de fix. Captura sintética por estado/pantalla material, no cientos redundantes. Probar unidad/contrato donde tiene sentido, PG/HTTP para límites de datos y races, browser para UI. No tests que solo copian implementación ni suite global repetida después de cada texto.

## 22. Prompt maestro para iniciar Cursor

Carmen autoriza ejecutar este plan consolidado V2 ahora: desarrollo y pruebas locales T00–T20, una tarea activa a la vez, preservando el gate externo T21 y las restricciones de §16. Lee el documento completo una vez, registra su SHA256 y copia a docs/product/COMMERCIAL_RELEASE_V2.md. No leas otros proyectos CCA ni apliques Rose como autoridad a ISALWA.

Empieza T00 verificando writer, branch, HEAD y cambios S11 conocidos. Usa mapa existente y source actual; no repitas recuperación histórica. Si identidad y contratos coinciden, continúa automáticamente T01 sin pedir confirmación. Si hay discrepancia concreta, preserva el trabajo y reporta solo lo necesario para resolverla. No reset/clean/stash/recrear worktrees.

Implementa contratos exactos del documento, incluyendo UI, textos españoles, colores, comportamiento, seguridad por paso, rendimiento, integraciones y recoveries. Mantén una sola identidad de cliente y reutiliza módulos. Corrige por tu cuenta problemas de ingeniería dentro de alcance; no inventes políticas, autoridad, precios, plazos ni nuevas áreas. No rebajes una prueba para hacerla pasar. No sustituyas integración por fake cuando declares conectada.

Al terminar cada tarea: ejecutar verificación pertinente, guardar receipt exacto §12+§21+§23, commit local, actualizar checkpoint corto y continuar siguiente tarea habilitada. Evita relecturas y suites redundantes. Si falta dato/proveedor/permiso externo, termina la parte local, registra BLOCKED y sigue solo tareas independientes. No te detengas por confirmaciones rutinarias; sí antes de cambios de negocio, destructivos, gasto o activación externa no autorizada.

En cada actualización di: tarea terminada, qué puede hacer ahora el usuario, prueba realmente ejecutada, qué falta y siguiente tarea. Para UI incluye tabla literal de etiquetas/colores/ruta/acción/destino en receipt. Para AI incluye plantillas y reglas usadas. Mantén separados IMPLEMENTADO, PROBADO LOCAL, INDEPENDIENTEMENTE REVISADO, INTEGRADO, DESPLEGADO, JOURNEY LIVE VERIFICADA y ACEPTADO.

No termines con “plan creado” ni “esperando siguiente asignación” mientras exista trabajo local autorizado. No afirmes completitud total cuando falte proveedor, review, aceptación humana o hosted journey. Cuando llegues a gate real, presenta candidato y acción concreta para aprobar, sin pedir secretos por chat. Comienza ahora por T00 y continúa según este contrato.

## 23. Evidencia verificable: PASS no es prueba ni aceptación

Esta sección es obligatoria y refuerza §§12/21/22. Las instrucciones especifican intención; las pruebas intentan refutar que la implementación la cumpla. Nunca sustituir prueba por explicación de código. Nunca sustituir evidencia por la palabra PASS, captura aislada, conteo de tests o afirmación del mismo constructor.

Por cada criterio de aceptación mantener una fila:
requisito | estado inicial | actor/tenant | acción exacta UI/API | resultado esperado | resultado observado | estado persistido antes/después | efecto externo confirmado o pendiente | evidencia local | commit/tree/diff probado | limitaciones.

Identidad de evidencia: task ID, fecha/hora UTC, entorno/URL sin secretos, versiones web/API/schema, commit y tree. Si hay cambios sin commit, guardar manifest de paths y hashes del diff/tracked/untracked relevante sin secretos. Después de commit probar que tree coincide con archivos probados. Cualquier cambio posterior invalida los resultados afectados; no reaprovechar receipt de otro HEAD como si fuera actual. No retocar outputs para que encajen con esperado.

Evidencia mínima por tipo:
- Backend: comando reproducible, resultado bruto sanitizado, status/body HTTP relevante, estado DB por IDs sintéticos y conteos de efectos; validar evento/outbox cuando corresponda. Fake-store prueba limitada, nunca evidencia de concurrencia real Postgres.
- UI: pasos reales en navegador, ruta/viewport/rol, captura sintética de estados clave, requests relevantes, reload/relogin o segundo usuario autorizado que verifica persistencia. Screenshot solo demuestra apariencia de ese instante.
- Seguridad: acción prohibida, respuesta segura y evidencia de cero escrituras/envíos/fuga; incluir list/count/search/download cuando afectan el recurso, no solo botón oculto.
- Concurrencia/reintento: requests realmente solapados contra DB desechable real, claves/actores/versión y número exacto de efectos persistidos. Serial fake no prueba carrera.
- Proveedor: intento local, aceptación proveedor y entrega se registran separados con referencias sanitizadas; prueba externa solo con autorización. Mock no demuestra WhatsApp/email real. Falta webhook de lectura no equivale a no entrega.
- Rendimiento: script, dataset, carga/entorno, distribución de latencias y errores, no captura de un request rápido.
- Usabilidad: recorrido observado, errores/ayuda/tiempo, evaluador identificado por rol; AI no sustituye aceptación del asesor.

Para defectos de seguridad/integridad corregidos, demostrar que el caso falla antes y pasa después cuando es viable en copia aislada; nunca revertir en el writer compartido o tocar producción para demostrarlo. Si no se puede, explicar limitación y aportar prueba alternativa concreta. Tests no deben derivar expectativas del mismo helper bajo prueba ni debilitar contratos para ponerse verdes.

Guardar evidencia sanitizada bajo docs/operations/commercial-release/evidence/Txx/ o carpeta local de evidencia enlazada si binarios grandes; receipts referencian archivo y hash. No subir PII, secretos ni dumps completos. Pruebas sobre datos sintéticos se etiquetan. Historial de evidencia append-only en práctica: conservar resultados fallidos y el resultado reparado, sin borrar fallos incómodos. Resumen en chat corto, detalle disponible para ingeniero/revisor.

Revisión independiente recibe requisitos y source exacto primero, sin conclusiones del constructor; produce hallazgos propios antes de contrastar receipts. Si no está disponible, marcar NOT INDEPENDENTLY REVIEWED, no simular otro agente ni convertir auto-revisión en independiente. Resultado final distingue resultado técnico, uso real, aceptación humana y dependencia abierta.

La regla de finalización es: criterio satisfecho + evidencia inspeccionable + limitaciones explícitas. “Tests passed”, “implementado”, “desplegado” y “listo para vender” nunca son sinónimos. No afirmar que todo está terminado mientras el flujo real requerido tenga una dependencia pendiente. Continuar trabajo local autorizado; solo detener la parte afectada por un bloqueo real.
