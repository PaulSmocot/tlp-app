if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

document.querySelectorAll(".nav-item, .nav-scan").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".nav-item")
      .forEach((b) => b.classList.remove("active"));
    if (!this.classList.contains("nav-scan")) {
      this.classList.add("active");
    }
  });
});

// ─── Portofel: bilete în carusel ───────────────────
// În detaliu, timpul pornește la prima deschidere (ora telefonului) și se salvează.
const tickets = [
  {
    id: "t1",
    logo: "img/tpl-suceava.jpg",
    operator: "Transport Public Local SA Suceava",
    validUntil: "09.10.26 18:25",
    type: "Bilet metropolitan Zona 1",
    minutes: 60,
    order: "251043632",
    errorCode: "E-1001",
    startPercent: 10,
    minutesAgo: 10,
  },
  {
    id: "t2",
    logo: "img/tpl-suceava.jpg",
    operator: "Transport Public Local SA Suceava",
    validUntil: "09.10.26 18:25",
    type: "Bilet metropolitan Zona 1",
    minutes: 60,
    order: "TEST-0002",
    errorCode: "E-1002",
    startPercent: 15,
    minutesAgo: 15,
  },
];

const STORAGE_KEY = "tlp-test-ticket-starts";
const loadStarts = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};
const saveStarts = (starts) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(starts));
  } catch {}
};
let starts = loadStarts();

const pad = (n) => String(n).padStart(2, "0");
const fmtLong = (d) =>
  `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}, ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
const fmtShort = (d) =>
  `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${String(d.getFullYear()).slice(
    2
  )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
const endOf = (t) => new Date(starts[t.id] + t.minutes * 60000);

const carousel = document.getElementById("ticketCarousel");
const dots = document.getElementById("ticketDots");

function renderCarousel() {
  carousel.innerHTML = tickets
    .map(
      (t, i) => `
    <article class="ticket" data-index="${i}">
      <div class="ticket-logo"><img src="${t.logo}" alt=""></div>
      <div class="ticket-info">
        <p class="ticket-operator">${t.operator}</p>
        <p class="ticket-valid">Valabil până la ${t.validUntil}</p>
        <p class="ticket-type">${t.type}</p>
      </div>
    </article>`
    )
    .join("");
}
renderCarousel();

dots.innerHTML = tickets
  .map((_, i) => `<span class="dot${i === 0 ? " active" : ""}"></span>`)
  .join("");

const slideWidth = () => carousel.firstElementChild.offsetWidth + 15; // card + gap
const goTo = (i) =>
  carousel.scrollTo({ left: i * slideWidth(), behavior: "smooth" });

carousel.addEventListener(
  "scroll",
  () => {
    const index = Math.round(carousel.scrollLeft / slideWidth());
    dots
      .querySelectorAll(".dot")
      .forEach((d, i) => d.classList.toggle("active", i === index));
  },
  { passive: true }
);

dots
  .querySelectorAll(".dot")
  .forEach((d, i) => d.addEventListener("click", () => goTo(i)));

// Tragere cu mouse-ul (pe telefon glisarea cu degetul merge nativ)
let dragStartX = null,
  dragStartScroll = 0,
  dragMoved = false;

carousel.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") return;
  dragStartX = e.clientX;
  dragStartScroll = carousel.scrollLeft;
  dragMoved = false;
});

carousel.addEventListener("pointermove", (e) => {
  if (dragStartX === null) return;
  // Devine tragere abia după 5px; până atunci rămâne click pe bilet
  if (!dragMoved && Math.abs(e.clientX - dragStartX) > 5) {
    dragMoved = true;
    carousel.classList.add("dragging");
    carousel.setPointerCapture(e.pointerId);
  }
  if (dragMoved)
    carousel.scrollLeft = dragStartScroll - (e.clientX - dragStartX);
});

const endDrag = (e) => {
  if (dragStartX === null) return;
  if (!dragMoved) {
    dragStartX = null;
    return;
  }
  const moved = dragStartX - e.clientX;
  const current = Math.round(dragStartScroll / slideWidth());
  const target = Math.abs(moved) > 50 ? current + Math.sign(moved) : current;
  dragStartX = null;
  carousel.classList.remove("dragging");
  goTo(Math.max(0, Math.min(tickets.length - 1, target)));
};
carousel.addEventListener("pointerup", endDrag);
carousel.addEventListener("pointercancel", endDrag);

// ─── Detaliu bilet ─────────────────────────────────
const screen = document.getElementById("ticketScreen");
const $ = (id) => document.getElementById(id);
let openTicket = null,
  detailTimer = null;

function renderDetail() {
  const t = openTicket;
  const start = new Date(starts[t.id]);
  const end = endOf(t);
  const total = end - start;
  const left = Math.max(0, end - Date.now());

  $("tdStart").textContent = fmtLong(start);
  $("tdEnd").textContent = fmtLong(end);
  $("tdBought").textContent = fmtLong(start);
  $("tdType").textContent = t.type;
  $("tdOrder").textContent = t.order;
  $("tdError").textContent = `Cod control valabil 14 secunde.`;
  $("tdProgress").style.width = `${t.startPercent + ((total - left) / total) * (100 - t.startPercent)}%`;
}

function showTicket(i) {
  openTicket = tickets[i];
  if (!starts[openTicket.id]) {
    starts[openTicket.id] = Date.now() - openTicket.minutesAgo * 60000;
    saveStarts(starts);
  }
  const loader = $('loader');
  loader.hidden = false;
  setTimeout(() => {
    renderDetail();
    screen.hidden = false;
    loader.hidden = true;
    detailTimer = setInterval(renderDetail, 1000);
  }, 300);
}

function hideTicket() {
  screen.hidden = true;
  clearInterval(detailTimer);
}

carousel.addEventListener("click", (e) => {
  const card = e.target.closest(".ticket");
  if (!card || dragMoved) return;
  showTicket(Number(card.dataset.index));
});

$("ticketBack").addEventListener("click", hideTicket);

// ─── Tranzacții ────────────────────────────────────
const transactionsScreen = $("transactionsScreen");
$("navTransactions").addEventListener("click", () => {
  transactionsScreen.hidden = false;
});
$("transactionsBack").addEventListener("click", () => {
  transactionsScreen.hidden = true;
  document.querySelectorAll(".nav-item").forEach((b, i) => b.classList.toggle("active", i === 0));
});
$("tdReset").addEventListener("click", () => {
  starts = {};
  saveStarts(starts);
});
