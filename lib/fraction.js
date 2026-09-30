// Tiny exact-fraction helper. Values stay as integer numerator/denominator pairs
// so answer checking never depends on floating point.

export function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function frac(num, den = 1) {
  if (den === 0) throw new Error("zero denominator");
  if (den < 0) { num = -num; den = -den; }
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

// "17.5" -> 35/2, "0.25" -> 1/4, "12" -> 12/1
export function fromDecimalString(s) {
  const m = /^(\d*)(?:\.(\d+))?$/.exec(s);
  if (!m || (m[1] === "" && !m[2])) return null;
  const whole = m[1] || "0";
  const dec = m[2] || "";
  const den = 10 ** dec.length;
  return frac(parseInt(whole + dec, 10), den);
}

// Bank values are a number, {num, den}, or [a, b] (a ratio or fraction pair).
export function fromBank(v) {
  if (typeof v === "number") return Number.isInteger(v) ? frac(v, 1) : fromDecimalString(String(v));
  if (Array.isArray(v)) return frac(v[0], v[1]);
  return frac(v.num, v.den);
}

export const eq = (a, b) => a.num * b.den === b.num * a.den;
export const mul = (a, b) => frac(a.num * b.num, a.den * b.den);
export const div = (a, b) => frac(a.num * b.den, a.den * b.num);
export const toNumber = (a) => a.num / a.den;
