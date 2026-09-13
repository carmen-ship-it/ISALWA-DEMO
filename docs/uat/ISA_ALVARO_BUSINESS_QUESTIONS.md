# Preguntas de negocio — Isa / Álvaro

**Propósito:** Resolver solo lo que realmente bloquea el producto.  
**Idioma:** negocio, no arquitectura.  
**Fecha:** 2026-09-13  
**No incluye:** detalles técnicos de base de datos, UUIDs, ni nombres de clientes reales.

---

## Cómo usar esta lista

Responder en pocas frases. Si algo “depende”, digan el caso más común en el día a día de ISALWA.

---

## 1. Pedido desde cotización

Cuando una cotización ya está aceptada / enviada y hay que convertirla en **pedido**, ¿quién puede hacerlo?

Ejemplos: solo el asesor dueño · cualquier vendedor · solo jefe comercial / gerente · otra regla.

---

## 2. Cotización y Nota de Entrega

¿La **cotización** y la **nota de entrega** son:

- el mismo documento en etapas distintas, o  
- dos documentos distintos (aunque se vean parecidos en el papel)?

---

## 3. ¿Cuándo nace la Nota de Entrega?

En la práctica de ISALWA, ¿cuándo se emite la nota de entrega?

Ejemplos: al aceptar la cotización · al armar el pedido · al salir mercadería · al entregar en el local · otro momento.

---

## 4. Numeración de documentos

¿Cómo deben numerarse cotizaciones (y, si aplica, notas / pedidos)?

Ejemplos: correlativo único de la empresa · por año (reinicia cada enero) · por sucursal · por tipo de documento · otra regla.

---

## 5. “Factura a”

En el papel, ¿qué significa **Factura a**?

Ejemplos: el mismo cliente comercial · otra razón social / NIT · una persona con CI distinta del local · el dueño del negocio aunque el local tenga otro nombre.

---

## 6. Varios locales

¿Un mismo cliente (misma persona o misma empresa) puede tener **varios locales / puntos de entrega** que deban manejarse por separado?

---

## 7. GPS / ubicación

Cuando anotan un enlace de Maps o una ubicación, ¿qué representa?

- el local / tienda del cliente  
- el punto de entrega de esa vez  
- el lugar de la visita del asesor  
- o puede ser las tres cosas según el caso  

---

## 8. Productos en la cotización

Al armar líneas de cotización, ¿los productos:

- salen de un **catálogo fijo**,  
- se **escriben libremente**,  
- o es una mezcla (catálogo + texto libre)?

---

## 9. Descuentos

¿Usan descuentos en cotizaciones?

Si sí: ¿quién puede darlos y quién debe aprobarlos (si aplica)?

---

## Fuera de esta lista (ya decidido o aplazado)

| Tema | Estado |
|------|--------|
| Finanzas / contabilidad operativa | No se abre ahora |
| Aprobaciones comerciales formales (G-08) | No aprobado como diseño |
| Importar la planilla real de clientes | Solo después de staging + reglas de ubicación |
| Inventar NIT que no están en la planilla | No |

---

## Para ingeniería (después de las respuestas)

Actualizar: `ISALWA_REAL_COMMERCIAL_DOCUMENT_FIT.md`, `CLIENT_DATA_INTAKE_MAPPING_PLAN.md`, y el brief G-02 si aplica.
