export const BREAKERS = [
  { id: "lt100", label: "من 20 إلى أقل من 100 أمبير", current: 10, next: 70 },
  { id: "lt200", label: "من 100 إلى أقل من 200 أمبير", current: 15, next: 80 },
  { id: "lt300", label: "من 200 إلى أقل من 300 أمبير", current: 21, next: 90 },
  { id: "lt400", label: "من 300 إلى أقل من 400 أمبير", current: 22, next: 100 },
  { id: "eq400", label: "400 أمبير", current: 25, next: 100 },
  { id: "gt400", label: "أكثر من 400 أمبير", current: 30, next: 100 },
];

export const METERS = [
  { id: "d20", label: "حتى 20 ملم", current: 5, water: 20, sewage: 10 },
  { id: "d40", label: "من 21 إلى 40 ملم", current: 10, water: 40, sewage: 20 },
  { id: "d65", label: "من 41 إلى 65 ملم", current: 15, water: 60, sewage: 30 },
  { id: "d100", label: "من 66 إلى 100 ملم", current: 15, water: 80, sewage: 40 },
  { id: "over", label: "أكثر من 100 ملم", current: 15, water: 100, sewage: 50 },
];

const CURRENT_WATER = [
  { width: 15, water: 0.1, sewage: 0.05 },
  { width: 15, water: 1, sewage: 0.5 },
  { width: 15, water: 3, sewage: 1.5 },
  { width: 15, water: 4, sewage: 2 },
  { width: Infinity, water: 6, sewage: 3 },
];

const NEXT_WATER = [
  { width: 15, water: 1, sewage: 0.5 },
  { width: 15, water: 2, sewage: 1 },
  { width: 15, water: 4, sewage: 2 },
  { width: Infinity, water: 6, sewage: 3 },
];

export function money(n) {
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100;
}

function quotePower(kwh, which, breakerId, days, vat) {
  const band = BREAKERS.find((item) => item.id === breakerId) ?? BREAKERS[0];
  const limit = (6000 / 30) * days;
  const used = Math.max(0, kwh);
  const first = Math.min(used, Math.max(0, limit));
  const second = Math.max(0, used - first);
  const rates = which === "current" ? [0.18, 0.3] : [0.21, 0.33];
  const energy = money(first * rates[0]) + money(second * rates[1]);
  const fixed = money((which === "current" ? band.current : band.next) * (days / 30));
  const subtotal = money(energy + fixed);
  const tax = vat ? money(subtotal * 0.15) : 0;
  return { total: money(subtotal + tax), subtotal, tax, fixed, energy, first, second };
}

export function powerBill(kwh, breakerId, days, vat) {
  return {
    current: quotePower(kwh, "current", breakerId, days, vat),
    next: quotePower(kwh, "next", breakerId, days, vat),
  };
}

function quoteWater(m3, which, meterId, days, vat, sewageOn, extraUnits) {
  const meter = METERS.find((item) => item.id === meterId) ?? METERS[0];
  const slabs = which === "current" ? CURRENT_WATER : NEXT_WATER;
  let left = Math.max(0, m3);
  let water = 0;
  let sewage = 0;
  const lines = [];
  slabs.forEach((slab, index) => {
    const last = index === slabs.length - 1;
    const width = last ? left : slab.width * (days / 30);
    const used = last ? left : Math.min(left, width);
    if (used <= 0 && index > 0) return;
    const waterAmount = money(used * slab.water);
    const sewageAmount = sewageOn ? money(used * slab.sewage) : 0;
    water = money(water + waterAmount);
    sewage = money(sewage + sewageAmount);
    left = Math.max(0, left - used);
    lines.push({ used, water: waterAmount, sewage: sewageAmount });
  });
  const meterWater = money((which === "current" ? meter.current : meter.water) * (days / 30));
  const meterSewage = which === "next" && sewageOn ? money(meter.sewage * (days / 30)) : 0;
  const extras = which === "next" ? Math.max(0, extraUnits) : 0;
  const extraWater = money(extras * 20 * (days / 30));
  const extraSewage = sewageOn ? money(extras * 10 * (days / 30)) : 0;
  const fixed = money(meterWater + meterSewage + extraWater + extraSewage);
  const subtotal = money(water + sewage + fixed);
  const tax = vat ? money(subtotal * 0.15) : 0;
  return { total: money(subtotal + tax), subtotal, tax, fixed, water, sewage, lines };
}

export function waterBill(m3, meterId, days, vat, sewageOn, extraUnits) {
  return {
    current: quoteWater(m3, "current", meterId, days, vat, sewageOn, extraUnits),
    next: quoteWater(m3, "next", meterId, days, vat, sewageOn, extraUnits),
  };
}
