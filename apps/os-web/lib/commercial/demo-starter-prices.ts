/**
 * Synthetic Demo-only unit prices for quote-entry convenience.
 * These are not product identity, not Real prices, and not pricing governance.
 */

export const DEMO_PRICE_COPY = 'Precio de demostración. Puede modificarlo.';

/** Fixed BOB amounts. Same values every session. Not market prices. */
export const DEMO_STARTER_UNIT_PRICES_BOB: Readonly<Record<string, number>> = {
  'sanitario-capri': 850,
  'sanitario-cadiz': 900,
  'sanitario-verso': 1050,
  'sanitario-alti': 800,
  'lavamanos-pedestal-capri': 650,
  agatha: 420,
  bordda: 450,
  bari: 480,
  'bowl-new-cuadrado': 390,
  'bowl-ovale': 410,
  domino: 430,
  kayak: 520,
  'solare-blanco': 400,
  'gris-black': 460,
  'quaza-blanco-satinado': 490,
  turin: 440,
  'tanque-verso': 380,
  'tanque-capri': 350,
  'tanque-cadiz': 340,
  'tanque-alto': 320,
  urinario: 600,
};

export function getDemoUnitPrice(productKey: string): number | null {
  const price = DEMO_STARTER_UNIT_PRICES_BOB[productKey.trim()];
  return price == null ? null : price;
}

/** Real mode never receives a demo fixture. */
export function demoUnitPriceForMode(productKey: string, mode: 'demo' | 'real'): number | null {
  if (mode !== 'demo') return null;
  return getDemoUnitPrice(productKey);
}
