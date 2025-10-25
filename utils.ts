export const GALLEON_IN_SICKLES = 17;
export const SICKLE_IN_KNUTS = 29;
export const GALLEON_IN_KNUTS = GALLEON_IN_SICKLES * SICKLE_IN_KNUTS; // 493

export interface Currency {
  galleons: number;
  sickles: number;
  knuts: number;
}

/**
 * Converts a total number of Knuts into Galleons, Sickles, and Knuts.
 * @param totalKnuts The total amount in Knuts.
 * @returns An object with the amount of galleons, sickles, and knuts.
 */
export const knutsToCurrency = (totalKnuts: number): Currency => {
  if (isNaN(totalKnuts) || totalKnuts < 0) {
    return { galleons: 0, sickles: 0, knuts: 0 };
  }
  
  const galleons = Math.floor(totalKnuts / GALLEON_IN_KNUTS);
  let remainder = totalKnuts % GALLEON_IN_KNUTS;
  
  const sickles = Math.floor(remainder / SICKLE_IN_KNUTS);
  remainder = remainder % SICKLE_IN_KNUTS;
  
  const knuts = remainder;
  
  return { galleons, sickles, knuts };
};

/**
 * Converts a Currency object (Galleons, Sickles, Knuts) into a total number of Knuts.
 * @param currency An object containing galleons, sickles, and knuts.
 * @returns The total value in Knuts.
 */
export const currencyToKnuts = ({ galleons, sickles, knuts }: Currency): number => {
  const g = galleons || 0;
  const s = sickles || 0;
  const k = knuts || 0;
  return (g * GALLEON_IN_KNUTS) + (s * SICKLE_IN_KNUTS) + k;
};

/**
 * Formats a total number of Knuts into a human-readable string.
 * @param totalKnuts The total amount in Knuts.
 * @returns A formatted string like "10 G, 5 S, 20 K".
 */
export const formatCurrency = (totalKnuts: number): string => {
  const { galleons, sickles, knuts } = knutsToCurrency(totalKnuts);
  const parts = [];
  if (galleons > 0) parts.push(`${galleons} G`);
  if (sickles > 0) parts.push(`${sickles} S`);
  if (knuts > 0) parts.push(`${knuts} K`);
  
  if (parts.length === 0) return "0 K";
  
  return parts.join(', ');
};
