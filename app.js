import { BREAKERS, METERS, powerBill, waterBill, money } from "./lib.js";

const panel = document.querySelector("#panel");
const result = document.querySelector("#result");
const note = document.querySelector("#note");
const themeButton = document.querySelector("#theme");
let service = "power";

const state = {
  kwh: "1000",
  breaker: "lt100",
  days: "30",
  vat: true,
  m3: "30",
  meter: "d20",
  extra: "0",
  sewage: true,
};

function sar(n) {
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(money(n));
}

function num(raw) {
  const value = Number(String(raw).replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

function paint() {
  document.querySelector("#tab-power").setAttribute("aria-pressed", String(service === "power"));
  document.querySelector("#tab-water").setAttribute("aria-pressed", String(service === "water"));
  if (service === "power") paintPower();
  else paintWater();
}

function field(label, hint, control) {
  return `<label>${label}${control}<span class="hint">${hint}</span></label>`;
}

function paintPower() {
  note.textContent = "مرجع الكهرباء: الشركة السعودية للطاقة. الرسم الثابت حسب سعة القاطع، والشرائح 6,000 ك.و.س لكل 30 يوماً.";
  panel.innerHTML = `<form class="card grid" id="form">
    ${field("الاستهلاك", "كيلوواط ساعة في فترة الفوترة", `<input name="kwh" inputmode="decimal" value="${state.kwh}">`)}
    ${field("سعة القاطع", "من فاتورة الكهرباء أو القاطع الرئيسي", `<select name="breaker">${BREAKERS.map((item) => `<option value="${item.id}" ${item.id === state.breaker ? "selected" : ""}>${item.label}</option>`).join("")}</select>`)}
    <div class="grid two">
      ${field("أيام الفوترة", "الافتراضي 30", `<input name="days" inputmode="decimal" value="${state.days}">`)}
      <label class="check">ضريبة 15٪<input name="vat" type="checkbox" ${state.vat ? "checked" : ""}></label>
    </div>
    <div class="actions"><button class="ghost" type="button" id="example">مثال رسمي: 1,000 ك.و.س</button></div>
  </form>`;
  bind(() => {
    const kwh = num(state.kwh);
    const days = num(state.days);
    if (kwh === null || kwh < 0 || days === null || days < 1 || days > 366) {
      result.innerHTML = `<section class="card">أدخل استهلاكاً وأياماً صحيحة.</section>`;
      return;
    }
    const bill = powerBill(kwh, state.breaker, days, state.vat);
    show(bill, "ك.و.س", kwh);
  });
  document.querySelector("#example").onclick = () => {
    state.kwh = "1000";
    state.breaker = "lt100";
    state.days = "30";
    state.vat = true;
    paint();
  };
}

function paintWater() {
  note.textContent =
    "مرجع المياه: إعلان شركة المياه الوطنية في 25 أكتوبر 2026. الصور التي تبدأ الشريحة الجديدة من 0.15 ريال لا تطابق الإعلان.";
  panel.innerHTML = `<form class="card grid" id="form">
    <section class="callout"><strong>لا تعتمد الصورة المتداولة.</strong><p class="muted">الشريحة الجديدة الأولى ريال للمتر لا 0.15، ورسم العداد حتى 20 ملم هو 30 ريالاً للمياه والصرف معاً.</p></section>
    ${field("الاستهلاك", "متر مكعب في فترة الفوترة", `<input name="m3" inputmode="decimal" value="${state.m3}">`)}
    ${field("قطر العداد", "من الفاتورة أو جسم العداد", `<select name="meter">${METERS.map((item) => `<option value="${item.id}" ${item.id === state.meter ? "selected" : ""}>${item.label}</option>`).join("")}</select>`)}
    <div class="grid two">
      ${field("أيام الفوترة", "حدود الشرائح تتناسب مع الأيام", `<input name="days" inputmode="decimal" value="${state.days}">`)}
      ${field("وحدات إضافية", "20 ريالاً مياه و10 صرف لكل وحدة في التعرفة الجديدة", `<input name="extra" inputmode="numeric" value="${state.extra}">`)}
    </div>
    <label class="check">مربوط بالصرف الصحي<input name="sewage" type="checkbox" ${state.sewage ? "checked" : ""}></label>
    <label class="check">ضريبة 15٪<input name="vat" type="checkbox" ${state.vat ? "checked" : ""}></label>
    <div class="actions"><button class="ghost" type="button" id="example">مثال الإعلان: 30 م³ قبل الضريبة</button></div>
  </form>`;
  bind(() => {
    const m3 = num(state.m3);
    const days = num(state.days);
    const extra = num(state.extra || "0");
    if (m3 === null || m3 < 0 || days === null || days < 1 || days > 366 || extra === null || extra < 0) {
      result.innerHTML = `<section class="card">أدخل أمتاراً وأياماً صحيحة.</section>`;
      return;
    }
    const bill = waterBill(m3, state.meter, days, state.vat, state.sewage, extra);
    show(bill, "م³", m3);
  });
  document.querySelector("#example").onclick = () => {
    state.m3 = "30";
    state.meter = "d20";
    state.days = "30";
    state.extra = "0";
    state.sewage = true;
    state.vat = false;
    paint();
  };
}

function bind(draw) {
  const form = document.querySelector("#form");
  form.addEventListener("input", () => {
    const data = new FormData(form);
    for (const key of ["kwh", "breaker", "days", "m3", "meter", "extra"]) {
      if (data.has(key)) state[key] = String(data.get(key));
    }
    if (form.querySelector("[name=vat]")) state.vat = data.has("vat");
    if (form.querySelector("[name=sewage]")) state.sewage = data.has("sewage");
    draw();
  });
  draw();
}

function show(bill, unit, amount) {
  const delta = money(bill.next.total - bill.current.total);
  const pct = bill.current.total === 0 ? "—" : `${delta > 0 ? "+" : ""}${((delta / Math.abs(bill.current.total)) * 100).toFixed(1)}%`;
  result.innerHTML = `
    <section class="card">
      <p class="muted">${delta > 0 ? "الزيادة على فاتورتك" : "الفرق"}</p>
      <p class="big">${delta > 0 ? "+" : ""}${sar(delta)} <span style="font-size:1rem">ر.س</span></p>
      <p class="nums">${pct} · استهلاك ${amount} ${unit}</p>
    </section>
    <div class="totals">
      <div><p class="blue">الحالية</p><p class="big nums">${sar(bill.current.total)}</p><p class="muted">قبل الضريبة ${sar(bill.current.subtotal)} · رسم ${sar(bill.current.fixed)}</p></div>
      <div><p class="green">الجديدة</p><p class="big nums">${sar(bill.next.total)}</p><p class="muted">قبل الضريبة ${sar(bill.next.subtotal)} · رسم ${sar(bill.next.fixed)}</p></div>
    </div>`;
}

document.querySelector("#tab-power").onclick = () => {
  service = "power";
  paint();
};
document.querySelector("#tab-water").onclick = () => {
  service = "water";
  paint();
};
themeButton.onclick = () => {
  const dark = document.documentElement.classList.toggle("dark");
  themeButton.textContent = dark ? "وضع نهاري" : "وضع ليلي";
  localStorage.setItem("fatura-theme", dark ? "dark" : "light");
};
if (localStorage.getItem("fatura-theme") === "dark") {
  document.documentElement.classList.add("dark");
  themeButton.textContent = "وضع نهاري";
}
paint();
