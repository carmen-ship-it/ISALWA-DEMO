export type SeedProfile = 'ci' | 'demo' | 'full';

export type SeedConfig = {
  profile: SeedProfile;
  seedKey: string;
  accountCount: number;
  historyMonths: number;
  asOf: Date;
};

export function resolveSeedConfig(env: NodeJS.ProcessEnv = process.env): SeedConfig {
  const profile = (env.SEED_PROFILE as SeedProfile) || 'demo';
  const seedKey = env.SEED_KEY || 'isalwa-universe-v1';
  const asOf = env.SEED_AS_OF ? new Date(env.SEED_AS_OF) : new Date('2026-07-24T12:00:00.000Z');
  const counts: Record<SeedProfile, number> = { ci: 40, demo: 180, full: 400 };
  const months: Record<SeedProfile, number> = { ci: 18, demo: 36, full: 42 };
  return {
    profile,
    seedKey,
    accountCount: counts[profile] ?? 180,
    historyMonths: months[profile] ?? 36,
    asOf,
  };
}

export const ORG = {
  id: 'org_isalwa_srl_001',
  name: 'ISALWA S.R.L.',
  slug: 'isalwa',
  nit: '328376020',
};

export const TERRITORIES = [
  { code: 'SCZ-CENTRO', name: 'Santa Cruz Centro', city: 'Santa Cruz de la Sierra', lat: -17.7833, lng: -63.1821 },
  { code: 'SCZ-NORTE', name: 'Santa Cruz Norte', city: 'Santa Cruz de la Sierra', lat: -17.72, lng: -63.16 },
  { code: 'SCZ-ESTE', name: 'Santa Cruz Este', city: 'Santa Cruz de la Sierra', lat: -17.78, lng: -63.1 },
  { code: 'PORONGO', name: 'Porongo / Urubó', city: 'Porongo', lat: -17.8333, lng: -63.3167 },
  { code: 'WARNES', name: 'Warnes', city: 'Warnes', lat: -17.5, lng: -63.1667 },
  { code: 'MONTERO', name: 'Montero', city: 'Montero', lat: -17.3333, lng: -63.25 },
  { code: 'LA-GUARDIA', name: 'La Guardia', city: 'La Guardia', lat: -17.89, lng: -63.321 },
] as const;

/** Customer behavioral archetypes — drive history, not random noise. */
export const PERSONAS = [
  {
    key: 'vip_grower',
    weight: 8,
    segment: 'A' as const,
    types: ['distribuidor', 'ferreteria'] as const,
    orderEveryDays: [25, 40],
    growth: 0.08,
    payDiscipline: 0.92,
    negotiate: 0.35,
    visitEveryDays: [14, 21],
    families: ['inodoros', 'lavamanos', 'tanques'],
  },
  {
    key: 'steady_ferreteria',
    weight: 22,
    segment: 'B' as const,
    types: ['ferreteria'] as const,
    orderEveryDays: [35, 55],
    growth: 0.02,
    payDiscipline: 0.8,
    negotiate: 0.45,
    visitEveryDays: [21, 35],
    families: ['inodoros', 'accesorios', 'tanques_inodoro'],
  },
  {
    key: 'constructora_project',
    weight: 14,
    segment: 'A' as const,
    types: ['constructora'] as const,
    orderEveryDays: [20, 60],
    growth: 0.05,
    payDiscipline: 0.7,
    negotiate: 0.55,
    visitEveryDays: [10, 20],
    families: ['inodoros', 'lavamanos', 'bidets', 'urinarios'],
  },
  {
    key: 'declining_silent',
    weight: 10,
    segment: 'B' as const,
    types: ['ferreteria', 'instalador'] as const,
    orderEveryDays: [70, 120],
    growth: -0.15,
    payDiscipline: 0.65,
    negotiate: 0.3,
    visitEveryDays: [40, 70],
    families: ['inodoros', 'accesorios'],
    quietMonths: 3,
  },
  {
    key: 'negotiator',
    weight: 12,
    segment: 'B' as const,
    types: ['ferreteria', 'distribuidor'] as const,
    orderEveryDays: [30, 50],
    growth: 0.01,
    payDiscipline: 0.75,
    negotiate: 0.9,
    visitEveryDays: [18, 28],
    families: ['inodoros', 'lavamanos'],
  },
  {
    key: 'specialist_tanks',
    weight: 10,
    segment: 'B' as const,
    types: ['distribuidor', 'ferreteria'] as const,
    orderEveryDays: [40, 65],
    growth: 0.04,
    payDiscipline: 0.85,
    negotiate: 0.25,
    visitEveryDays: [25, 40],
    families: ['tanques_plasticos', 'tanques_inodoro'],
  },
  {
    key: 'debt_risk',
    weight: 8,
    segment: 'A' as const,
    types: ['constructora', 'distribuidor'] as const,
    orderEveryDays: [30, 45],
    growth: 0.03,
    payDiscipline: 0.35,
    negotiate: 0.5,
    visitEveryDays: [14, 25],
    families: ['inodoros', 'lavamanos', 'bidets'],
  },
  {
    key: 'new_rising',
    weight: 10,
    segment: 'C' as const,
    types: ['ferreteria', 'instalador'] as const,
    orderEveryDays: [45, 70],
    growth: 0.2,
    payDiscipline: 0.88,
    negotiate: 0.2,
    visitEveryDays: [30, 45],
    families: ['inodoros', 'accesorios'],
    maxHistoryMonths: 10,
  },
  {
    key: 'instalador_small',
    weight: 6,
    segment: 'C' as const,
    types: ['instalador'] as const,
    orderEveryDays: [50, 90],
    growth: 0.0,
    payDiscipline: 0.9,
    negotiate: 0.15,
    visitEveryDays: [35, 60],
    families: ['inodoros', 'accesorios', 'repuestos'],
  },
] as const;

export type Persona = (typeof PERSONAS)[number];

export const PRODUCT_CATALOG: Array<{
  category: string;
  sku: string;
  name: string;
  listPriceBob: number;
  family: string;
}> = [
  { category: 'Inodoros', sku: 'INO-STD-01', name: 'Inodoro estándar descarga dual', listPriceBob: 420, family: 'inodoros' },
  { category: 'Inodoros', sku: 'INO-STD-02', name: 'Inodoro estándar alargado', listPriceBob: 460, family: 'inodoros' },
  { category: 'Inodoros', sku: 'INO-PREM-01', name: 'Inodoro premium one-piece', listPriceBob: 890, family: 'inodoros' },
  { category: 'Inodoros', sku: 'INO-PREM-02', name: 'Inodoro suspendido premium', listPriceBob: 1120, family: 'inodoros' },
  { category: 'Inodoros', sku: 'INO-ECO-01', name: 'Inodoro bajo consumo', listPriceBob: 380, family: 'inodoros' },
  { category: 'Inodoros', sku: 'INO-CHI-01', name: 'Inodoro infantil', listPriceBob: 340, family: 'inodoros' },
  { category: 'Tanques de inodoro', sku: 'TAN-INO-01', name: 'Tanque de agua para inodoro estándar', listPriceBob: 145, family: 'tanques_inodoro' },
  { category: 'Tanques de inodoro', sku: 'TAN-INO-02', name: 'Tanque dual flush', listPriceBob: 175, family: 'tanques_inodoro' },
  { category: 'Tanques de inodoro', sku: 'TAN-INO-03', name: 'Tanque para inodoro premium', listPriceBob: 210, family: 'tanques_inodoro' },
  { category: 'Lavamanos', sku: 'LAV-01', name: 'Lavamanos pedestal blanco', listPriceBob: 260, family: 'lavamanos' },
  { category: 'Lavamanos', sku: 'LAV-02', name: 'Lavamanos sobre mesón', listPriceBob: 290, family: 'lavamanos' },
  { category: 'Lavamanos', sku: 'LAV-03', name: 'Lavamanos suspendido', listPriceBob: 320, family: 'lavamanos' },
  { category: 'Lavamanos', sku: 'LAV-04', name: 'Lavamanos doble', listPriceBob: 540, family: 'lavamanos' },
  { category: 'Bidés', sku: 'BID-01', name: 'Bidé cerámico estándar', listPriceBob: 310, family: 'bidets' },
  { category: 'Bidés', sku: 'BID-02', name: 'Bidé premium', listPriceBob: 480, family: 'bidets' },
  { category: 'Urinarios', sku: 'URI-01', name: 'Urinario mural', listPriceBob: 390, family: 'urinarios' },
  { category: 'Urinarios', sku: 'URI-02', name: 'Urinario sensor', listPriceBob: 720, family: 'urinarios' },
  { category: 'Tanques plásticos', sku: 'TPL-500', name: 'Tanque plástico 500 L', listPriceBob: 680, family: 'tanques_plasticos' },
  { category: 'Tanques plásticos', sku: 'TPL-1000', name: 'Tanque plástico 1000 L', listPriceBob: 980, family: 'tanques_plasticos' },
  { category: 'Tanques plásticos', sku: 'TPL-2000', name: 'Tanque plástico 2000 L', listPriceBob: 1650, family: 'tanques_plasticos' },
  { category: 'Tanques plásticos', sku: 'TPL-5000', name: 'Tanque plástico 5000 L', listPriceBob: 3200, family: 'tanques_plasticos' },
  { category: 'Asientos/Accesorios', sku: 'ASI-01', name: 'Asiento inodoro estándar', listPriceBob: 55, family: 'accesorios' },
  { category: 'Asientos/Accesorios', sku: 'ASI-02', name: 'Asiento soft-close', listPriceBob: 95, family: 'accesorios' },
  { category: 'Asientos/Accesorios', sku: 'KIT-INST-01', name: 'Kit instalación sanitario', listPriceBob: 48, family: 'accesorios' },
  { category: 'Repuestos', sku: 'REP-VAL-01', name: 'Válvula de descarga', listPriceBob: 65, family: 'repuestos' },
  { category: 'Repuestos', sku: 'REP-FLA-01', name: 'Flapper / sello', listPriceBob: 28, family: 'repuestos' },
  { category: 'Repuestos', sku: 'REP-GRI-01', name: 'Grifería lavamanos básica', listPriceBob: 120, family: 'repuestos' },
  { category: 'Inodoros', sku: 'INO-OAS-01', name: 'Inodoro línea Oasis', listPriceBob: 510, family: 'inodoros' },
  { category: 'Lavamanos', sku: 'LAV-FAN-01', name: 'Lavamanos línea showroom', listPriceBob: 350, family: 'lavamanos' },
  { category: 'Inodoros', sku: 'INO-COM-01', name: 'Combo inodoro + tanque', listPriceBob: 560, family: 'inodoros' },
];

export const BUSINESS_NAMES = [
  'Ferretería El Constructor',
  'Distribuidora Norte SCZ',
  'Acabados del Oriente',
  'Sanitarios La Guardia',
  'Casa del Baño Warnes',
  'Materiales Montero',
  'Ferretería Don Mateo',
  'Constructora Valle Verde',
  'Instalaciones Rápidas SRL',
  'Depósito Cerámico Sur',
  'Todo Baño Santa Cruz',
  'Ferretería Hermano Mayor',
  'Proyectos Habitacionales Andinos',
  'Suministros Porongo',
  'Hogar y Obra Express',
  'Cerámica del Plan 3000',
  'Baños & Más Equipamiento',
  'Comercial Urubó',
  'Ferretería Central Equipetrol',
  'Distribuciones Chiquitania',
];

export const FIRST_NAMES = [
  'Carlos', 'María', 'Luis', 'Andrea', 'Jorge', 'Patricia', 'Miguel', 'Rosa', 'Fernando', 'Claudia',
  'Diego', 'Sandra', 'Ricardo', 'Elena', 'Pablo', 'Verónica', 'Hugo', 'Natalia', 'Álvaro', 'Paola',
];

export const LAST_NAMES = [
  'Vargas', 'Mendoza', 'Rocha', 'Suárez', 'Pérez', 'García', 'Flores', 'Quiroga', 'Añez', 'Justiniano',
  'Antelo', 'Soliz', 'Egüez', 'Ribera', 'Cuéllar', 'Parada', 'Vaca', 'Moreno', 'Cruz', 'Salvatierra',
];

export const TEAM = [
  { key: 'owner', name: 'Ana Isabel Rojas', email: 'ana.rojas@isalwa.demo', role: 'Propietaria', phone: '+59170010001' },
  { key: 'gerente', name: 'Marcos Peña', email: 'marcos.pena@isalwa.demo', role: 'GerenteComercial', phone: '+59170010002' },
  { key: 'sup_norte', name: 'María Fernanda Díaz', email: 'maria.diaz@isalwa.demo', role: 'SupervisorZona', phone: '+59170010003' },
  { key: 'sup_sur', name: 'Roberto Aguilar', email: 'roberto.aguilar@isalwa.demo', role: 'SupervisorZona', phone: '+59170010004' },
  { key: 'asesor_1', name: 'Carlos Méndez', email: 'carlos.mendez@isalwa.demo', role: 'AsesorVentas', phone: '+59170010011', territories: ['SCZ-CENTRO', 'PORONGO'] },
  { key: 'asesor_2', name: 'Lucía Benítez', email: 'lucia.benitez@isalwa.demo', role: 'AsesorVentas', phone: '+59170010012', territories: ['SCZ-NORTE', 'WARNES'] },
  { key: 'asesor_3', name: 'Pedro Choque', email: 'pedro.choque@isalwa.demo', role: 'AsesorVentas', phone: '+59170010013', territories: ['SCZ-ESTE', 'LA-GUARDIA'] },
  { key: 'asesor_4', name: 'Valeria Torrico', email: 'valeria.torrico@isalwa.demo', role: 'AsesorVentas', phone: '+59170010014', territories: ['MONTERO', 'WARNES'] },
  { key: 'asesor_5', name: 'Andrés Camacho', email: 'andres.camacho@isalwa.demo', role: 'AsesorVentas', phone: '+59170010015', territories: ['SCZ-CENTRO', 'SCZ-NORTE'] },
  { key: 'asesor_6', name: 'Sofía Limpias', email: 'sofia.limpias@isalwa.demo', role: 'AsesorVentas', phone: '+59170010016', territories: ['PORONGO', 'LA-GUARDIA'] },
  { key: 'wa_1', name: 'Andrea Quiroga', email: 'andrea.quiroga@isalwa.demo', role: 'OperadorWhatsApp', phone: '+59170010021' },
  { key: 'wa_2', name: 'Diego Salas', email: 'diego.salas@isalwa.demo', role: 'OperadorWhatsApp', phone: '+59170010022' },
  { key: 'cobranzas', name: 'Luis Arce', email: 'luis.arce@isalwa.demo', role: 'Cobranzas', phone: '+59170010031' },
  { key: 'facturacion', name: 'Patricia Nogales', email: 'patricia.nogales@isalwa.demo', role: 'Facturacion', phone: '+59170010032' },
  { key: 'almacen', name: 'Sofía Mercado', email: 'sofia.mercado@isalwa.demo', role: 'Almacen', phone: '+59170010041' },
  { key: 'admin', name: 'Admin Sistema', email: 'admin@isalwa.demo', role: 'AdminSistema', phone: '+59170010099' },
] as const;

export const WA_CHANNELS = [
  { purpose: 'ventas', displayName: 'ISALWA Ventas', phone: '+59171348865' },
  { purpose: 'cobranzas', displayName: 'ISALWA Cobranzas', phone: '+59176303481' },
  { purpose: 'soporte', displayName: 'ISALWA Soporte', phone: '+59170010999' },
] as const;

/**
 * Hero cast for the 8-minute Demo Journey — always seeded first with stable IDs.
 * These are the accounts “everyone in the company knows.”
 */
export const HERO_ACCOUNTS = [
  {
    key: 'casa_ceramica',
    code: 'H-VIP-001',
    legalName: 'Casa Cerámica Oriente S.R.L.',
    tradeName: 'Casa Cerámica Oriente',
    personaKey: 'vip_grower' as const,
    territoryCode: 'SCZ-ESTE',
    advisorKey: 'asesor_3',
    accountType: 'distribuidor',
    phone: '+59178001001',
    story: 'Cuenta orgullo: crece cada trimestre y compra paquetes de baño completos.',
  },
  {
    key: 'valle_andino',
    code: 'H-DEBT-001',
    legalName: 'Constructora Valle Andino S.R.L.',
    tradeName: 'Constructora Valle Andino',
    personaKey: 'debt_risk' as const,
    territoryCode: 'SCZ-NORTE',
    advisorKey: 'asesor_2',
    accountType: 'constructora',
    phone: '+59178001002',
    story: 'Compra fuerte en obra, paga tarde — el momento de cartera en riesgo.',
  },
  {
    key: 'don_julio',
    code: 'H-SILENT-001',
    legalName: 'Ferretería Don Julio Equipetrol',
    tradeName: 'Ferretería Don Julio Equipetrol',
    personaKey: 'declining_silent' as const,
    territoryCode: 'SCZ-CENTRO',
    advisorKey: 'asesor_1',
    accountType: 'ferreteria',
    phone: '+59178001003',
    story: 'Cliente histórico que se enfrió — el descubrimiento de silencio.',
  },
  {
    key: 'tanques_norte',
    code: 'H-TANK-001',
    legalName: 'Tanques del Norte Distribuciones',
    tradeName: 'Tanques del Norte',
    personaKey: 'specialist_tanks' as const,
    territoryCode: 'WARNES',
    advisorKey: 'asesor_2',
    accountType: 'distribuidor',
    phone: '+59178001004',
    story: 'Especialista: casi solo tanques plásticos y tanques de inodoro.',
  },
  {
    key: 'negocia_ya',
    code: 'H-NEG-001',
    legalName: 'Acabados Negocia Ya',
    tradeName: 'Acabados Negocia Ya',
    personaKey: 'negotiator' as const,
    territoryCode: 'PORONGO',
    advisorKey: 'asesor_1',
    accountType: 'ferreteria',
    phone: '+59178001005',
    story: 'Siempre empuja precio — héroe del último precio en cotización.',
  },
] as const;

export const PERMISSION_KEYS = [
  'accounts.read',
  'accounts.write',
  'quotes.read',
  'quotes.write',
  'quotes.send',
  'visits.checkin',
  'wa.inbox',
  'reports.executive',
  'admin.users',
  'collections.manage',
  'prices.view_cost',
] as const;

export function bobToCentavos(bob: number): bigint {
  return BigInt(Math.round(bob * 100));
}
