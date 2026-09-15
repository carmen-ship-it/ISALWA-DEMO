#!/usr/bin/env node
/**
 * Synth AFTER commercial desk screenshots (code not yet hosted).
 * Does not print secrets. Uses porcelain canvas + kiln Buscar + StatusPill Activo.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../.tmp/wave2-visual-commercial/after');
mkdirSync(outDir, { recursive: true });

const css = `
:root{
  --isalwa-kiln:#1a3352;--isalwa-slate:#4a5d73;--isalwa-glaze:#2a746c;
  --isalwa-porcelain:#f6f1e8;--isalwa-mist:#e4eef5;--isalwa-white:#fff;
  --isalwa-success:#2f6b4f;--isalwa-action:#1a3352;
  --radius:12px;--font:ui-sans-serif,system-ui,sans-serif;
  --display:Georgia,"Times New Roman",serif;
}
*{box-sizing:border-box}body{margin:0;font-family:var(--font);color:var(--isalwa-kiln);background:#fff}
.shell{display:grid;grid-template-columns:17.5rem 1fr;min-height:100vh}
.rail{background:var(--isalwa-porcelain);border-right:1px solid var(--isalwa-mist);padding:2rem 1rem}
.rail h1{font-family:var(--display);font-style:italic;font-weight:400;font-size:1.65rem;margin:0}
.rail p{color:var(--isalwa-slate);font-size:.875rem;margin:.75rem 0 1.5rem}
.nav a{display:block;padding:.55rem .75rem;border-radius:8px;color:var(--isalwa-kiln);text-decoration:none;font-size:.9rem;margin:.15rem 0}
.nav a.active{background:color-mix(in srgb,var(--isalwa-glaze) 10%,white);color:var(--isalwa-kiln)}
.main{background:color-mix(in srgb,var(--isalwa-porcelain) 78%,var(--isalwa-mist));min-height:100vh}
.top{display:flex;justify-content:flex-end;gap:1rem;padding:.75rem 2rem;background:color-mix(in srgb,#fff 92%,transparent);border-bottom:1px solid var(--isalwa-mist)}
.page{max-width:1120px;margin:0 auto;padding:2rem 1.5rem 3rem}
.kicker{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--isalwa-glaze);font-weight:600;margin:0}
h2{font-family:var(--display);font-style:italic;font-weight:400;font-size:2rem;margin:.35rem 0 .5rem}
.desc{color:var(--isalwa-slate);max-width:36rem;margin:0 0 1.25rem}
.toolbar{background:#fff;border:1px solid var(--isalwa-mist);border-radius:var(--radius);padding:1rem;box-shadow:0 1px 0 rgba(28,36,48,.03),0 10px 28px rgba(28,36,48,.05);margin-bottom:1rem}
.row{display:flex;gap:.75rem;align-items:end;flex-wrap:wrap}
label{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--isalwa-slate);margin-bottom:.4rem}
input{height:40px;border:1px solid var(--isalwa-mist);border-radius:8px;padding:0 14px;width:100%;min-width:220px}
.btn-primary{height:40px;padding:0 16px;border-radius:8px;border:1px solid var(--isalwa-kiln);background:var(--isalwa-kiln);color:#fff;font-weight:500;cursor:pointer}
.btn-secondary{height:40px;padding:0 16px;border-radius:8px;border:1px solid var(--isalwa-mist);background:#fff;color:var(--isalwa-kiln);font-weight:500;text-decoration:none;display:inline-flex;align-items:center}
.chips{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem}
.chip{height:32px;padding:0 14px;border-radius:999px;border:1px solid var(--isalwa-mist);background:#fff;color:var(--isalwa-slate);font-size:.875rem;display:inline-flex;align-items:center}
.chip.active{background:color-mix(in srgb,var(--isalwa-glaze) 10%,white);border-color:color-mix(in srgb,var(--isalwa-glaze) 35%,var(--isalwa-mist));color:#1c5852}
.surface{background:#fff;border:1px solid var(--isalwa-mist);border-radius:var(--radius);overflow:hidden;box-shadow:0 1px 0 rgba(28,36,48,.03),0 10px 28px rgba(28,36,48,.05)}
.op-row{display:flex;align-items:center;gap:.75rem;padding:.65rem .9rem;border-bottom:1px solid color-mix(in srgb,var(--isalwa-mist) 92%,var(--isalwa-kiln));background:#fff}
.op-row:nth-child(even){background:color-mix(in srgb,var(--isalwa-porcelain) 42%,white)}
.op-row .sub{font-weight:500}.op-row .meta{font-size:.75rem;color:var(--isalwa-slate);margin-top:.15rem}
.pill{display:inline-flex;align-items:center;border-radius:8px;padding:.25rem .65rem;font-size:11px;font-weight:500;background:color-mix(in srgb,var(--isalwa-success) 12%,white);color:var(--isalwa-success)}
.empty{border:1px dashed var(--isalwa-mist);border-radius:var(--radius);padding:1.5rem 2rem;background:color-mix(in srgb,var(--isalwa-porcelain) 82%,white)}
.empty h3{margin:0 0 .5rem}.empty p{margin:0;color:var(--isalwa-slate);max-width:28rem}
.example{margin-top:.75rem;padding:.5rem .75rem;border-radius:8px;background:color-mix(in srgb,var(--isalwa-glaze) 6%,white);font-size:.75rem;color:var(--isalwa-slate)}
.sticky{border:1px solid var(--isalwa-mist);border-radius:var(--radius);background:color-mix(in srgb,var(--isalwa-porcelain) 94%,white);padding:.75rem 1rem;margin-bottom:1rem;box-shadow:0 1px 0 rgba(28,36,48,.03),0 10px 28px rgba(28,36,48,.05)}
.card{background:#fff;border:1px solid var(--isalwa-mist);border-radius:var(--radius);padding:1.5rem;box-shadow:0 1px 0 rgba(28,36,48,.03),0 10px 28px rgba(28,36,48,.05);margin-bottom:1rem}
.section-label{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--isalwa-slate);font-weight:600}
.actions{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
.badge{font-size:10px;color:var(--isalwa-slate);margin-left:.5rem}
@media (max-width:420px){.shell{grid-template-columns:1fr}.rail{display:none}}
`;

function shell(active, body, title) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>${css}</style></head><body>
<div class="shell"><aside class="rail"><h1>ISALWA</h1><p>Sistema operativo de su empresa</p>
<nav class="nav">
<a class="${active==='clientes'?'active':''}">Clientes</a>
<a class="${active==='oportunidades'?'active':''}">Oportunidades</a>
<a class="${active==='cotizaciones'?'active':''}">Cotizaciones</a>
</nav></aside>
<div class="main"><div class="top"><span>Buscar ⌘K</span><span>CONECTADO COMO Carmen Staging</span></div>
<div class="page">${body}<p class="badge">SYNTH AFTER · visual-commercial · not hosted</p></div></div></div></body></html>`;
}

const pages = {
  'clientes': shell('clientes', `
    <p class="kicker">Relaciones</p><h2>Clientes</h2>
    <p class="desc">Busque empresas y contactos. Una misma empresa puede tener varias relaciones comerciales.</p>
    <div class="toolbar"><div class="row"><div style="flex:1"><label>Buscar clientes y contactos</label><input placeholder="Nombre, contacto o teléfono"/></div>
    <button class="btn-primary">Buscar</button><a class="btn-primary" style="text-decoration:none">Agregar cliente</a></div>
    <div class="chips"><span class="chip active">Todas</span><span class="chip">Cliente</span><span class="chip">Proveedor</span></div></div>
    <div class="surface">
      <div class="op-row"><div style="flex:1"><div class="sub">Cliente piloto activo</div><div class="meta">Cliente · Responsable: Carmen Staging</div></div><span class="pill">Activo</span></div>
      <div class="op-row"><div style="flex:1"><div class="sub">Distribuidor regional</div><div class="meta">Distribuidor</div></div><span class="pill">Activo</span></div>
    </div>`, 'Clientes AFTER'),
  'cliente360': shell('clientes', `
    <p class="kicker">Cliente</p><h2>Cliente piloto activo</h2>
    <div class="sticky"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:center">
      <div><strong>Cliente piloto activo</strong> <span class="pill">Activo</span><div class="meta" style="margin-top:.35rem;font-size:.75rem;color:var(--isalwa-slate)">Responsable comercial: Carmen Staging</div></div>
      <div class="actions"><a class="btn-primary" style="text-decoration:none">Nueva oportunidad</a><a class="btn-secondary">Registrar seguimiento</a></div>
    </div></div>
    <div class="card"><p class="section-label">¿Qué hago ahora?</p><p style="font-style:italic;margin:.5rem 0 0">No hay señal suficiente para indicar una próxima acción.</p></div>
    <div class="card"><p class="section-label">Oportunidades</p>
      <div class="empty commercial-empty-nest" style="margin-top:.75rem"><h3>Sin oportunidades todavía</h3>
      <p>Cuando se registren oportunidades para esta empresa, aparecerán aquí.</p>
      <div class="example"><strong>Ejemplo · </strong>Cliente activo sin pipeline: cero oportunidades es un estado real del piloto, no un fallo de pantalla.</div>
      <div style="margin-top:1rem"><a class="btn-primary" style="text-decoration:none">Nueva oportunidad</a></div></div></div>
    <div class="card"><p class="section-label">Cotizaciones</p>
      <div class="empty" style="margin-top:.75rem"><h3>Sin cotizaciones todavía</h3><p>Cuando se emitan cotizaciones para esta empresa, aparecerán aquí.</p>
      <div class="example"><strong>Ejemplo · </strong>Sin cotizaciones todavía es esperado si aún no hay oportunidad con borrador o envío.</div></div></div>
    <div class="card"><p class="section-label">Pedidos</p>
      <div class="empty" style="margin-top:.75rem"><h3>Sin pedidos todavía</h3><p>Cuando se registren pedidos para esta empresa, aparecerán aquí.</p>
      <div class="example"><strong>Ejemplo · </strong>Un cliente activo puede no tener pedidos. El vacío es intencional hasta que exista una cotización convertida.</div></div></div>`, 'Cliente360 AFTER'),
  'oportunidades': shell('oportunidades', `
    <p class="kicker">Comercial</p><h2>Oportunidades</h2>
    <div class="toolbar"><div class="row"><div style="flex:1"><label>Buscar</label><input placeholder="Título"/></div><button class="btn-primary">Buscar</button></div>
    <div class="chips"><span class="chip active">Abierta</span><span class="chip">Ganada</span><span class="chip">Perdida</span><span class="chip">Cancelada</span></div></div>
    <div class="empty"><h3>Sin oportunidades abiertas</h3>
    <p>Aquí aparecen las oportunidades abiertas, con cliente, etapa y responsable. Para registrar una, abra el cliente.</p>
    <div class="example"><strong>Ejemplo · </strong>Un cliente activo puede no tener oportunidades todavía. Ábralo y registre la primera desde allí.</div>
    <div style="margin-top:1rem"><a class="btn-primary" style="text-decoration:none">Ir a Clientes</a></div></div>`, 'Oportunidades AFTER'),
  'cotizaciones': shell('cotizaciones', `
    <p class="kicker">Comercial</p><h2>Cotizaciones</h2>
    <div class="toolbar"><div class="row"><div style="flex:1"><label>Buscar</label><input placeholder="Número de cotización"/></div><button class="btn-primary">Buscar</button></div>
    <div class="chips"><span class="chip active">Borrador</span><span class="chip">Enviadas</span><span class="chip">Aceptadas</span><span class="chip">Canceladas</span></div></div>
    <div class="empty"><h3>Sin cotizaciones</h3>
    <p>Un borrador se prepara desde una oportunidad del cliente. Ábralo allí para crear la cotización.</p>
    <div class="example"><strong>Ejemplo · </strong>Un cliente activo puede no tener cotizaciones todavía. La primera nace desde una oportunidad.</div>
    <div class="actions" style="margin-top:1rem"><a class="btn-primary" style="text-decoration:none">Ir a Clientes</a><a class="btn-secondary">Ver oportunidades</a></div></div>`, 'Cotizaciones AFTER'),
  'pedidos-empty': shell('clientes', `
    <p class="kicker">Cliente</p><h2>Cliente piloto activo · Pedidos</h2>
    <div class="card"><p class="section-label">Pedidos</p>
    <div class="empty" style="margin-top:.75rem"><h3>Sin pedidos todavía</h3>
    <p>Cuando se registren pedidos para esta empresa, aparecerán aquí.</p>
    <div class="example"><strong>Ejemplo · </strong>Nested empty pedido surface — intentional for real pilot with 0 orders.</div></div></div>`, 'Pedidos empty AFTER'),
};

const htmlDir = join(__dirname, '../.tmp/wave2-visual-commercial/synth');
mkdirSync(htmlDir, { recursive: true });
for (const [name, html] of Object.entries(pages)) {
  writeFileSync(join(htmlDir, `${name}.html`), html);
}

const server = createServer((req, res) => {
  const name = (req.url || '/').replace(/^\//, '').replace(/\.html$/, '') || 'clientes';
  const file = join(htmlDir, `${name}.html`);
  try {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end('missing');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });

for (const name of Object.keys(pages)) {
  for (const [label, width] of [
    ['1440', 1440],
    ['390', 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 } });
    await page.goto(`http://127.0.0.1:${port}/${name}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: join(outDir, `${name}-${label}.png`), fullPage: true });
    await page.close();
  }
}

await browser.close();
server.close();
console.log(JSON.stringify({ outDir, pages: Object.keys(pages), note: 'SYNTH AFTER — not hosted' }));
