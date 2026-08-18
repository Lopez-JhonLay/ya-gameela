export interface MoneyDTO {
  amountMinor: string;
  currency: string;
}

export interface LocalizedMoneyDTO extends MoneyDTO {
  formatted: string;
  estimated: boolean;
  rateAsOf: string | null;
  usedFallback: boolean;
}
