// Проверка машины: только те выводы, которые однозначно следуют из закона.
// § 19 zákona 235/2004 Sb. (DPH), § 5a zákona 56/2001 Sb. (техосмотр), сборы по md.gov.cz.

function monthsBetween(a, b) {
  var m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return m;
}

function addYears(d, n) {
  var r = new Date(d.getTime());
  r.setFullYear(r.getFullYear() + n);
  return r;
}

function addMonths(d, n) {
  var r = new Date(d.getTime());
  r.setMonth(r.getMonth() + n);
  return r;
}

function addDays(d, n) {
  var r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
}

var EMISSION = { "0": 10000, "1": 5000, "2": 3000, "3": 0 };

// input: { reg:'YYYY-MM-DD', km:number|null, hu:'YYYY-MM-DD'|null, coc:'yes'|'no'|null,
//          euro:'0'..'3'|null, price:number|null, today:Date }
function calcCar(input) {
  var out = { ready: false, dph: null, tp: null, fee: null };
  var today = input.today || new Date();
  var reg = input.reg ? new Date(input.reg + "T00:00:00") : null;
  if (!reg || isNaN(reg.getTime())) return out;
  out.ready = true;

  var months = monthsBetween(reg, today);
  out.months = months;
  var km = (input.km === 0 || input.km) ? Number(input.km) : null;
  out.km = km;

  // --- DPH: «новое транспортное средство» = до 6 месяцев ИЛИ не более 6 000 км
  // Граница считается по дате: 6 месяцев от первого ввода в эксплуатацию включительно.
  var sixMonths = addMonths(reg, 6);
  var byDate = today.getTime() <= sixMonths.getTime();
  var nearDate = !byDate && today.getTime() <= addDays(sixMonths, 31).getTime();
  var byKm = km !== null && km <= 6000;
  var nearKm = km !== null && km > 5600 && km <= 6300;
  var nmt = byDate || byKm;
  var reason = byKm
    ? "пробег " + km.toLocaleString("ru-RU") + " км — не больше 6 000"
    : "с первой регистрации прошло " + months + " мес. — это в пределах 6 месяцев";
  out.dph = {
    hit: nmt,
    borderline: nmt ? (byDate && months >= 6) || nearKm : nearDate || nearKm,
    reason: reason,
    why: "с первой регистрации " + months + " мес. и пробег больше 6 000 км",
    amount: input.price ? Math.round(Number(input.price) * 0.21) : null
  };

  // --- § 5a: нужен ли полный техосмотр до регистрации
  var huDate = input.hu ? new Date(input.hu + "T00:00:00") : null;
  var huOk = huDate && !isNaN(huDate.getTime()) && huDate.getTime() >= today.getTime();
  var czFirstDue = addYears(reg, 4);
  var yearsOld = months / 12;
  if (huOk) {
    out.tp = { need: false, level: "good",
      text: "иностранный ТО действует — отдельная чешская проверка не нужна",
      note: "документ о ТО возьми с собой: на нём держится вывод (§ 5a)" };
  } else if (huDate && !isNaN(huDate.getTime())) {
    out.tp = { need: true, level: "bad",
      text: "иностранный ТО просрочен — без полного чешского ТО машину не зарегистрируют",
      note: "§ 5a odst. 1 písm. b); по прайсам это 1 900–1 950 Kč и день" };
  } else if (today.getTime() < czFirstDue.getTime()) {
    out.tp = { need: false, level: "good",
      text: "документа о ТО нет, но чешский срок первой проверки (4 года) ещё не истёк",
      note: "машине " + Math.floor(yearsOld) + " г.; отдельный повод для проверки начнётся после " + czFirstDue.toISOString().slice(0,10) };
  } else {
    out.tp = { need: true, level: "bad",
      text: "документа о ТО нет, а срок проверки по чешским правилам прошёл",
      note: "§ 5a odst. 1 písm. b) — придётся пройти полный техосмотр" };
  }
  out.tp.czFirstDue = czFirstDue.toISOString().slice(0, 10);

  // --- эмиссионный сбор при первой регистрации M1/N1 ниже EURO 3
  if (input.euro !== null && input.euro !== "" && input.euro !== undefined) {
    var fee = EMISSION[String(input.euro)];
    out.fee = { amount: fee, euro: String(input.euro) };
  }

  // --- COC: влияет не на сумму, а на процедуру
  out.coc = input.coc === "no"
    ? { need: true, text: "нужна отдельная процедура — решение о техпригодности", note: "нет COC → § 34–35: протокол испытательной станции и решение на уряде" }
    : input.coc === "yes"
      ? { need: false, text: "отдельная процедура не нужна", note: "COC есть — § 34 odst. 2 выводит такую машину из процедуры" }
      : null;

  return out;
}

if (typeof module !== "undefined" && module.exports) module.exports = { calcCar: calcCar };

if (typeof document !== "undefined") {
  var $ = function (id) { return document.getElementById(id); };
  var out = $("c-out");

  function val(id) { var el = $(id); return el && el.value !== "" ? el.value : null; }

  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function row(level, title, text, note) {
    return '<div class="row ' + level + '"><div><b>' + esc(title) + "</b> " + esc(text) +
      (note ? '<small>' + esc(note) + "</small>" : "") + "</div></div>";
  }

  function render() {
    var r = calcCar({
      reg: val("c-reg"),
      km: val("c-km"),
      hu: val("c-hu"),
      coc: val("c-coc"),
      euro: val("c-euro"),
      price: val("c-price")
    });
    if (!r.ready) {
      out.innerHTML = '<p class="calc-hint">Заполни дату первой регистрации — покажу, что из этого следует. Пробег и HU уточняют вывод.</p>';
      return;
    }
    var html = "";
    if (r.dph.hit) {
      var amount = r.dph.amount
        ? " Это ≈ " + r.dph.amount.toLocaleString("ru-RU") + " € к цене (21 %)."
        : "";
      html += row(r.dph.borderline ? "mid" : "bad",
        "DPH: попадает.",
        "Для DPH это новое транспортное средство — " + r.dph.reason + "." + amount,
        r.dph.borderline ? "Случай на границе: пересчитай точно по дате поставки, а не по сегодняшней (§3)." : "Декларация в 10 дней с даты передачи, аванс — по § 19c odst. 4.");
    } else {
      html += row("good", "DPH: не попадает.", "По дате и пробегу — " + r.dph.why + ".",
        "Но проверь дату поставки: считается состояние на день передачи, а не на сегодня (§19).");
    }
    html += row(r.tp.level, "Техосмотр: " + (r.tp.need ? "нужен" : "не нужен") + ".", r.tp.text + ".", r.tp.note);
    if (r.fee) {
      html += row(r.fee.amount > 0 ? "bad" : "good",
        "Эмиссионный сбор: " + r.fee.amount.toLocaleString("ru-RU") + " Kč.",
        r.fee.amount > 0 ? "EURO " + r.fee.euro + " — сбор платится при первой регистрации в ЧР." : "EURO 3 и выше — сбора нет.",
        "Только для легковых и фургонов (M1/N1); скидка −20 % на него не действует.");
    }
    if (r.coc) {
      html += row(r.coc.need ? "mid" : "good", "COC: " + (r.coc.need ? "нет" : "есть") + ".", r.coc.text + ".", r.coc.note);
    }
    html += '<p class="calc-cta">Что с этим делать по шагам — в гайде: <a href="#f">скачать PDF (бесплатно)</a>. Нужна проверка истории по VIN под эту машину — напиши на <a href="mailto:autoreg.cz@gmail.com">autoreg.cz@gmail.com</a>.</p>';
    out.innerHTML = html;
  }

  ["c-reg", "c-km", "c-hu", "c-coc", "c-euro", "c-price"].forEach(function (id) {
    var el = $(id);
    if (el) { el.addEventListener("input", render); el.addEventListener("change", render); }
  });
  render();
}
