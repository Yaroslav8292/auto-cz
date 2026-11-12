// Тесты расчёта «Проверить свою машину». Запуск: node check.test.js
// Ключевые границы: 6 месяцев (включительно), 6 000 км, срок первой проверки 4 года,
// просроченный HU, классы EURO для эмиссионного сбора.

const { calcCar } = require("./check.js");

let failed = 0;

function run(name, input, todayStr, exp) {
  const r = calcCar({ ...input, today: new Date(todayStr + "T00:00:00") });
  const checks = [];
  if ("dph" in exp) checks.push(r.dph.hit === exp.dph);
  if ("borderline" in exp) checks.push(r.dph.borderline === exp.borderline);
  if ("amount" in exp) checks.push(r.dph.amount === exp.amount);
  if ("tp" in exp) checks.push(r.tp.need === exp.tp);
  if ("fee" in exp) checks.push(!!r.fee && r.fee.amount === exp.fee);
  if ("coc" in exp) checks.push(!!(r.coc && r.coc.need) === exp.coc);
  const ok = checks.every(Boolean);
  if (!ok) failed++;
  console.log((ok ? "OK  " : "FAIL") + "  " + name + (ok ? "" : "  → " + JSON.stringify(r).slice(0, 240)));
}

const T = "2027-06-01";

run("3 мес, 4 000 км, HU действует", { reg: "2027-03-01", km: 4000, hu: "2027-09-01", euro: "3", price: 15000 },
  T, { dph: true, tp: false, fee: 0, amount: 3150, borderline: false });
run("7 мес, 5 900 км — попадает по пробегу", { reg: "2026-10-01", km: 5900, hu: "2027-09-01", euro: "3" },
  T, { dph: true, tp: false });
run("7 мес, 6 500 км — не попадает", { reg: "2026-10-01", km: 6500, hu: "2027-09-01", euro: "3" },
  T, { dph: false, tp: false });
run("ровно 6 мес — попадает, пограничный", { reg: "2026-12-01", km: 9000 }, T, { dph: true, borderline: true });
run("6 мес + 20 дней — не попадает, пограничный", { reg: "2026-11-12", km: 9000 }, T, { dph: false, borderline: true });
run("6 мес + 2 мес — не попадает, без флага", { reg: "2026-09-01", km: 9000 }, T, { dph: false, borderline: false });
run("HU просрочен → нужен полный ТО", { reg: "2024-01-01", km: 90000, hu: "2027-01-01", euro: "2" },
  T, { tp: true, fee: 3000, dph: false });
run("нет HU, 2 года — чешский срок не истёк", { reg: "2025-06-01", km: 20000 }, T, { tp: false, dph: false });
run("нет HU, 6 лет — срок истёк", { reg: "2021-06-01", km: 150000 }, T, { tp: true });
run("EURO 0 → 10 000 Kč", { reg: "2010-01-01", km: 250000, hu: "2027-08-01", euro: "0" }, T, { fee: 10000 });
run("COC нет → решение о техпригодности", { reg: "2018-01-01", km: 120000, hu: "2027-08-01", coc: "no" }, T, { coc: true });
run("пустая дата → расчёт не готов", { reg: null, km: null }, T, {});

if (calcCar({ reg: null, km: null, today: new Date(T) }).ready !== false) {
  console.log("FAIL  пустой ввод должен давать ready=false");
  failed++;
} else {
  console.log("OK    пустой ввод → ready=false");
}

console.log(failed === 0 ? "итог: все проверки прошли" : "итог: " + failed + " провалов");
process.exit(failed ? 1 : 0);
