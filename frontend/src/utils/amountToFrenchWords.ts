const UNITS = [
  '',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];

const TENS = [
  '',
  'dix',
  'vingt',
  'trente',
  'quarante',
  'cinquante',
  'soixante',
];

function belowHundred(n: number): string {
  if (n < 20) return UNITS[n];
  const tens = Math.floor(n / 10);
  const rest = n % 10;
  if (tens === 7) {
    return rest === 1 ? 'soixante et onze' : `soixante-${UNITS[10 + rest]}`;
  }
  if (tens === 8) {
    return rest === 0 ? 'quatre-vingts' : `quatre-vingt-${UNITS[rest]}`;
  }
  if (tens === 9) {
    return `quatre-vingt-${UNITS[10 + rest]}`;
  }
  const label = TENS[tens];
  if (rest === 0) return label;
  if (rest === 1) return `${label}-un`;
  return `${label}-${UNITS[rest]}`;
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const base = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent`;
  const label = hundreds === 1 || rest !== 0 ? base : `${base}s`;
  return rest === 0 ? label : `${label} ${belowHundred(rest)}`;
}

export function numberToFrenchWords(n: number): string {
  const value = Math.floor(Math.abs(n));
  if (value === 0) return 'zéro';

  const parts: string[] = [];
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1000);
  const rest = value % 1000;

  if (millions > 0) {
    parts.push(
      millions === 1
        ? 'un million'
        : `${belowThousand(millions)} millions`,
    );
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? 'mille' : `${belowThousand(thousands)} mille`);
  }
  if (rest > 0) {
    parts.push(belowThousand(rest));
  }

  const sentence = parts.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function amountToFrenchWords(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const dinars = Math.floor(rounded);
  const centimes = Math.round((rounded - dinars) * 100);

  if (centimes > 0) {
    return `${numberToFrenchWords(dinars)} DA et ${numberToFrenchWords(
      centimes,
    )} Centimes`;
  }
  return `${numberToFrenchWords(dinars)} DA`;
}