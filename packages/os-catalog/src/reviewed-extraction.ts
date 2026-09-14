/**
 * Reviewed transcription of the two Vitri catalogs.
 * Page numbers are the PDF page that the extractor closed with "-- N of M --".
 * Values are the printed cells. Nothing here is a commercial code, a price, or a bill of materials.
 */

import type {
  AppearanceRole,
  ProductCategory,
  ReviewStatus,
  TechnicalAttributeKey,
} from '../../os-contracts/src/product-catalog';

export const REVIEWED_ON = '2026-09-14';

export const CATALOG_PDF = {
  filename: 'CatalogoVitriCompleto2026.pdf',
  sha256: '4de2f923f96942fa0f2612d857b11e8aa20bf42e5129e931e9ee834de16c25b0',
  byteSize: 7414832,
  pageCount: 21,
  coverLabel: 'catálogo 2026',
} as const;

export const SEASON_PDF = {
  filename: 'Vitri2026.2027.pdf',
  sha256: '3adf82c24ce25120ee6a33f00becc1fbdbc1a7908a55e0b58c4312de7ed87ceb',
  byteSize: 34760770,
  pageCount: 10,
  coverLabel: 'VITRI 2025-2026',
} as const;

const INSTALACION_305 = 'Tradicional de 305 mm – 12 pulgadas de la pared terminada';

type Source = typeof CATALOG_PDF | typeof SEASON_PDF;

export type AppearanceDraft = {
  sourceFilename: string;
  sourceSha256: string;
  page: number;
  printedLabel: string | null;
  role: AppearanceRole;
  excerpt: string;
};

export type AttributeDraft = {
  key: TechnicalAttributeKey;
  value: string;
  label: string | null;
  sourceFilename: string;
  page: number;
};

export type ProductDraft = {
  canonicalKey: string;
  name: string;
  category: ProductCategory;
  description: string | null;
  aliases: string[];
  reviewStatus: ReviewStatus;
  reviewNotes: string[];
  provenance: AppearanceDraft[];
  attributes: AttributeDraft[];
};

function cite(
  source: Source,
  page: number,
  role: AppearanceRole,
  excerpt: string,
  printedLabel: string | null = null,
): AppearanceDraft {
  return {
    sourceFilename: source.filename,
    sourceSha256: source.sha256,
    page,
    printedLabel,
    role,
    excerpt,
  };
}

function attr(
  source: Source,
  page: number,
  key: TechnicalAttributeKey,
  value: string,
  label: string | null,
): AttributeDraft {
  return {
    key,
    value,
    label,
    sourceFilename: source.filename,
    page,
  };
}

const catalogIndex = (excerpt: string) =>
  cite(CATALOG_PDF, 3, 'index', excerpt, 'índice general');

export const PRODUCT_DRAFTS: ProductDraft[] = [
  {
    canonicalKey: 'set-capri',
    name: 'Set Capri',
    category: 'sanitarios',
    description:
      'INODORO CAPRI + TANQUE CAPRI. Diseño clásico que se adapta a cualquier espacio.',
    aliases: ['CAPRI'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La ficha CAPRI del catálogo 2026 y la ficha SET CAPRI imprimen las mismas medidas de conjunto. El texto de diseño no crea otro producto.',
      'No se unió con Sanitario Capri ni con Tanque Capri: esas páginas imprimen medidas distintas.',
    ],
    provenance: [
      catalogIndex('Capri'),
      cite(
        CATALOG_PDF,
        5,
        'specification',
        'CAPRI. Dimensiones 69,50 × 41 × 36,50. Por gravedad – anillo abierto. Peso 20,40. Espejo 120 × 130.',
        'Sanitarios | 5',
      ),
      cite(
        CATALOG_PDF,
        6,
        'marketing',
        'CAPRI. Diseño clásico que se adapta a cualquier espacio.',
        'Sanitarios | 6',
      ),
      cite(
        SEASON_PDF,
        3,
        'specification',
        'CAPRI. SET CAPRI. INODORO CAPRI + TANQUE CAPRI. Dimensiones 69,50 x 41 x 36,50.',
      ),
      cite(SEASON_PDF, 3, 'composition', 'INODORO CAPRI + TANQUE CAPRI'),
    ],
    attributes: [
      attr(CATALOG_PDF, 5, 'dimensiones', '69,50 × 41 × 36,50', 'Dimensiones H × L × W (cm)'),
      attr(CATALOG_PDF, 5, 'sistemaDescarga', 'Por gravedad – anillo abierto', 'Sistema de descarga'),
      attr(CATALOG_PDF, 5, 'pesoAproximado', '20,40', 'Peso aproximado (Kg)'),
      attr(CATALOG_PDF, 5, 'espejoDeAgua', '120 × 130', 'Espejo de agua (mm)'),
      attr(CATALOG_PDF, 5, 'instalacion', INSTALACION_305, 'Instalación'),
      attr(SEASON_PDF, 3, 'dimensiones', '69,50 x 41 x 36,50', 'Dimensiones H x L x W (cm)'),
      attr(SEASON_PDF, 3, 'sistemaDescarga', 'Por gravedad - anillo abierto', 'Sistema de descarga'),
      attr(SEASON_PDF, 3, 'pesoAproximado', '20,40', 'Peso Aproximado (Kg)'),
      attr(SEASON_PDF, 3, 'espejoDeAgua', '120 x 130', 'Espejo de agua (mm)'),
      attr(SEASON_PDF, 3, 'instalacion', INSTALACION_305, 'Instalación'),
      attr(SEASON_PDF, 3, 'composicionImpresa', 'INODORO CAPRI + TANQUE CAPRI', null),
    ],
  },
  {
    canonicalKey: 'inodoro-capri',
    name: 'Sanitario Capri',
    category: 'sanitarios',
    description: null,
    aliases: ['Inodoro Capri'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La tabla lo nombra Sanitario Capri. Las páginas de ambiente lo nombran inodoro Capri. No es el Set Capri: la tabla imprime 67 × 36,5 × 37 y el set imprime 69,50 × 41 × 36,50.',
    ],
    provenance: [
      catalogIndex('Sanitario Capri'),
      cite(
        CATALOG_PDF,
        7,
        'comparison_table',
        'Sanitario Capri. Largo 67. Ancho 36,5. Profundidad 37. Desagüe 305. Espejo 120x130. Sifónico. Blanco Gris. Tanques Capri, Cadiz.',
        'Sanitarios | 7',
      ),
      cite(
        SEASON_PDF,
        8,
        'lifestyle',
        'el inodoro Capri aporta armonía gracias a su diseño limpio y funcional',
      ),
      cite(SEASON_PDF, 9, 'lifestyle', 'LAVAMANOS CON PEDESTAL + INODORO CAPRI'),
    ],
    attributes: [
      attr(CATALOG_PDF, 7, 'largo', '67', 'Largo'),
      attr(CATALOG_PDF, 7, 'ancho', '36,5', 'Ancho'),
      attr(CATALOG_PDF, 7, 'profundidad', '37', 'Profundidad'),
      attr(CATALOG_PDF, 7, 'distanciaDesaguePared', '305', 'Distancia de desagüe a la pared (cm)'),
      attr(CATALOG_PDF, 7, 'espejoDeAgua', '120x130', 'Espejo de agua (cm)'),
      attr(CATALOG_PDF, 7, 'metodoDescarga', 'Sifónico', 'Método de descarga'),
      attr(CATALOG_PDF, 7, 'colores', 'Blanco, Gris', 'Colores'),
      attr(CATALOG_PDF, 7, 'compatibilidadConTanques', 'Capri, Cadiz', 'Compatibilidad con tanques'),
    ],
  },
  {
    canonicalKey: 'set-cadiz',
    name: 'Set Cadiz',
    category: 'sanitarios',
    description:
      'INODORO CAPRI + TANQUE MILAN. Líneas modernas y funcionales para baños contemporáneos.',
    aliases: ['CADIZ'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La página del set imprime INODORO CAPRI + TANQUE MILAN. No se reescribió como inodoro Cadiz.',
      'El catálogo 2026 imprime espejo No especificado. El otro PDF imprime 120 x 130. No se eligió un valor.',
    ],
    provenance: [
      catalogIndex('Cadiz'),
      cite(
        CATALOG_PDF,
        5,
        'specification',
        'CADIZ. Dimensiones 76,50 × 41 × 36,50. Por gravedad – anillo abierto. Peso 20,35. Espejo No especificado.',
        'Sanitarios | 5',
      ),
      cite(
        CATALOG_PDF,
        6,
        'marketing',
        'CADIZ. Líneas modernas y funcionales para baños contemporáneos.',
        'Sanitarios | 6',
      ),
      cite(
        SEASON_PDF,
        2,
        'specification',
        'CADIZ. SET CADIZ. INODORO CAPRI + TANQUE MILAN. Dimensiones 76,50 x 41 x 36,50. Espejo 120 x 130.',
      ),
      cite(SEASON_PDF, 2, 'composition', 'INODORO CAPRI + TANQUE MILAN'),
    ],
    attributes: [
      attr(CATALOG_PDF, 5, 'dimensiones', '76,50 × 41 × 36,50', 'Dimensiones H × L × W (cm)'),
      attr(CATALOG_PDF, 5, 'sistemaDescarga', 'Por gravedad – anillo abierto', 'Sistema de descarga'),
      attr(CATALOG_PDF, 5, 'pesoAproximado', '20,35', 'Peso aproximado (Kg)'),
      attr(CATALOG_PDF, 5, 'espejoDeAgua', 'No especificado', 'Espejo de agua (mm)'),
      attr(CATALOG_PDF, 5, 'instalacion', INSTALACION_305, 'Instalación'),
      attr(SEASON_PDF, 2, 'dimensiones', '76,50 x 41 x 36,50', 'Dimensiones H x L x W (cm)'),
      attr(SEASON_PDF, 2, 'sistemaDescarga', 'Por gravedad - anillo abierto', 'Sistema de descarga'),
      attr(SEASON_PDF, 2, 'pesoAproximado', '20,35', 'Peso Aproximado (Kg)'),
      attr(SEASON_PDF, 2, 'espejoDeAgua', '120 x 130', 'Espejo de agua (mm)'),
      attr(SEASON_PDF, 2, 'instalacion', INSTALACION_305, 'Instalación'),
      attr(SEASON_PDF, 2, 'composicionImpresa', 'INODORO CAPRI + TANQUE MILAN', null),
    ],
  },
  {
    canonicalKey: 'sanitario-cadiz',
    name: 'Sanitario Cadiz',
    category: 'sanitarios',
    description: null,
    aliases: [],
    reviewStatus: 'dimensions_unspecified',
    reviewNotes: [
      'La tabla imprime xx en las medidas. No se copiaron las medidas del Set Cadiz.',
    ],
    provenance: [
      catalogIndex('Sanitario Cadiz'),
      cite(
        CATALOG_PDF,
        7,
        'comparison_table',
        'Sanitario Cadiz. Medidas xx. Blanco Gris. Compatibilidad xx.',
        'Sanitarios | 7',
      ),
    ],
    attributes: [attr(CATALOG_PDF, 7, 'colores', 'Blanco, Gris', 'Colores')],
  },
  {
    canonicalKey: 'sanitario-verso',
    name: 'Sanitario Verso (faldón)',
    category: 'sanitarios',
    description: 'Diseño minimalista y elegante para espacios sofisticados.',
    aliases: ['VERSO'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La ficha VERSO imprime 70 36 x 39 y la tabla imprime 70 × 36 × 39. Es el mismo sanitario, no un set aparte.',
      'La ficha imprime Por arrastre - anillo abierto. La tabla imprime Sifónico. Las dos citas se conservan.',
      'La fila repetida en la tabla de tanques no crea otro producto.',
    ],
    provenance: [
      catalogIndex('Verso'),
      catalogIndex('Sanitario Verso'),
      cite(
        CATALOG_PDF,
        5,
        'specification',
        'VERSO. Dimensiones 70 36 x 39. Por arrastre - anillo abierto. Peso 23.9 kg. Espejo 90 x 120 mm.',
        'Sanitarios | 5',
      ),
      cite(
        CATALOG_PDF,
        6,
        'marketing',
        'VERSO. Diseño minimalista y elegante para espacios sofisticados.',
        'Sanitarios | 6',
      ),
      cite(
        CATALOG_PDF,
        7,
        'comparison_table',
        'Sanitario Verso (faldón). Largo 70. Ancho 36. Profundidad 39. 305 + complemento. Espejo 90x120. Sifónico. Blanco Gris. Tanque Verso.',
        'Sanitarios | 7',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 5, 'dimensiones', '70 36 x 39', 'Dimensiones H × L × W (cm)'),
      attr(CATALOG_PDF, 5, 'sistemaDescarga', 'Por arrastre - anillo abierto.', 'Sistema de descarga'),
      attr(CATALOG_PDF, 5, 'pesoAproximado', '23.9 kg', 'Peso aproximado (Kg)'),
      attr(CATALOG_PDF, 5, 'espejoDeAgua', '90 x 120 mm', 'Espejo de agua (mm)'),
      attr(
        CATALOG_PDF,
        5,
        'instalacion',
        'Instalación tradicional de 305 mm - 12 pulgadas de la pared terminada.',
        'Instalación',
      ),
      attr(CATALOG_PDF, 7, 'largo', '70', 'Largo'),
      attr(CATALOG_PDF, 7, 'ancho', '36', 'Ancho'),
      attr(CATALOG_PDF, 7, 'profundidad', '39', 'Profundidad'),
      attr(CATALOG_PDF, 7, 'distanciaDesaguePared', '305 + complemento', 'Distancia de desagüe a la pared (cm)'),
      attr(CATALOG_PDF, 7, 'espejoDeAgua', '90x120', 'Espejo de agua (cm)'),
      attr(CATALOG_PDF, 7, 'metodoDescarga', 'Sifónico', 'Método de descarga'),
      attr(CATALOG_PDF, 7, 'colores', 'Blanco, Gris', 'Colores'),
      attr(CATALOG_PDF, 7, 'compatibilidadConTanques', 'Verso', 'Compatibilidad con tanques'),
    ],
  },
  {
    canonicalKey: 'alti',
    name: 'Alti',
    category: 'sanitarios',
    description: 'Inodoro Tanque Suspendido',
    aliases: ['Sanitario Alti (tanque alto)'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'Sanitario Alti (tanque alto) y Alti / Inodoro Tanque Suspendido imprimen 52,5 × 36,5 × 39. Un producto.',
      'Tanque Alto aparece solo en el índice y no se unió aquí: no hay ficha que pruebe que es el mismo.',
    ],
    provenance: [
      catalogIndex('Alti'),
      catalogIndex('Sanitario Alti'),
      cite(
        CATALOG_PDF,
        7,
        'comparison_table',
        'Sanitario Alti (tanque alto). Largo 52,5. Ancho 36,5. Profundidad 39. Desagüe 305. Espejo 120x130. Sifónico. Blanco Gris. Tanques NA.',
        'Sanitarios | 7',
      ),
      cite(
        SEASON_PDF,
        4,
        'specification',
        'ALTI. Inodoro Tanque Suspendido. Dimensiones 52,5x36,5x39. Sifonico. Peso 11,45. Espejo 120 x 130.',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 7, 'largo', '52,5', 'Largo'),
      attr(CATALOG_PDF, 7, 'ancho', '36,5', 'Ancho'),
      attr(CATALOG_PDF, 7, 'profundidad', '39', 'Profundidad'),
      attr(CATALOG_PDF, 7, 'distanciaDesaguePared', '305', 'Distancia de desagüe a la pared (cm)'),
      attr(CATALOG_PDF, 7, 'espejoDeAgua', '120x130', 'Espejo de agua (cm)'),
      attr(CATALOG_PDF, 7, 'metodoDescarga', 'Sifónico', 'Método de descarga'),
      attr(CATALOG_PDF, 7, 'colores', 'Blanco, Gris', 'Colores'),
      attr(CATALOG_PDF, 7, 'compatibilidadConTanques', 'NA', 'Compatibilidad con tanques'),
      attr(SEASON_PDF, 4, 'dimensiones', '52,5x36,5x39', 'Dimensiones H x L x W (cm)'),
      attr(SEASON_PDF, 4, 'sistemaDescarga', 'Sifonico', 'Sistema de descarga'),
      attr(SEASON_PDF, 4, 'pesoAproximado', '11,45', 'Peso Aproximado (Kg)'),
      attr(SEASON_PDF, 4, 'espejoDeAgua', '120 x 130', 'Espejo de agua (mm)'),
      attr(SEASON_PDF, 4, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'tanque-capri',
    name: 'Tanque Capri',
    category: 'tanques',
    description: null,
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'Nombrado también en la composición del Set Capri. La ficha del tanque es esta fila, no el set.',
    ],
    provenance: [
      catalogIndex('Tanque Capri'),
      cite(SEASON_PDF, 3, 'composition', 'INODORO CAPRI + TANQUE CAPRI'),
      cite(
        CATALOG_PDF,
        7,
        'comparison_table',
        'Tanque Capri. Largo 20. Ancho 42. Profundidad 23. Blanco, Gris. Capacidad 4,5. Sanitario Capri.',
        'Sanitarios | 7',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 7, 'largo', '20', 'Largo'),
      attr(CATALOG_PDF, 7, 'ancho', '42', 'Ancho'),
      attr(CATALOG_PDF, 7, 'profundidad', '23', 'Profundidad'),
      attr(CATALOG_PDF, 7, 'colores', 'Blanco, Gris', 'Colores'),
      attr(CATALOG_PDF, 7, 'capacidadDescarga', '4,5', 'Capacidad de descarga'),
      attr(CATALOG_PDF, 7, 'compatibilidadConSanitarios', 'Capri', 'Compatibilidad con sanitarios'),
    ],
  },
  {
    canonicalKey: 'tanque-cadiz',
    name: 'Tanque Cádiz',
    category: 'tanques',
    description: null,
    aliases: ['Tanque Cadiz'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La tabla imprime compatibilidad con Capri, no con Cadiz. Se dejó como está impreso.',
    ],
    provenance: [
      catalogIndex('Tanque Cadiz'),
      cite(
        CATALOG_PDF,
        7,
        'comparison_table',
        'Tanque Cádiz. Largo 16,5. Ancho 36. Profundidad 37. Blanco, Gris. Capacidad 4,5. Sanitario Capri.',
        'Sanitarios | 7',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 7, 'largo', '16,5', 'Largo'),
      attr(CATALOG_PDF, 7, 'ancho', '36', 'Ancho'),
      attr(CATALOG_PDF, 7, 'profundidad', '37', 'Profundidad'),
      attr(CATALOG_PDF, 7, 'colores', 'Blanco, Gris', 'Colores'),
      attr(CATALOG_PDF, 7, 'capacidadDescarga', '4,5', 'Capacidad de descarga'),
      attr(CATALOG_PDF, 7, 'compatibilidadConSanitarios', 'Capri', 'Compatibilidad con sanitarios'),
    ],
  },
  {
    canonicalKey: 'tanque-milan',
    name: 'Tanque Milan',
    category: 'tanques',
    description: null,
    aliases: [],
    reviewStatus: 'named_only',
    reviewNotes: [
      'Nombrado solo en la composición del Set Cadiz. Sin ficha y sin medidas.',
    ],
    provenance: [cite(SEASON_PDF, 2, 'composition', 'INODORO CAPRI + TANQUE MILAN')],
    attributes: [],
  },
  {
    canonicalKey: 'tanque-verso',
    name: 'Tanque Verso',
    category: 'tanques',
    description: null,
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: [],
    provenance: [
      catalogIndex('Tanque Verso'),
      cite(
        CATALOG_PDF,
        7,
        'comparison_table',
        'Tanque Verso. Largo 18,5. Ancho 39. Profundidad 41,5. Blanco, Gris. Capacidad 6. Sanitario Verso.',
        'Sanitarios | 7',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 7, 'largo', '18,5', 'Largo'),
      attr(CATALOG_PDF, 7, 'ancho', '39', 'Ancho'),
      attr(CATALOG_PDF, 7, 'profundidad', '41,5', 'Profundidad'),
      attr(CATALOG_PDF, 7, 'colores', 'Blanco, Gris', 'Colores'),
      attr(CATALOG_PDF, 7, 'capacidadDescarga', '6', 'Capacidad de descarga'),
      attr(CATALOG_PDF, 7, 'compatibilidadConSanitarios', 'Verso', 'Compatibilidad con sanitarios'),
    ],
  },
  {
    canonicalKey: 'lavamanos-pedestal-capri',
    name: 'Lavamanos con pedestal Capri',
    category: 'lavamanos',
    description: 'Diseño clásico y funcional que aporta elegancia y armonía a cualquier baño.',
    aliases: ['Completo', 'Lavamanos + pedestal Capri'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'El índice y la página de diseño lo llaman Completo, en la misma posición que Agatha y Bordda. La ficha lo llama Lavamanos + pedestal Capri. Un producto.',
      'El catálogo 2026 imprime peso 13 Kg/aprox. El otro PDF imprime peso lavamanos 9.2 kg y peso pedestal 5.8 kg. No se sumó ni se descartó ninguno.',
    ],
    provenance: [
      catalogIndex('Completo'),
      cite(
        CATALOG_PDF,
        9,
        'specification',
        'LAVAMANOS + PEDESTAL CAPRI. Alto 82 cm. Ancho 43 cm. Profundidad 39 cm. Peso 13 Kg/aprox.',
        'Lavamanos | 9',
      ),
      cite(
        CATALOG_PDF,
        10,
        'marketing',
        'COMPLETO. Diseño clásico y funcional que aporta elegancia y armonía a cualquier baño.',
        'Lavamanos | 10',
      ),
      cite(
        CATALOG_PDF,
        17,
        'comparison_table',
        'Lavamanos con pedestal Capri',
        'Lavamanos | 17',
      ),
      cite(
        SEASON_PDF,
        5,
        'specification',
        'LAVAMANOS CON PEDESTALCAPRI. Material loza con recubrimiento vitrificado. Peso lavamanos 9.2 kg. Peso pedestal 5.8 kg. Color blanco. Rebalse. Espesor 10–12 mm.',
      ),
      cite(SEASON_PDF, 9, 'lifestyle', 'El inodoro Capri y el lavamanos con pedestal'),
    ],
    attributes: [
      attr(CATALOG_PDF, 9, 'alto', '82 cm', 'Alto'),
      attr(CATALOG_PDF, 9, 'ancho', '43 cm', 'Ancho'),
      attr(CATALOG_PDF, 9, 'profundidad', '39 cm', 'Profundidad'),
      attr(CATALOG_PDF, 9, 'pesoAproximado', '13 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 9, 'instalacion', INSTALACION_305, 'Instalación'),
      attr(SEASON_PDF, 5, 'material', 'Loza con recubrimiento vitrificado', 'Material'),
      attr(SEASON_PDF, 5, 'pesoLavamanos', '9.2 kg', 'Peso lavamanos'),
      attr(SEASON_PDF, 5, 'pesoPedestal', '5.8 kg', 'Peso pedestal'),
      attr(SEASON_PDF, 5, 'color', 'blanco', null),
      attr(SEASON_PDF, 5, 'rebalse', 'con rebalse', null),
      attr(SEASON_PDF, 5, 'espesor', '10–12 mm', null),
      attr(SEASON_PDF, 5, 'calidad', 'grado A', null),
    ],
  },
  {
    canonicalKey: 'agatha',
    name: 'Agatha',
    category: 'lavamanos',
    description: 'Líneas contemporáneas y sofisticadas para espacios modernos y refinados.',
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: [],
    provenance: [
      catalogIndex('Agatha'),
      cite(
        CATALOG_PDF,
        9,
        'specification',
        'AGATHA. Alto 12 cm. Ancho 38 cm. Profundidad 38 cm. Peso 6,75 Kg/aprox.',
        'Lavamanos | 9',
      ),
      cite(
        CATALOG_PDF,
        10,
        'marketing',
        'AGATHA. Líneas contemporáneas y sofisticadas para espacios modernos y refinados.',
        'Lavamanos | 10',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 9, 'alto', '12 cm', 'Alto'),
      attr(CATALOG_PDF, 9, 'ancho', '38 cm', 'Ancho'),
      attr(CATALOG_PDF, 9, 'profundidad', '38 cm', 'Profundidad'),
      attr(CATALOG_PDF, 9, 'pesoAproximado', '6,75 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 9, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'bordda',
    name: 'Bordda',
    category: 'lavamanos',
    description: 'Diseño limpio y versátil que combina funcionalidad con una estética contemporánea.',
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: ['El PDF imprime Bordda. No se cambió la grafía.'],
    provenance: [
      catalogIndex('Bordda'),
      cite(
        CATALOG_PDF,
        9,
        'specification',
        'BORDDA. Alto 15 cm. Ancho 39 cm. Profundidad 39 cm. Peso 12,5 Kg/aprox.',
        'Lavamanos | 9',
      ),
      cite(
        CATALOG_PDF,
        10,
        'marketing',
        'BORDDA. Diseño limpio y versátil que combina funcionalidad con una estética contemporánea.',
        'Lavamanos | 10',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 9, 'alto', '15 cm', 'Alto'),
      attr(CATALOG_PDF, 9, 'ancho', '39 cm', 'Ancho'),
      attr(CATALOG_PDF, 9, 'profundidad', '39 cm', 'Profundidad'),
      attr(CATALOG_PDF, 9, 'pesoAproximado', '12,5 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 9, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'bari',
    name: 'Bari',
    category: 'lavamanos',
    description: 'Formas suaves y elegantes que crean un ambiente cálido y sofisticado.',
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: [],
    provenance: [
      catalogIndex('Bari'),
      cite(
        CATALOG_PDF,
        11,
        'specification',
        'BARI. Alto 23 cm. Ancho 50 cm. Profundidad 34,5 cm. Peso 10,95 Kg/aprox.',
        'Lavamanos | 11',
      ),
      cite(
        CATALOG_PDF,
        12,
        'marketing',
        'BARI. Formas suaves y elegantes que crean un ambiente cálido y sofisticado.',
        'Lavamanos | 12',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 11, 'alto', '23 cm', 'Alto'),
      attr(CATALOG_PDF, 11, 'ancho', '50 cm', 'Ancho'),
      attr(CATALOG_PDF, 11, 'profundidad', '34,5 cm', 'Profundidad'),
      attr(CATALOG_PDF, 11, 'pesoAproximado', '10,95 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 11, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'bowl-new-cuadrado',
    name: 'Bowl New Cuadrado',
    category: 'lavamanos',
    description: 'Geometría definida y diseño moderno para baños de estilo contemporáneo.',
    aliases: ['Bowl Cuadrado'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La tabla imprime Bowl Cuadrado. No se creó un segundo producto. Las cifras de esa fila no se copiaron: en la extracción de texto las columnas posteriores a las tres primeras no quedan alineadas.',
    ],
    provenance: [
      catalogIndex('Bowl New Cuadrado'),
      cite(
        CATALOG_PDF,
        11,
        'specification',
        'BOWL NEW CUADRADO. Alto 13 cm. Ancho 37,5 cm. Profundidad 28 cm. Peso 7,15 Kg/aprox.',
        'Lavamanos | 11',
      ),
      cite(
        CATALOG_PDF,
        12,
        'marketing',
        'BOWL NEW CUADRADO. Geometría definida y diseño moderno para baños de estilo contemporáneo.',
        'Lavamanos | 12',
      ),
      cite(CATALOG_PDF, 17, 'comparison_table', 'Bowl Cuadrado', 'Lavamanos | 17'),
    ],
    attributes: [
      attr(CATALOG_PDF, 11, 'alto', '13 cm', 'Alto'),
      attr(CATALOG_PDF, 11, 'ancho', '37,5 cm', 'Ancho'),
      attr(CATALOG_PDF, 11, 'profundidad', '28 cm', 'Profundidad'),
      attr(CATALOG_PDF, 11, 'pesoAproximado', '7,15 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 11, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'bowl-ovale',
    name: 'Bowl Ovale',
    category: 'lavamanos',
    description: 'Curvas suaves y proporciones equilibradas que aportan elegancia y amplitud visual.',
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: [],
    provenance: [
      catalogIndex('Bowl Ovale'),
      cite(
        CATALOG_PDF,
        11,
        'specification',
        'BOWL OVALE. Alto 19 cm. Ancho 49 cm. Profundidad 35,5 cm. Peso 9,10 Kg/aprox.',
        'Lavamanos | 11',
      ),
      cite(
        CATALOG_PDF,
        12,
        'marketing',
        'BOWL OVALE. Curvas suaves y proporciones equilibradas que aportan elegancia y amplitud visual.',
        'Lavamanos | 12',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 11, 'alto', '19 cm', 'Alto'),
      attr(CATALOG_PDF, 11, 'ancho', '49 cm', 'Ancho'),
      attr(CATALOG_PDF, 11, 'profundidad', '35,5 cm', 'Profundidad'),
      attr(CATALOG_PDF, 11, 'pesoAproximado', '9,10 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 11, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'domino',
    name: 'Domino',
    category: 'lavamanos',
    description: 'Diseño minimalista y atemporal que se adapta perfectamente a espacios modernos.',
    aliases: ['Dowl Domino de sobreponer'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La tabla imprime Dowl Domino de sobreponer. La ficha imprime DOMINO. No se creó un tercer producto y no se corrigió la tabla.',
      'La ficha imprime alto 9,5, ancho 60,5 y profundidad 31. La tabla imprime 31,5 × 60,5 × 10. Las dos citas se conservan.',
    ],
    provenance: [
      catalogIndex('Domino'),
      cite(
        CATALOG_PDF,
        13,
        'specification',
        'DOMINO. Alto 9,5 cm. Ancho 60,5 cm. Profundidad 31 cm. Peso 9,55 Kg/aprox.',
        'Lavamanos | 13',
      ),
      cite(
        CATALOG_PDF,
        14,
        'marketing',
        'DOMINO. Diseño minimalista y atemporal que se adapta perfectamente a espacios modernos.',
        'Lavamanos | 14',
      ),
      cite(
        CATALOG_PDF,
        17,
        'comparison_table',
        'Dowl Domino de sobreponer. 31,5. 60,5. 10. Sobreponer.',
        'Lavamanos | 17',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 13, 'alto', '9,5 cm', 'Alto'),
      attr(CATALOG_PDF, 13, 'ancho', '60,5 cm', 'Ancho'),
      attr(CATALOG_PDF, 13, 'profundidad', '31 cm', 'Profundidad'),
      attr(CATALOG_PDF, 13, 'pesoAproximado', '9,55 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 13, 'instalacion', INSTALACION_305, 'Instalación'),
      attr(CATALOG_PDF, 17, 'largo', '31,5', 'Largo'),
      attr(CATALOG_PDF, 17, 'ancho', '60,5', 'Ancho'),
      attr(CATALOG_PDF, 17, 'profundidad', '10', 'Profundidad'),
      attr(CATALOG_PDF, 17, 'metodoInstalacion', 'Sobreponer', 'Método de instalación'),
    ],
  },
  {
    canonicalKey: 'bowl-domino-embutir',
    name: 'Bowl Domino de embutir',
    category: 'lavamanos',
    description: null,
    aliases: [],
    reviewStatus: 'comparison_row_only',
    reviewNotes: [
      'La tabla lo lista aparte de Domino de sobreponer. Sin ficha propia. Las cifras de esa fila no se copiaron porque las columnas no quedan alineadas en la extracción.',
    ],
    provenance: [
      cite(CATALOG_PDF, 17, 'comparison_table', 'Bowl Domino de embutir', 'Lavamanos | 17'),
    ],
    attributes: [],
  },
  {
    canonicalKey: 'kayak',
    name: 'Kayak',
    category: 'lavamanos',
    description: 'Diseño orgánico y contemporáneo que combina comodidad, estilo y personalidad.',
    aliases: ['Bowl Kayak'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La ficha imprime alto 13, ancho 94,5 y profundidad 41,5. La tabla imprime largo 42, ancho 93,5 y profundidad 14. No se reconciliaron.',
    ],
    provenance: [
      catalogIndex('Kayak'),
      cite(
        CATALOG_PDF,
        13,
        'specification',
        'KAYAK. Alto 13 cm. Ancho 94,5 cm. Profundidad 41,5 cm. Peso 20,95 Kg/aprox.',
        'Lavamanos | 13',
      ),
      cite(
        CATALOG_PDF,
        14,
        'marketing',
        'KAYAK. Diseño orgánico y contemporáneo que combina comodidad, estilo y personalidad.',
        'Lavamanos | 14',
      ),
      cite(
        CATALOG_PDF,
        17,
        'comparison_table',
        'Bowl Kayak. 42. 93,5. 14. Sobreponer.',
        'Lavamanos | 17',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 13, 'alto', '13 cm', 'Alto'),
      attr(CATALOG_PDF, 13, 'ancho', '94,5 cm', 'Ancho'),
      attr(CATALOG_PDF, 13, 'profundidad', '41,5 cm', 'Profundidad'),
      attr(CATALOG_PDF, 13, 'pesoAproximado', '20,95 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 13, 'instalacion', INSTALACION_305, 'Instalación'),
      attr(CATALOG_PDF, 17, 'largo', '42', 'Largo'),
      attr(CATALOG_PDF, 17, 'ancho', '93,5', 'Ancho'),
      attr(CATALOG_PDF, 17, 'profundidad', '14', 'Profundidad'),
      attr(CATALOG_PDF, 17, 'metodoInstalacion', 'Sobreponer', 'Método de instalación'),
    ],
  },
  {
    canonicalKey: 'solare-blanco',
    name: 'Solare Blanco',
    category: 'lavamanos',
    description: 'Pureza de líneas y acabado elegante para espacios luminosos y sofisticados.',
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La tabla nombra Solare Blanco. Las cifras de esa fila no se copiaron porque las columnas no quedan alineadas en la extracción.',
    ],
    provenance: [
      catalogIndex('Solare Blanco'),
      cite(
        CATALOG_PDF,
        13,
        'specification',
        'SOLARE BLANCO. Alto 17,5 cm. Ancho 38 cm. Profundidad 38 cm. Peso 6,30 Kg/aprox.',
        'Lavamanos | 13',
      ),
      cite(
        CATALOG_PDF,
        14,
        'marketing',
        'SOLARE BLANCO. Pureza de líneas y acabado elegante para espacios luminosos y sofisticados.',
        'Lavamanos | 14',
      ),
      cite(CATALOG_PDF, 17, 'comparison_table', 'Solare Blanco', 'Lavamanos | 17'),
    ],
    attributes: [
      attr(CATALOG_PDF, 13, 'alto', '17,5 cm', 'Alto'),
      attr(CATALOG_PDF, 13, 'ancho', '38 cm', 'Ancho'),
      attr(CATALOG_PDF, 13, 'profundidad', '38 cm', 'Profundidad'),
      attr(CATALOG_PDF, 13, 'pesoAproximado', '6,30 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 13, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'gris-black',
    name: 'Gris Black',
    category: 'lavamanos',
    description: 'Diseño audaz y contemporáneo que aporta carácter y sofisticación al baño.',
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: [],
    provenance: [
      catalogIndex('Gris Black'),
      cite(
        CATALOG_PDF,
        15,
        'specification',
        'GRIS BLACK. Alto 15 cm. Ancho 37 cm. Profundidad 37 cm. Peso 6,60 Kg/aprox.',
        'Lavamanos | 15',
      ),
      cite(
        CATALOG_PDF,
        16,
        'marketing',
        'GRIS BLACK. Diseño audaz y contemporáneo que aporta carácter y sofisticación al baño.',
        'Lavamanos | 16',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 15, 'alto', '15 cm', 'Alto'),
      attr(CATALOG_PDF, 15, 'ancho', '37 cm', 'Ancho'),
      attr(CATALOG_PDF, 15, 'profundidad', '37 cm', 'Profundidad'),
      attr(CATALOG_PDF, 15, 'pesoAproximado', '6,60 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 15, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'quaza-blanco-satinado',
    name: 'Quaza Blanco Satinado',
    category: 'lavamanos',
    description: 'Elegancia sutil y acabado sofisticado para ambientes modernos y luminosos.',
    aliases: ['Blanco Satinado'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'La página de diseño imprime BLANCO SATINADO en el mismo lugar que la ficha llama QUAZA BLANCO SATINADO. Un producto, no uno llamado solo Blanco Satinado.',
    ],
    provenance: [
      catalogIndex('Quaza Blanco Satinado'),
      cite(
        CATALOG_PDF,
        15,
        'specification',
        'QUAZA BLANCO SATINADO. Alto 21 cm. Ancho 38 cm. Profundidad 38,5 cm. Peso 7,90 Kg/aprox.',
        'Lavamanos | 15',
      ),
      cite(
        CATALOG_PDF,
        16,
        'marketing',
        'BLANCO SATINADO. Elegancia sutil y acabado sofisticado para ambientes modernos y luminosos.',
        'Lavamanos | 16',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 15, 'alto', '21 cm', 'Alto'),
      attr(CATALOG_PDF, 15, 'ancho', '38 cm', 'Ancho'),
      attr(CATALOG_PDF, 15, 'profundidad', '38,5 cm', 'Profundidad'),
      attr(CATALOG_PDF, 15, 'pesoAproximado', '7,90 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 15, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'turin',
    name: 'Turin',
    category: 'lavamanos',
    description:
      'Líneas delicadas y proporciones armoniosas que aportan un toque de elegancia contemporánea.',
    aliases: [],
    reviewStatus: 'spec_page',
    reviewNotes: [],
    provenance: [
      catalogIndex('Turin'),
      cite(
        CATALOG_PDF,
        15,
        'specification',
        'TURIN. Alto 8 cm. Ancho 73,5 cm. Profundidad 36,5 cm. Peso 9,75 Kg/aprox.',
        'Lavamanos | 15',
      ),
      cite(
        CATALOG_PDF,
        16,
        'marketing',
        'TURIN. Líneas delicadas y proporciones armoniosas que aportan un toque de elegancia contemporánea.',
        'Lavamanos | 16',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 15, 'alto', '8 cm', 'Alto'),
      attr(CATALOG_PDF, 15, 'ancho', '73,5 cm', 'Ancho'),
      attr(CATALOG_PDF, 15, 'profundidad', '36,5 cm', 'Profundidad'),
      attr(CATALOG_PDF, 15, 'pesoAproximado', '9,75 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 15, 'instalacion', INSTALACION_305, 'Instalación'),
    ],
  },
  {
    canonicalKey: 'bowl-luma',
    name: 'Bowl Luma',
    category: 'lavamanos',
    description:
      'El bowl LUMA de sobreponer en color blanco combina diseño moderno con gran resistencia.',
    aliases: ['BOWL DE SOBREPONER'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'Las páginas de ambiente repiten Bowl Luma. No crean otro producto.',
    ],
    provenance: [
      cite(
        CATALOG_PDF,
        17,
        'comparison_table',
        'Bowl Luma. 34. 34. 11. Sobreponer.',
        'Lavamanos | 17',
      ),
      cite(
        SEASON_PDF,
        6,
        'specification',
        'BOWL LUMA. BOWL DE SOBREPONER. Peso 7,3 kg. Material loza con recubrimiento vitrificado. Color blanco. Espesor 10 a 12 mm. Grado A.',
      ),
      cite(SEASON_PDF, 8, 'lifestyle', 'el bowl Luma agregan un toque contemporáneo y minimalista'),
      cite(SEASON_PDF, 9, 'lifestyle', 'el bowl Luma transforma tu baño en un espacio moderno y elegante'),
      cite(SEASON_PDF, 10, 'lifestyle', 'Tendencia y atemporalidad se unen en Vitri con el Bowl Luma'),
    ],
    attributes: [
      attr(CATALOG_PDF, 17, 'largo', '34', 'Largo'),
      attr(CATALOG_PDF, 17, 'ancho', '34', 'Ancho'),
      attr(CATALOG_PDF, 17, 'profundidad', '11', 'Profundidad'),
      attr(CATALOG_PDF, 17, 'metodoInstalacion', 'Sobreponer', 'Método de instalación'),
      attr(SEASON_PDF, 6, 'pesoAproximado', '7,3 kg', 'Peso'),
      attr(SEASON_PDF, 6, 'material', 'Loza con recubrimiento vitrificado', 'Material'),
      attr(SEASON_PDF, 6, 'color', 'blanco', null),
      attr(SEASON_PDF, 6, 'espesor', '10 a 12 mm', null),
      attr(SEASON_PDF, 6, 'calidad', 'grado A', null),
    ],
  },
  {
    canonicalKey: 'urinario-acqua',
    name: 'Urinario Acqua',
    category: 'urinarios',
    description:
      'Diseño moderno y funcional, con líneas suaves y una forma compacta que aporta elegancia y practicidad a espacios contemporáneos.',
    aliases: ['Urinario'],
    reviewStatus: 'spec_page',
    reviewNotes: [
      'El catálogo 2026 imprime URINARIO sin nombre de línea, con alto 39,5 cm, ancho 24,5 cm, profundidad 24 cm y peso 5,85 Kg/aprox. El otro PDF imprime URINARIO ACQUA con esas mismas medidas. Un producto.',
    ],
    provenance: [
      cite(
        CATALOG_PDF,
        19,
        'specification',
        'URINARIO. Alto 39,5 cm. Ancho 24,5 cm. Profundidad 24 cm. Peso 5,85 Kg/aprox.',
        'Lavamanos | 19',
      ),
      cite(
        CATALOG_PDF,
        19,
        'marketing',
        'Diseño moderno y funcional, con líneas suaves y una forma compacta que aporta elegancia y practicidad a espacios contemporáneos.',
        'Lavamanos | 19',
      ),
      cite(
        SEASON_PDF,
        7,
        'specification',
        'URINARIO. URINARIO ACQUA. Peso 5,85. Alto 39,5cm. Ancho 24,5cm. Profundidad 24cm.',
      ),
    ],
    attributes: [
      attr(CATALOG_PDF, 19, 'alto', '39,5 cm', 'Alto'),
      attr(CATALOG_PDF, 19, 'ancho', '24,5 cm', 'Ancho'),
      attr(CATALOG_PDF, 19, 'profundidad', '24 cm', 'Profundidad'),
      attr(CATALOG_PDF, 19, 'pesoAproximado', '5,85 Kg/aprox', 'Peso'),
      attr(CATALOG_PDF, 19, 'instalacion', INSTALACION_305, 'Instalación'),
      attr(SEASON_PDF, 7, 'pesoAproximado', '5,85', 'Peso'),
      attr(SEASON_PDF, 7, 'alto', '39,5cm', 'Alto'),
      attr(SEASON_PDF, 7, 'ancho', '24,5cm', 'Ancho'),
      attr(SEASON_PDF, 7, 'profundidad', '24cm', 'Profundidad'),
      attr(SEASON_PDF, 7, 'material', 'Loza con recubrimiento vitrificado', 'Material'),
    ],
  },
];

export const UNRESOLVED = [
  {
    name: 'Tanque Alto',
    sourceFilename: CATALOG_PDF.filename,
    page: 3,
    excerpt: 'Tanque Alto',
    reason:
      'Aparece en el índice, sección tanques. No se extrajo una ficha con atributos propios. No se creó un producto para no duplicar Alti ni inventar medidas.',
  },
];

export const DEDUPE_DECISIONS = [
  {
    canonicalKey: 'set-capri',
    keptAs: 'Set Capri',
    collapsed: [
      'CatalogoVitriCompleto2026.pdf p.5 CAPRI',
      'CatalogoVitriCompleto2026.pdf p.6 texto de diseño',
      'Vitri2026.2027.pdf p.3 SET CAPRI',
    ],
    distinctFrom: ['inodoro-capri', 'tanque-capri'],
    reason:
      'El set, el sanitario y el tanque imprimen nombres y medidas distintos. El texto de diseño no es un cuarto producto.',
  },
  {
    canonicalKey: 'set-cadiz',
    keptAs: 'Set Cadiz',
    collapsed: [
      'CatalogoVitriCompleto2026.pdf p.5 CADIZ',
      'CatalogoVitriCompleto2026.pdf p.6 texto de diseño',
      'Vitri2026.2027.pdf p.2 SET CADIZ',
    ],
    distinctFrom: ['sanitario-cadiz', 'tanque-cadiz', 'tanque-milan', 'inodoro-capri'],
    reason:
      'La página del set imprime una composición y medidas de conjunto. El sanitario Cadiz de la tabla no trae medidas y no se fundió con el set.',
  },
  {
    canonicalKey: 'urinario-acqua',
    keptAs: 'Urinario Acqua',
    collapsed: [
      'CatalogoVitriCompleto2026.pdf p.19 URINARIO',
      'Vitri2026.2027.pdf p.7 URINARIO ACQUA',
    ],
    distinctFrom: [],
    reason: 'Las dos páginas imprimen las mismas medidas. Una no trae nombre de línea; la otra imprime Acqua.',
  },
  {
    canonicalKey: 'lavamanos-pedestal-capri',
    keptAs: 'Lavamanos con pedestal Capri',
    collapsed: [
      'CatalogoVitriCompleto2026.pdf p.9 Lavamanos + pedestal Capri',
      'CatalogoVitriCompleto2026.pdf p.10 Completo',
      'Vitri2026.2027.pdf p.5 Lavamanos con pedestal',
    ],
    distinctFrom: ['inodoro-capri', 'set-capri'],
    reason:
      'Completo ocupa el mismo lugar de la serie que la ficha del lavamanos con pedestal. No es otro Capri.',
  },
];

export const DOCUMENT_NOTES = [
  'Esto no es una lista de precios. No hay captura de lista de precios.',
  'No se inventaron códigos comerciales, precios, costos, márgenes, impuestos, plazos, stock ni una lista de materiales.',
  'La palabra PRICE aparece sin monto en Vitri2026.2027.pdf páginas 8 y 9. No se guardó un precio.',
  'La columna capacidad de descarga imprime 6 y 4,5 sin unidad. No se asumió litros.',
  'La portada de Vitri2026.2027.pdf imprime VITRI 2025-2026. El nombre de archivo no se corrigió.',
  'La presentación de la empresa, el índice como texto y los encabezados de sección no son productos.',
  'La vista previa no se importó a una base.',
];

export const PRINTED_LABELS_WITHOUT_AMOUNT = [
  {
    sourceFilename: SEASON_PDF.filename,
    page: 8,
    excerpt: 'Gama CromáticaPRICE',
    amount: null,
  },
  {
    sourceFilename: SEASON_PDF.filename,
    page: 9,
    excerpt: 'PRICE',
    amount: null,
  },
];
