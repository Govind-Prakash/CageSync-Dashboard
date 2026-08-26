// Shared currency helpers. Amounts are stored server-side as integer
// minor units (cents/agorot/paise). Display uses Intl.NumberFormat so
// the locale/symbol comes for free — we never hardcode "$" or "₪".

/// Currency codes we surface in the vet's picker. Intl.NumberFormat
/// supports every ISO 4217 code, so a facility can technically pick
/// any 3-letter code via the API; this list is just the dropdown
/// convenience for the common ones.
export const COMMON_CURRENCIES = [
  { code: 'USD', label: 'US Dollar' },
  { code: 'ILS', label: 'Israeli Shekel' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'EUR', label: 'Euro' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
] as const

/// Fraction digits per currency. Intl exposes this via .resolvedOptions()
/// but reading it requires constructing the formatter — cheap enough to
/// call on demand.
export function fractionDigitsFor(currency: string): number {
  try {
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency })
    return fmt.resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2 // fallback for unknown codes
  }
}

/// Convert an integer minor-unit amount to a formatted string.
/// formatMoney(500, 'USD')  → "$5.00"
/// formatMoney(500, 'ILS')  → "₪5.00"
/// formatMoney(500, 'JPY')  → "¥500"   (JPY has 0 fraction digits)
export function formatMoney(amountMinor: number, currency: string): string {
  const digits = fractionDigitsFor(currency)
  const divisor = Math.pow(10, digits)
  const major = amountMinor / divisor
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(major)
}

/// Same as formatMoney but strips fractional part — used on Flutter
/// and anywhere space is tight. formatMoneyInteger(523, 'USD') → "$5"
export function formatMoneyInteger(amountMinor: number, currency: string): string {
  const digits = fractionDigitsFor(currency)
  const divisor = Math.pow(10, digits)
  const major = Math.floor(amountMinor / divisor)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(major)
}

/// Parse a decimal-string user input into integer minor units.
/// parseAmountInput('5.25', 'USD') → 525
/// parseAmountInput('5',    'JPY') → 5
/// Returns null on invalid input.
export function parseAmountInput(input: string, currency: string): number | null {
  const trimmed = input.trim().replace(/,/g, '')
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const digits = fractionDigitsFor(currency)
  const major = parseFloat(trimmed)
  if (Number.isNaN(major) || major < 0) return null
  // Multiply then round to avoid float artifacts (5.25 × 100 = 524.9999...)
  return Math.round(major * Math.pow(10, digits))
}
