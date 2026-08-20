export type CommerceTax = {
  id: string;
  name: string;
  type: "INCLUDED" | "ADDED";
  rate: number;
};

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function addedTaxRate(taxes: CommerceTax[] = []) {
  return taxes
    .filter((tax) => tax.type === "ADDED")
    .reduce((sum, tax) => sum + tax.rate, 0);
}

export function calculateAddedTax(amount: number, taxes: CommerceTax[] = []) {
  const includedRate = taxes
    .filter((tax) => tax.type === "INCLUDED")
    .reduce((sum, tax) => sum + tax.rate, 0);
  const taxableBase = includedRate > 0 ? amount / (1 + includedRate / 100) : amount;
  return taxes
    .filter((tax) => tax.type === "ADDED")
    .reduce((sum, tax) => sum + roundMoney(taxableBase * tax.rate / 100), 0);
}

export function grossFromNet(amount: number, addedRate: number) {
  return roundMoney(amount + amount * Math.max(0, addedRate) / 100);
}

export function netFromGross(amount: number, addedRate: number) {
  if (addedRate <= 0) return roundMoney(amount);
  return roundMoney(amount / (1 + addedRate / 100));
}

export function parseCommerceTaxes(value: string | null | undefined): CommerceTax[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((tax): tax is CommerceTax => Boolean(
      tax
      && typeof tax.id === "string"
      && typeof tax.name === "string"
      && (tax.type === "INCLUDED" || tax.type === "ADDED")
      && typeof tax.rate === "number"
      && Number.isFinite(tax.rate),
    ));
  } catch {
    return [];
  }
}
