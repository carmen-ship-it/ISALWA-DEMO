# ISALWA — Addendum A2: autonomía operativa, clientes y correcciones

2026-10-16. Complementa V2 y A1. Objetivo: el equipo autorizado administra su trabajo y corrige errores rutinarios desde la aplicación sin SQL, ingeniería ni acceso a secretos. No afirma implementación. Mantiene un escritor, ejecución local secuencial, evidencia y gates externos. A2 precisa los contratos de ciclo de vida; no sustituye contabilidad, identidad ni proveedor. Nuevas acciones requieren permisos explícitos, nunca cargo/people.admin como bypass.

## 1. Modelo que debe conservarse

Separar empresa/persona cliente, contactos, relación contacto-empresa, teléfonos/canales, responsable de cuenta, encargado de conversación y responsable de compromiso. Reutilizar entidades existentes. Teléfono no es identificador único global de persona ni prueba de identidad; permite uso compartido legítimo. Todas las relaciones y cambios son tenant-scoped con resource authorization. Identidad de canal y vinculación tienen vigencia/versiones: no entregar historia vieja a nuevo dueño del número.

Estado del cliente Activo/Archivado independiente de etapa comercial, preferencias de contacto, pago, incidencias y acceso. Cliente activo no implica crédito. Archivado no implica deuda saldada, no_contact ni eliminación. No crear nuevo registro al reactivar. Conservar IDs y contratos históricos.

Antes de modificar una entidad, comprobar versión actual, permiso y relaciones en transacción; guardar evento/auditoría y outbox necesarios. Cambio humano explícito; AI solo propone. Nada de overwrite masivo, cascadas destructivas o borrado de evidencia para corregir errores.

## 2. Autoridad operativa y límites

Mapear equivalentes existentes antes de añadir scopes. Scopes faltantes propuestos, sujetos a matriz explícita: commercial.customer.edit, commercial.customer.archive, commercial.customer.reactivate, commercial.account.assign, commercial.data_correction.review, commercial.operations.configure. Permisos globales de lectura no equivalen a edición. Cobertura hereda solo acciones expresamente delegadas, no todo lo que puede hacer owner. Ninguno se otorga a personas reales automáticamente; fixtures sintéticos para construir/probar.

| Acción | Autoridad y alcance |
|---|---|
| Editar nombre visible, contacto, teléfono, ciudad o dirección actuales | Owner o cobertura vigente con customer.edit sobre esa cuenta; gerencia/jefatura solo si tiene permiso de edición en su alcance |
| Archivar/reactivar | Owner con permiso respectivo o gestor autorizado de alcance; cobertura solo con delegación explícita |
| Cambiar owner/cobertura/equipo | Gestor con account.assign en alcance; advisor puede Solicitar reasignación, no autoconcederse acceso |
| Corregir vínculo de interacción sin documento emitido/pago/efecto externo | Actor con acceso a ambos recursos y autoridad de corrección; revisión de impacto obligatoria |
| Corregir vínculo con documento emitido/pago o historial compartido | Gestor autorizado, y Contabilidad cuando afecta pago; ejecutar workflow del dominio, no editar FK genérica |
| Confirmar/revertir/asignar pagos | Contabilidad con permisos explícitos; nunca customer.edit |
| Publicar horario/ubicación/FAQ | Publicador comercial ya definido en V2 |
| Publicar destinos QR/banco | Autoridad y aprobación separada definidas A1, no configurador general |
| Cambiar scopes/miembros/invitaciones | Autoridad identidad/workforce existente, independiente de gestión comercial |
| API keys, despliegue, migración de línea o infra | Operación técnica autorizada; no dar estos poderes para permitir edición de clientes |

Suspensión/revocación efectivos en reads/writes/jobs. Autoría histórica no da acceso permanente. Recepción de solicitud o notificación no otorga permiso. No tratar Carmen como destinataria, aprobadora o soporte operativo por defecto.

## 3. Interfaz de autoservicio

Reutilizar tokens V2: navy #18324B primario; panel blanco; AI #EDF5F8; error #A63D36/#FBE9E7; advertencia #FFF5DB texto navy.44px, foco y responsive V2.

Cliente360 encabezado: Editar datos y menú Más acciones con Actualizar teléfono, Gestionar contactos, Solicitar reasignación o Reasignar cliente según permiso, Archivar cliente/Reactivar cliente. Historial mantiene tab existente; filtro Cambios de datos. Contactos actuales y antiguos se distinguen, no desaparecen. Botones de editar junto al bloque relevante abren mismo formulario; nunca exigir salir a admin para corregir teléfono.

Ampliar configuración comercial existente con rutas /administracion/comercial/operacion y /administracion/comercial/solicitudes, si no hay equivalente canónico. Operación: Responsables y reemplazos, Colas de atención, Horario y recordatorios, Reglas de seguimiento. Solicitudes: Correcciones, Reasignaciones, Posibles duplicados, Problemas de envío; reutilizar issues/work queues y estados existentes. No segundo ticketing ni nuevo CRM. Config no muestra secretos.

Mi trabajo/Hoy muestra solicitudes que requieren mi acción con Abrir solicitud. No nueva navegación primaria: ajustes bajo Administración comercial; solicitudes enlazadas desde Hoy y Cliente360. Guía inline: Para corregir un dato, abre el cliente y selecciona Editar datos. La pestaña Historial conserva los cambios.

Toda acción tiene loading/error/empty/success y reautoriza en servidor. Error conserva campos; conflicto muestra Este registro cambió mientras lo editabas. Revisa la versión actual antes de guardar. Nunca pierde cambios en silencio.

## 4. Edición, historial y corrección de errores

Editar datos muestra valores actuales, campos editables y procedencia AI/import/manual. Guardar cambios muestra diff cuando afecta identidad, teléfono, ubicación o relaciones; motivo obligatorio para cambio sensible y corrección, opcional para typo descriptivo. Guardar registra old/new, actor, fecha UTC/zona display, motivo, source y versión. Redactar old/new según permiso; no publicar valores sensibles a un lector que no podía verlos.

Historial: {fecha} · {actor} · {acción}; detalle Campo / Antes / Después / Motivo / Registro relacionado. Diferenciar corregir dato actual de alterar documento histórico: cambiar nombre/dirección no reescribe quote/PDF ya emitidos. Aviso Los documentos emitidos conservarán sus datos originales. Si hace falta corregir documento, usar Crear revisión del documento.

Restaurar valor anterior es nueva edición autorizada sobre versión vigente, no eliminación de eventos. Mostrar diff e impacto; no restaurar teléfono invalidado/reasignado sin nueva verificación. Nunca botón deshacer genérico para pago confirmado, envío externo, despacho o concesión de acceso.

Solicitud de corrección contiene recurso/tenant, tipo, detalle, fuente, cambio propuesto, solicitante, responsable, estado y resolución. Reutilizar incidencia/comando existente. Propuestos estados de trabajo mapear: Pendiente, En revisión, Resuelta, Rechazada; motivo resolución requerido. Corregir y resolver deben enlazarse, no cerrar ticket con texto sin cambio aplicado. Solicitud rechazada conserva motivo y registro.

Si se ingresó mal un pago, cotización, pedido o compromiso, ofrecer Corregir mediante acción propia del dominio: pago reportado sin confirmar puede corregirse por comando/version; pago confirmado necesita reversión autorizada y registro nuevo; quote emitida crea revisión; pedido con efectos necesita evaluación de cantidades/pagos/despacho; compromiso cambia con motivo conservando plazo anterior. No permitir formulario admin para escribir cualquier columna.

## 5. Números nuevos, compartidos o reciclados

Actualizar teléfono: número actual, nuevo país/número, motivo [Cambio de número,Error de registro,Número ya no pertenece al contacto,Otro], método de verificación [Confirmación por contacto conocido,Confirmación presencial,Confirmación por canal previamente verificado,Revisión de responsable], nota de evidencia sin documento personal por defecto. Ningún método consiste solo en nuevo remitente diciendo soy X. No presentar selector como verificación automática.

Preview: Los próximos envíos usarán el nuevo número confirmado. El historial del número anterior se conservará. Revisa los envíos pendientes. Confirmar cambio guarda número nuevo, estado/fecha del anterior y cancela intenciones aún no enviadas hacia endpoint retirado. No redirigir mensajes ya encolados al nuevo número automáticamente: requiere revisar destinatario y reenviar explícitamente. Efectos externos en vuelo se concilian; no afirmar revocación posterior a envío.

Nueva conversación desde nuevo número queda provisional hasta vínculo humano verificado. La vista interna de historial solo para asesor autorizado; nunca reenviar historia privada por enlace de número. CuentaCompartida: contacto/motivo explícitos; mostrar Teléfono compartido · Verifica el destinatario al enviar documento privado. No bloqueo único global que impida teléfonos compartidos.

Número reciclado: relación vieja cerrada con vigencia; nuevos mensajes no entran automáticamente como cliente anterior. Marcar Identidad por verificar y cola humana. Cache/provider IDs mantienen identidad de thread y epoch/vigencia de vínculo para no heredar datos anteriores. AI no accede al historial viejo por simple phone-match.

Contacto que deja empresa: Finalizar relación, fecha/motivo y preview de envíos/compromisos afectados; no borrar persona ni otras relaciones legítimas. Nuevo contacto no hereda permisos/acuerdos. Un número retirado queda excluido de seguimientos/jobs y selección por defecto.

## 6. Archivo, retorno y duplicados

Archivar cliente muestra motivo [Ya no opera,Sin relación comercial vigente,Registro duplicado en revisión,Otro], pendientes abiertos y efectos. No archivar automáticamente por inactividad. Si hay pedidos activos, pagos por verificar/anticipos sin asignar, compromisos o incidencias abiertos, pedir resolver o transferir explícitamente responsabilidad; archivo puede organizar el directorio pero nunca esconder obligaciones en Hoy/Finanzas/queues. Si el modelo actual no permite mantener obligaciones visibles, bloquear archivo hasta resolver; no desaparecer trabajo.

Cliente archivado excluido por defecto de nuevo negocio, pero búsqueda tiene Incluir archivados con permiso y badge Archivado. Historial disponible a autorizados. Inbound nuevo crea atención: Cliente archivado · Revisar reactivación; automatización solo pública segura, sin asumir términos antiguos. Reactivar revisa contacto/owner/preferencias vigentes; no restablece opt-in, crédito, precios, aprobaciones ni cobertura expirada. Caso negocio cerrado no se abre automáticamente al reactivar cliente.

Posibles duplicados: nombre/phone como señales, no prueba. Listado solo autorizado; resultado oculto genérico requiere review sin revelar datos. Crear solicitud con IDs internos server-side. V1 no introduce merge automático ni merge manual genérico nuevo. Si operación merge existente está comprobada, preview incluye referencias/orders/payments/documents/history/owner y conflictos; autorización explícita, transacción y reversibilidad definida antes de habilitar. Si no cumple, ofrecer Marcar para revisión y mantener ambos; nunca declarar dedup resuelto borrando uno.

Corrección de vínculo erróneo: preview de mensajes y relaciones afectados, autoridad sobre origen/destino. No mover toda conversación porque un mensaje menciona otro cliente. Con información ya divulgada, registrar incidente y preservar evidencia, no simular que cambiar vínculo reparó divulgación. Revisión financiera/manager antes de mover datos con efectos; pending-safe mientras se decide.

## 7. Ausencias, salida de personal y configuración de negocio

Responsables y reemplazos permite gestor elegir miembros activos del tenant, fechas inicio/fin, cuenta/equipo y acciones delegadas dentro de su propia autoridad independiente. Preview pendientes transferidos, los que quedan y acceso que cambia. No grant genérico comercial al cubrir una sola cuenta. Dar cobertura no transfiere ownership permanente.

Salida/suspensión: revocar acceso inmediatamente aunque haya pendientes; luego cola de reasignación autorizada conserva chats/compromisos/approvals. No bloquear baja porque falta reemplazo. Notificar gestor y mostrar Sin responsable vigente; no designar automáticamente miembro no autorizado. Historial conserva actor original. Revocar coverage elimina acceso efectivo, caches y efectos pendientes según V2.

Operación comercial: gestores autorizados pueden elegir colas/miembros activos, suplentes, horarios de atención y recordatorios dentro de reglas de V2/A1. Versionar config con validación, preview, Guardar borrador/Publicar según riesgo. Horarios y FAQ públicos requieren publicación; reminders internos pueden editarse con permiso, historial y aplicación futura. No configurar umbrales de descuento/crédito ni autoaprobación desde formulario genérico.

Cambio de horario recalcula recordatorios pendientes futuros, nunca altera historia ni fecha comprometida con cliente. Jobs dedup por ocurrencia y versión efectiva. No enviar acumulación de alertas históricas al cambiar config. Mostrar cambios afectados antes de confirmar. Fecha/hora en America/La_Paz, conservar UTC y zona; día hábil solo con calendario configurado.

Equipo puede corregir catálogo/descripción pública con publicación y fuente; conservar IDs/aliases y snapshots comerciales. Desactivar producto evita nuevas selecciones/autorespuestas, no borra quote existente. Precios vencidos dejan nueva emisión pendiente de precio vigente. Cambiar banco/QR mantiene doble aprobación A1, no habilitar mediante operaciones.configure.

## 8. Herramientas de recuperación cotidianas

Usuario puede corregir draft, reabrir conversación resuelta, reasignar solicitud según permiso, cambiar fecha con motivo, y reintentar fallo definitivo. Gestor puede recuperar cola sin responsable, revisar duplicado, retirar conocimiento erróneo y pausar IA de conexión sin desactivar atención humana. Contabilidad puede revisar pagos/rechazos/asignaciones/reversiones autorizadas.

Resultado de envío incierto no permite Reintentar indiscriminado: Revisar estado, evidencia provider y escalamiento técnico si no conciliable. No botón force-send/force-paid. Integración desconectada explica cómo seguir manualmente y quién configurado atiende incidencia. Configurador puede iniciar prueba segura solo con destinatario autorizado y permisos existentes; no migrar número ni cambiar DNS por UI comercial.

No todo problema necesita ingeniero: dato incorrecto→editor/solicitud; miembro ausente→coverage/reasignación; horario→conocimiento; quote mal→revisión; pago mal→Contabilidad. Error persistente/bug/servicio caído→incidencia con referencia segura y responsable soporte configurado. No pedir logs completos/secretos al usuario.

## 9. Notificación y auditoría de cambios

No email por cada typo. Cambios sensibles notify encargado/owner afectados y supervisor solo cuando requiere acción: número retirado con envío pendiente, owner/cobertura, archive con obligaciones, solicitud corrección, destino pago cuestionado, miembro suspendido con trabajo. Notificaciones payload mínimo, current auth/dedup y deep link según V2/A1. Actor que hizo cambio no recibe aviso redundante de sí mismo salvo tarea distinta asignada.

Reasignar no modifica dueño histórico de venta ni borra responsabilidad pasada; métricas distinguen actor venta y owner actual. Resolver corrección avisa solicitante autorizado; no exponer diff privado a solicitante que perdió acceso. Retener historial permite trazabilidad, no permisos retroactivos.

Cada cambio muestra fecha/actor/motivo/version; nunca llamar auditoría inmutable a tabla editable por usuarios. Protecciones application/database relevantes, logs sin secretos, acceso restringido. Export de historial respeta mismos scopes. Retención A2 no autoriza purga de clientes ni eliminación de eventos.

## 10. Qué queda fuera y cómo se representa

No nuevo CRM, contabilidad, reembolso bancario automático, importador sin preview, merge masivo, restauración arbitraria de DB ni panel de SQL. No borrar clientes históricos como solución. Solicitud de eliminación de datos se registra para responsable autorizado con revisión de relaciones/política; no purge automática. No prohibir correcciones rutinarias bajo pretexto de compliance.

No construir cada posibilidad empresarial futura: excepciones no soportadas tienen solicitud asignada, estado honesto y canal de resolución. La autonomía se mide por completar tareas reales sin ingeniería, no por cantidad de ajustes.

## 11. Integración secuencial

Guardar docs/product/COMMERCIAL_SELF_SERVICE_A2.md; añadir mapa por requisito A2 a Txx y evidence. T02 contact visibility/revocación permanece; no reabrir fuente no afectada. T03 cliente/contacto/scopes/version/archivo/reactivación y solicitudes; T06 channel identity/link/cobertura; T07 correcciones/asignaciones pagos; T08 promesas pendientes/reassignment; T09 notificaciones/cancel stale; T10 UICliente360/operación/solicitudes; T11 conversation provisional; T12 envío version destinatario; T13–14 AI no autoridad/identidad; T15 snapshots/revisiones; T16 ownerhistórico/current metrics; T17 recovery/config/retention; T18–20 evaluación independiente y aceptación humana.

Si task ya terminado, registrar delta pequeño con evidencia nueva y commit, conservar receipt anterior. No reiniciar inventario. Conflicto reservado de negocio se reporta concreto; trabajo independiente sigue. No pedir a Carmen cada typo/campo/índice; decidir ingeniería compatible.

## 12. Pruebas de aceptación con evidencia

A2-J01 owner corrige typo: reload persiste; historial antes/después/actor; PDF emitido anterior idéntico; otro tenant no ve cambio.
A2-J02 nueva línea verificada: oldPhone retirado, pending-send cancelado sin redirección; incoming antiguo no revela historia al nuevo interlocutor.
A2-J03 claim identidad desde número nuevo y sharedphone: provisional/no disclosure; dos clientes legítimos no se fusionan.
A2-J04 contacto deja negocio: relación cerrada, otras relaciones conservadas, no futuros envíos a destinatario retirado.
A2-J05 archivar con promesa/pago/pedido: obligaciones siguen visibles o acción bloquea explícitamente; reactivar no restaura crédito/consentimiento ni duplica cliente.
A2-J06 advisor suspensión: acceso cortado inmediato, trabajo sigue en queue autorizada; coverage empieza/expira sin grants globales ni autoría permanente.
A2-J07 dos usuarios editan teléfono simultáneamente: un update, otro conflict; no lost update; audit y jobs apuntan a versión correcta.
A2-J08 corrección pago confirmado sigue reversión autorizada; no editor genérico ni duplicate cash, history completo.
A2-J09 configuración horario/public knowledge: draft no autoanswer; publish versionado; cambiar horario no borra overdue ni genera tormenta.
A2-J10 solicitud y duplicado oculto: sin fuga de IDs/datos; gestor autorizado puede resolver; solicitante recibe solo resultado permitido.
A2-J11 usuario realiza seis tareas sin ingeniero: editar dirección, cambiar teléfono, cubrir ausencia, corregir quote, tramitar pago erróneo y reactivar cliente. Registrar clics/errores/ayuda y evidencia de persistencia; falla si exige SQL/terminal.
A2-J12 forbidden actor y tenant alterno prueban cada comando, search/count/history/export/media/caches/jobs: cero fuga y efectos. Privileged read no implica write.

Evidencia §23 V2: versión, actor/tenant, ruta/pasos, HTTP/DB/UX relevante, resultados reales sanitizados y limitaciones. Unit no equivale HTTP/PG/browser. No prueba humana ficticia. Release preparado no significa live/aceptado.

## 13. Prompt de ejecución

Incorpora A2 a V2+A1, registra copia exacta y hash y actualiza matriz/checkpoint. Continúa la tarea actual hasta punto seguro, integra únicamente deltas afectados y sigue secuencialmente. No repetir recuperación de historia, inventario general ni permisos ya resueltos.

Construye autoservicio real con UI/comandos para datos de cliente, contactos/números, archivo/reactivación, cobertura, solicitudes y configuración acotada. Conserva history, snapshots, tenant isolation, permisos por recurso, current authority y control de versiones. Manual y AI usan mismos comandos, AI nunca decide identidad ni cambio definitivo.

No concedas nuevos grants reales ni actives proveedores/deploy/gastos. No mandes a ingeniería por una operación rutinaria aquí autorizada. Si una corrección afecta dinero/documento emitido/envío, usa workflow específico y responsable autorizado; no UPDATE genérico.

Cada tarea aporta receipt de UI exacta, comportamiento, evidencia y límites. Continúa trabajo autorizado sin confirmaciones rutinarias; reporta únicamente decisiones reservadas/bloqueos concretos. A2 amplía criterios específicos; no habilita reconstruir toda la aplicación ni crear sistemas paralelos.
