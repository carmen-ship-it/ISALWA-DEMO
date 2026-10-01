# Primera UAT humana interna — Guía ISALWA OS

**Para:** Carmen y/o un usuario de negocio de ISALWA  
**Modo:** Validación humana de usabilidad y negocio  
**No es:** una prueba técnica de ingeniería  

**Fecha del paquete:** 2026-08-27  
**Estado del producto (verificado):**

| Área | Estado |
|------|--------|
| Comercial (Fase 1) | Listo para UAT interna |
| Administración de equipo | Listo para UAT interna con límites |

---

## 1. Qué estamos validando

¿Puede una persona de ISALWA **entender y completar** los flujos comerciales y de equipo **sin ayuda de ingeniería**?

Si algo se siente técnico, confuso o incompleto: **anótelo**. No intente “arreglarlo” usted.

---

## 2. Antes de empezar (Carmen / facilitador)

### Entorno

| Ítem | Valor |
|------|--------|
| Dirección | `http://localhost:3200` |
| Ingreso | Botón **Entrar (desarrollo)** en la pantalla de login |
| Idioma de la app | Español |

La ingeniería debe dejar el entorno ya levantado (aplicación + datos de prueba).  
**Usted no necesita** terminal, base de datos ni comandos técnicos.

### Datos de prueba (seguros)

| Qué verá | Descripción |
|----------|-------------|
| **Cliente Step17 S.A.** | Cliente sintético para el flujo comercial |
| **Step17 Admin** (o similar) | Usuario administrador con el que entra |
| **María Quispe** | Empleada sintética — **única persona** para suspender / reactivar / finalizar |

**No use** clientes ni empleados reales de producción.

### Advertencia — acciones destructivas

En **Administración → Equipo**, al probar **Suspender**, **Reactivar** o **Finalizar relación**, use **solo a María Quispe**.

**No suspenda ni finalice** la cuenta del administrador con la que usted está trabajando.

Después de **Finalizar relación** sobre María, ingeniería debe **restaurar los datos de prueba** antes de otra UAT. Aviste a Carmen / ingeniería cuando termine esa parte.

---

## 3. Qué NO debe probar en esta UAT

Estas funciones **aún no están disponibles** o **no forman parte** de esta validación. Si no las ve, **está bien**.

| Tema | Motivo |
|------|--------|
| Crear pedido / orden | Decisión de producto pendiente (G-02) |
| Aprobaciones comerciales | Aún no diseñadas (G-08) |
| Invitar empleado | Fuera de alcance |
| Recontratar | Fuera de alcance |
| Cambiar correo (completar / sincronizar) | Fuera de alcance |
| Solicitar cambio de correo | No verificado en navegador |
| Finanzas | Bloqueado en el menú |
| Mensajes | No configurado |
| Funciones de IA | No habilitadas |
| Ingreso con correo real / producción | Esta UAT usa modo desarrollo |

---

## 4. Cómo registrar problemas

Use el archivo:

`docs/uat/FIRST_HUMAN_INTERNAL_UAT_FEEDBACK.md`

Por cada hallazgo anote:

| Campo | Qué poner |
|-------|-----------|
| **UAT-ID** | Ej. `C-01`, `W-03` (comercial / workforce + número) |
| **Pantalla** | Ej. Cliente 360, Cotización, Equipo |
| **Tarea** | Qué estaba haciendo |
| **Qué esperaba** | En sus palabras |
| **Qué ocurrió** | En sus palabras |
| **Categoría** | Ver lista abajo |
| **Severidad** | P0 / P1 / P2 |
| **Captura** | Opcional |

### Categorías

| Categoría | Cuándo usarla |
|-----------|----------------|
| **BUG** | Algo se rompe o da un resultado incorrecto |
| **UX FRICTION** | Funciona, pero cuesta entender o completar |
| **MISSING BUSINESS RULE** | Falta una regla que ISALWA usa de verdad |
| **COPY/LANGUAGE** | Textos, etiquetas o tonos confusos |
| **DATA ISSUE** | Datos incompletos, raros o que no cuadran |
| **PERFORMANCE** | Lento o se queda “guardando” demasiado |
| **POLICY DECISION** | Hace falta una decisión de negocio (etapas, campos, etc.) |
| **TRAINING** | Se entiende con una explicación corta; conviene documentar |

### Severidad

| Nivel | Significado |
|-------|-------------|
| **P0** | No pudo completar una tarea central |
| **P1** | Completó, pero fue muy confuso o incorrecto |
| **P2** | Mejora deseable |

No marque como BUG una preferencia estética sin impacto en el trabajo.

---

## 5. Duración estimada

| Parte | Tiempo |
|-------|--------|
| A — Comercial | 30–45 minutos |
| B — Equipo | 25–40 minutos |
| Total | **aprox. 60–90 minutos** |

Puede hacer solo Parte A o solo Parte B en sesiones separadas.

---

## 6. Cómo entrar

1. Abra `http://localhost:3200`
2. Pulse **Entrar (desarrollo)**
3. Debe llegar al inicio de la aplicación (menú lateral visible)

Si no puede entrar: **pare** y avise a Carmen / ingeniería. No intente “arreglar” el entorno.

---

# PARTE A — Comercial

**Cliente de prueba:** *Cliente Step17 S.A.*

## A1. Encontrar un cliente

1. En el menú, abra **Clientes**.
2. Busque o localice **Cliente Step17 S.A.**
3. Ábralo y mire el perfil / vista 360.

**Preguntas**

- ¿Encontró fácilmente al cliente?
- ¿Entendió qué información estaba viendo?
- ¿Algo parecía técnico o confuso?

Anote en el feedback (UAT-ID sugerido: `C-01`).

---

## A2. Crear y ajustar una oportunidad

Desde el cliente:

1. Cree una **oportunidad** (botón o acción visible en la vista del cliente).
2. Complete un título claro, por ejemplo: `UAT humana — oportunidad`.
3. Si puede, asigne un **responsable** (solo personas activas).
4. Cambie la **etapa** al menos una vez.
5. Edite algún detalle (descripción, monto estimado u otro campo visible) y guarde.

**Preguntas**

- ¿Era claro qué hacer en cada paso?
- ¿Los nombres de las etapas tienen sentido para cómo vende ISALWA?
- ¿Falta algún dato que usen a diario?

Anote hallazgos de etapas / campos como **POLICY DECISION** o **MISSING BUSINESS RULE** si aplica (`C-02`).

---

## A3. Crear y enviar una cotización

Desde la oportunidad (o el flujo que la pantalla ofrezca):

1. Cree una **cotización**.
2. Agregue al menos **dos líneas** (producto/servicio, cantidad, precio).
3. Edite una línea y, si puede, **elimine** una.
4. Observe totales / montos.
5. **Envíe** o **presente** la cotización (acción de envío / submit visible).

**Preguntas**

- ¿La forma de cotizar coincide con cómo trabaja ISALWA?
- ¿Falta información comercial importante?
- ¿Hay demasiados pasos?

(`C-03`)

---

## A4. Cancelar una cotización

1. Cancele la cotización (o una cotización de prueba creada para este paso).
2. Lea el mensaje o la confirmación.

**Preguntas**

- ¿Quedó claro qué ocurre al cancelar?
- ¿Hubiera esperado otra consecuencia?

(`C-04`)

---

## A5. Historial del cliente

1. Vuelva al cliente y abra el **Historial** (sección o pestaña correspondiente).
2. Lea lo que aparece.

**Preguntas**

- ¿El historial cuenta una historia útil de lo que pasó con el cliente?
- ¿Falta algo que un comercial miraría primero?

(`C-05`)

---

# PARTE B — Equipo (Workforce)

**Empleada de prueba para cambios:** *María Quispe*  
**No use** al administrador para suspender ni finalizar.

## B1. Ver el equipo

1. Abra **Administración** → **Equipo**.
2. Localice a **María Quispe**.
3. Ábrala y revise: rol, departamento, responsable, estado de acceso.

**Preguntas**

- ¿Encontró a la persona fácilmente?
- ¿Los datos de rol / departamento / estado se entienden?

(`W-01`)

---

## B2. Cambiar departamento

1. En la ficha de María, use la acción de **cambiar departamento**.
2. Elija o indique el departamento disponible (en datos de prueba suele aparecer **General**).
3. Confirme el cambio y verifique que la ficha se actualizó.

(`W-02`)

---

## B3. Cambiar rol

1. Cambie el **rol** de María a otra opción disponible.
2. Confirme que la ficha refleja el nuevo rol.

(`W-03`)

---

## B4. Cambiar responsable

1. Asigne un **responsable** (otra persona activa del mismo equipo).
2. Confirme que se muestra correctamente.

(`W-04`)

---

## B5. Suspender acceso

1. Use **Suspender acceso** (con la confirmación que pida la pantalla).
2. Observe el nuevo estado (debe indicar suspensión, no “finalizado”).

**Preguntas**

- ¿La diferencia entre **suspender** y **finalizar** queda clara?
- ¿El texto le preocuparía en un caso real?

(`W-05`)

---

## B6. Reactivar acceso

1. Use **Reactivar acceso**.
2. Confirme que María vuelve a estado activo.
3. Verifique que **no** aparece lenguaje de “recontratar”.

(`W-06`)

---

## B7. Delegación

1. Cree una **delegación** hacia otra persona del equipo (si la pantalla lo permite).
2. Anote si entiende **quién** delega a **quién** y hasta cuándo.
3. **Revoque** la delegación (puede pedirle un identificador mostrado al crear).

**Preguntas**

- ¿El concepto de delegación es claro para el trabajo diario de ISALWA?
- ¿Fue confuso revocar?

(`W-07`)

---

## B8. Finalizar relación (solo María)

### B8a. Con trabajo abierto (si la ingeniería dejó una tarea abierta a nombre de María)

1. Intente **Finalizar relación**.
2. Lea el mensaje.

**Esperado:** el sistema indica que hay trabajo abierto y que debe reasignarse primero.  
María **no** debe quedar finalizada en este intento.

**Pregunta:** ¿El mensaje explica claramente qué debe hacer? (`W-08a`)

### B8b. Sin trabajo abierto

1. Cuando no haya trabajo pendiente de María, confirme y **Finalizar relación**.
2. Observe el estado final.
3. Verifique que **no** ofrezca reactivar ni recontratar.

**Importante:** después de este paso, avise a ingeniería para **restaurar datos de prueba** antes de otra UAT. (`W-08b`)

---

## 7. Decisiones de negocio a capturar (sin implementar)

Mientras prueba, anote ideas de ISALWA sobre:

- Etapas reales de venta
- Campos obligatorios en cotización
- Datos del cliente que miran a diario
- Nombres de roles y departamentos
- Cómo usan al responsable / gerente
- Terminología preferida
- Reglas comerciales que echan de menos

Regístrelas en el feedback como **POLICY DECISION** o **MISSING BUSINESS RULE**.  
**No se implementan en esta sesión.**

---

## 8. Restauración de datos (solo ingeniería)

El tester **no** ejecuta esto.

Después de acciones destructivas (sobre todo **Finalizar relación**):

1. Restaurar datos sintéticos con el mecanismo documentado Step17 (`step17-restore-seed` / marker `.step17-evidence/seed-marker-ui-live-1.json`).
2. Volver a dejar la aplicación accesible en `http://localhost:3200`.
3. Confirmar que existen de nuevo **Cliente Step17 S.A.** y **María Quispe** (activa o lista para activar).

---

## 9. Checklist rápido de cierre

- [ ] Parte A completada (o diferida con nota)
- [ ] Parte B completada (o diferida con nota)
- [ ] Feedback llenado en `FIRST_HUMAN_INTERNAL_UAT_FEEDBACK.md`
- [ ] Si finalizó a María: ingeniería avisada para restaurar datos
- [ ] Ninguna cuenta real de producción fue modificada

---

## 10. Contacto durante la UAT

Si se bloquea (no puede entrar, pantalla en blanco, error incomprensible):

1. Capture pantalla si puede.
2. Anote UAT-ID y hora.
3. Avise a **Carmen** (facilitador).  
   No reinicie servidores ni ejecute comandos técnicos.
