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
const DEFAULT_TICKETS = [
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
    order: "251043635",
    errorCode: "E-1002",
    startPercent: 15,
    minutesAgo: 15,
  },
];

const TICKETS_KEY = "tlp-test-tickets";
const loadTickets = () => {
  try {
    return JSON.parse(localStorage.getItem(TICKETS_KEY)) || DEFAULT_TICKETS;
  } catch {
    return DEFAULT_TICKETS;
  }
};
const saveTickets = () => {
  try {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
  } catch {}
};
// Regula: biletele alternează 10% / 10 min, 15% / 15 min, 10, 15, ...
const withPattern = (t, i) => {
  const v = i % 2 === 0 ? 10 : 15;
  return { ...t, startPercent: v, minutesAgo: v };
};
let tickets = loadTickets().map(withPattern);

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
// Numărul de comandă crește cu 100 pe zi, pornind de la valorile din 10.10.2026
const ORDER_BASE_DAY = new Date(2026, 9, 10);
const orderOf = (t) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today - ORDER_BASE_DAY) / 86400000);
  return String(Number(t.order) + days * 100);
};
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
        <p class="ticket-valid"></p>
        <p class="ticket-type">${t.type}</p>
      </div>
    </article>`
    )
    .join("");

  dots.innerHTML = tickets
    .map((_, i) => `<span class="dot${i === 0 ? " active" : ""}"></span>`)
    .join("");
  dots
    .querySelectorAll(".dot")
    .forEach((d, i) => d.addEventListener("click", () => goTo(i)));
  renderValidity();
}

// „Valabil până la” = aceeași oră de final ca în detaliul biletului.
// Dacă biletul n-a fost încă deschis, arată ora pe care o va avea la deschidere.
function renderValidity() {
  carousel.querySelectorAll(".ticket-valid").forEach((el, i) => {
    const t = tickets[i];
    const end = starts[t.id]
      ? endOf(t)
      : new Date(Date.now() + (t.minutes - t.minutesAgo) * 60000);
    el.textContent = `Valabil până la ${fmtShort(end)}`;
  });
}
setInterval(renderValidity, 10000);

const slideWidth = () => (carousel.firstElementChild?.offsetWidth || 0) + 15; // card + gap
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

renderCarousel();

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

// ─── Loading 0.3 sec ───────────────────────────────
// Apare la deschiderea aplicației (e vizibil din HTML) și la fiecare schimbare de pagină.
function withLoader(fn) {
  const loader = document.getElementById("loader");
  loader.hidden = false;
  setTimeout(() => {
    fn();
    loader.hidden = true;
  }, 300);
}
setTimeout(() => (document.getElementById("loader").hidden = true), 300);

// ─── Detaliu bilet ─────────────────────────────────
const screen = document.getElementById("ticketScreen");
const $ = (id) => document.getElementById(id);
let openTicket = null,
  detailTimer = null,
  codeTick = 0;

// Cod control: 14 → 0 secunde, apoi 2 secunde „Încărcare cod de control”, apoi din nou de la 14
const CODE_SECONDS = 14,
  CODE_LOADING_SECONDS = 2;
function codeText() {
  const step = codeTick % (CODE_SECONDS + 1 + CODE_LOADING_SECONDS);
  return step <= CODE_SECONDS
    ? `Cod control valabil ${CODE_SECONDS - step} secunde.`
    : "Încărcare cod de control";
}

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
  $("tdOrder").textContent = orderOf(t);
  $("tdError").textContent = codeText();
  $("tdProgress").style.width = `${
    t.startPercent + ((total - left) / total) * (100 - t.startPercent)
  }%`;
}

function showTicket(i) {
  openTicket = tickets[i];
  if (!starts[openTicket.id]) {
    starts[openTicket.id] = Date.now() - openTicket.minutesAgo * 60000;
    saveStarts(starts);
    renderValidity();
  }
  withLoader(() => {
    codeTick = 0;
    renderDetail();
    screen.hidden = false;
    detailTimer = setInterval(() => {
      codeTick++;
      renderDetail();
    }, 1000);
  });
}

function hideTicket() {
  withLoader(() => {
    screen.hidden = true;
    clearInterval(detailTimer);
  });
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
  withLoader(() => {
    transactionsScreen.hidden = true;
    document
      .querySelectorAll(".nav-item")
      .forEach((b, i) => b.classList.toggle("active", i === 0));
  });
});
$("tdReset").addEventListener("click", () => {
  starts = {};
  saveStarts(starts);
  renderValidity();
});

// Adăugare / eliminare bilete; noul bilet copiază ultimul bilet (sau primul implicit dacă lista e goală)
function renderTicketCount() {
  $("ticketCount").textContent = `Bilete: ${tickets.length}`;
}
renderTicketCount();

$("ticketAdd").addEventListener("click", () => {
  const last = tickets[tickets.length - 1];
  const ticket = last
    ? { ...last, id: `t${Date.now()}`, order: String(Number(last.order) + 1) }
    : { ...DEFAULT_TICKETS[0], id: `t${Date.now()}` };
  tickets.push(withPattern(ticket, tickets.length));
  saveTickets();
  renderCarousel();
  renderTicketCount();
});
$("ticketRemove").addEventListener("click", () => {
  if (tickets.length === 0) return;
  const removed = tickets.pop();
  delete starts[removed.id];
  saveStarts(starts);
  saveTickets();
  renderCarousel();
  renderTicketCount();
});
