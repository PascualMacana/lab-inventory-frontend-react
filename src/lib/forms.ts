export function parseFormNumber(value: FormDataEntryValue | null, fallback = 0) {
  const raw = String(value ?? "").trim().replace(",", ".")
  if (!raw) {
    return fallback
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function requireFiniteNumber(value: number, message: string) {
  if (!Number.isFinite(value)) {
    throw new Error(message)
  }
  return value
}
