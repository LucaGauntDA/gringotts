export const GALLEON_IN_SICKLES = 17;
export const SICKLE_IN_KNUTS = 29;
export const GALLEON_IN_KNUTS = GALLEON_IN_SICKLES * SICKLE_IN_KNUTS; // 493

export interface Currency {
  galleons: number;
  sickles: number;
  knuts: number;
}

/**
 * Converts a total number of Knuts into a canonical representation of
 * Galleons, Sickles, and Knuts. This can also convert a non-canonical
 * currency object by first converting it to total knuts.
 * @param totalKnutsOrCurrency The total amount in Knuts or a non-canonical Currency object.
 * @returns An object with the amount of galleons, sickles, and knuts.
 */
export function knutsToCanonical(totalKnutsOrCurrency: number | Currency): Currency {
  let totalKnuts: number;

  if (typeof totalKnutsOrCurrency === 'number') {
    totalKnuts = totalKnutsOrCurrency;
  } else {
    totalKnuts = currencyToKnuts(totalKnutsOrCurrency);
  }
  
  if (isNaN(totalKnuts)) {
    return { galleons: 0, sickles: 0, knuts: 0 };
  }
  
  let remainingKnuts = totalKnuts;

  const galleons = Math.floor(remainingKnuts / GALLEON_IN_KNUTS);
  remainingKnuts %= GALLEON_IN_KNUTS;

  const sickles = Math.floor(remainingKnuts / SICKLE_IN_KNUTS);
  remainingKnuts %= SICKLE_IN_KNUTS;

  return {
    galleons,
    sickles,
    knuts: remainingKnuts,
  };
}


/**
 * Converts a Currency object (Galleons, Sickles, Knuts) into a single
 * total value in Knuts.
 * @param currency An object with galleons, sickles, and knuts properties.
 * @returns The total value in Knuts.
 */
export function currencyToKnuts(currency: Partial<Currency>): number {
  const { galleons = 0, sickles = 0, knuts = 0 } = currency;
  return (galleons * GALLEON_IN_KNUTS) + (sickles * SICKLE_IN_KNUTS) + knuts;
}