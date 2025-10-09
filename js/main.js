import { translations, initLanguage } from "./translations.js";

// Smooth scroll for in-page links
function enableSmoothScroll(){
  document.querySelectorAll("a.nav-scroll[href^='#']").forEach(a=>{
    a.addEventListener("click", e=>{
      const target = document.querySelector(a.getAttribute("href"));
      if (target){
        e.preventDefault();
        target.scrollIntoView({behavior:"smooth", block:"start"});
      }
    });
  });
}

// Load HTML component into container
async function loadComponent(id, path){
  try{
    const res = await fetch(path, {cache:"no-store"});
    const html = await res.text();
    const mount = document.getElementById(id);
    if (mount) mount.innerHTML = html;
  }catch(err){ console.error("Component load failed:", path, err); }
}

// Create safe element helper
function el(tag, attrs={}, children=[]){
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k === "text") node.textContent = String(v);
    else if (k === "html") node.innerHTML = v; // Only for trusted literals in this file
    else node.setAttribute(k, v);
  });
  children.forEach(c=> node.appendChild(c));
  return node;
}

// Data caches
function getQueryParam(k){
  const u = new URL(window.location.href);
  return u.searchParams.get(k);
}

let roomsData = [];
let galleryData = [];
let reviewsData = [];

const COUNTRY_FLAGS = { RU:"🇷🇺", KZ:"🇰🇿", US:"🇺🇸", AZ:"🇦🇿", TR:"🇹🇷", DE:"🇩🇪", GB:"🇬🇧", FR:"🇫🇷", IT:"🇮🇹" };

function getInitials(name=""){
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "★";
  const [first, second] = parts;
  return ((first?.[0] || "") + (second?.[0] || "")).toUpperCase() || (first?.slice(0,2).toUpperCase() || "★");
}

// Load JSON with basic error handling
async function loadJSON(url){
  const res = await fetch(url, {cache:"no-store"});
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

// Rooms
async function loadRooms(containerId, selectId, lang="ru"){
  try{
    if (!roomsData.length) roomsData = await loadJSON("data/rooms.json");
  }catch(e){ console.error("rooms.json error", e); return; }

  // expose for other modules that expect window.roomsData
  window.roomsData = roomsData;

  const container = containerId ? document.getElementById(containerId) : null;
  const select = selectId ? document.getElementById(selectId) : null;

  if (container) container.innerHTML = "";
  if (select){
    select.innerHTML = "";
    const placeholder = el("option",{
      value:"",
      text:translations.selectRoom[lang] || translations.selectRoom.ru || "Select Room"
    });
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
  }

  roomsData.forEach((room, idx)=>{
    const title = (room.title && room.title[lang]) ? room.title[lang] : (room.title?.ru || "Номер");
    const desc  = (room.description && room.description[lang]) ? room.description[lang] : (room.description?.ru || "");

    if (container){
      const detailText = translations.moreDetails?.[lang] || translations.moreDetails?.ru || "Подробнее";
      const bookText = translations.bookNow?.[lang] || translations.bookNow?.ru || "Забронировать";
      const priceText = room.price ? `от ${room.price} ₼/ночь` : "";

      const bodyChildren = [
        el("h5", {class:"card-title", text:title}),
        el("p", {class:"card-text text-secondary", text:desc})
      ];
      if (priceText){
        bodyChildren.push(el("div", {class:"fw-semibold mt-2", text:priceText}));
      }
      bodyChildren.push(
        el("div", {class:"d-flex flex-column gap-2 mt-auto"}, [
          el("button", {type:"button", class:"btn btn-outline-gold ripple js-room-detail", text:detailText}),
          el("button", {type:"button", class:"btn btn-gold ripple js-book-room", text:bookText})
        ])
      );

      const card = el("div", {
        class:"col-md-4",
        "data-room-index":String(idx),
        "data-room-id":String(room.id),
        "data-aos":"fade-up",
        "data-aos-delay":String(idx*100)
      }, [
        el("div", {class:"card h-100"}, [
          el("img", {src:room.image, alt:title, class:"card-img-top"}),
          el("div", {class:"card-body d-flex flex-column"}, bodyChildren)
        ])
      ]);

      container.appendChild(card);
    }

    if (select){
      select.appendChild(el("option",{value:String(room.id), text:title}));
    }
  });

  if (container){
    const detail = { containerId, selectId, lang };
    const fire = ()=> document.dispatchEvent(new CustomEvent("rooms:rendered", {detail}));
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(fire);
    else setTimeout(fire, 0);
  }

  if (window.AOS) AOS.refresh();
}

// Gallery
async function loadGallery(containerId){
  try{
    if (!galleryData.length) galleryData = await loadJSON("data/gallery.json");
  }catch(e){ console.error("gallery.json error", e); return; }

  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!Array.isArray(galleryData) || galleryData.length === 0){
    galleryData = [
      {src:"images/gallery1.jpg", alt:"Hotel photo 1"},
      {src:"images/gallery2.jpg", alt:"Hotel photo 2"},
      {src:"images/gallery3.jpg", alt:"Hotel photo 3"},
      {src:"images/gallery4.jpg", alt:"Hotel photo 4"},
      {src:"images/gallery5.jpg", alt:"Hotel photo 5"},
      {src:"images/gallery6.jpg", alt:"Hotel photo 6"}
    ];
  }

  galleryData
    .map((img, idx)=> typeof img === "string" ? {src:img, alt:`Hotel photo ${idx+1}`} : img)
    .forEach((img, idx)=>{
      const col = el("div", {class:"col-12 col-md-4", "data-aos":"zoom-in", "data-aos-delay":String(idx*80)}, [
        el("img", {src:img.src, alt:img.alt || "Gallery image", class:"img-fluid rounded-4 shadow-sm"})
      ]);
      container.appendChild(col);
    });

  if (window.AOS) AOS.refresh();
}

// Reviews
async function loadReviews(containerId, lang="ru"){
  try{
    if (!reviewsData.length) reviewsData = await loadJSON("data/reviews.json");
  }catch(e){ console.error("reviews.json error", e); return; }

  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  reviewsData.forEach((rv, idx)=>{
    const text = (rv.text && rv.text[lang]) ? rv.text[lang] : (rv.text?.ru || "");
    const name = rv.author || rv.name || "Гость";
    const ratingRaw = typeof rv.rating === "number" ? Math.round(rv.rating) : 0;
    const rating = Math.min(5, Math.max(0, ratingRaw));
    const country = (rv.country || rv.countryCode || "").toString().toUpperCase();
    const flag = country ? `${COUNTRY_FLAGS[country] || "🌍"} ${country}` : "";

    const header = el("div", {class:"review-head"}, [
      el("div", {class:"avatar", text:getInitials(name)}),
      el("div", {class:"d-flex flex-column"}, [
        el("strong", {text:name}),
        flag ? el("div", {class:"text-secondary small", text:flag}) : null
      ].filter(Boolean))
    ]);

    const body = [header];
    if (rating){
      body.push(el("div", {class:"stars mb-2", text:"★".repeat(rating)}));
    }
    body.push(el("p", {class:"mb-0", text:`"${text}"`}));

    const card = el("div", {class:"col-md-4", "data-aos":"fade-up", "data-aos-delay":String(idx*100)}, [
      el("div", {class:"review-card h-100"}, body)
    ]);
    container.appendChild(card);
  });

  if (window.AOS) AOS.refresh();
}

// Review form (optimistic add)
function initReviewForm(formId, containerId){
  const form = document.getElementById(formId);
  const list = document.getElementById(containerId);
  if (!form || !list) return;
  try{
    const savedName = localStorage.getItem("reviewName");
    const savedEmail = localStorage.getItem("reviewEmail");
    if (savedName && form.querySelector("#reviewName") && !form.querySelector("#reviewName").value){
      form.querySelector("#reviewName").value = savedName;
    }
    if (savedEmail && form.querySelector("#reviewEmail") && !form.querySelector("#reviewEmail").value){
      form.querySelector("#reviewEmail").value = savedEmail;
    }
  }catch(_){ /* ignore */ }
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const name = form.querySelector("#reviewName")?.value.trim() || "";
    const text = form.querySelector("#reviewText")?.value.trim() || "";
    const email = form.querySelector("#reviewEmail")?.value.trim() || "";
    const country = (form.querySelector("#reviewCountry")?.value || "").toUpperCase();
    const rating = Number(form.querySelector("input[name='rating']:checked")?.value || 0);
    if (!name || !text) return;

    const flag = country ? `${COUNTRY_FLAGS[country] || "🌍"} ${country}` : "";
    const nodes = [
      el("div", {class:"review-head"}, [
        el("div", {class:"avatar", text:getInitials(name)}),
        el("div", {class:"d-flex flex-column"}, [
          el("strong", {text:name}),
          flag ? el("div", {class:"text-secondary small", text:flag}) : null
        ].filter(Boolean))
      ])
    ];
    if (rating > 0){
      nodes.push(el("div", {class:"stars mb-2", text:"★".repeat(Math.min(5, rating))}));
    }
    nodes.push(el("p", {class:"mb-0", text:`"${text}"`}));

    const card = el("div", {class:"col-md-4", "data-aos":"fade-up"}, [
      el("div", {class:"review-card h-100"}, nodes)
    ]);
    list.prepend(card);
    if (window.AOS) AOS.refresh();
    form.reset();
    if (country) form.querySelector("#reviewCountry")?.value = country;
    try{
      if (name) localStorage.setItem("reviewName", name);
      if (email) localStorage.setItem("reviewEmail", email);
    }catch(_){ /* ignore */ }
    showToast("Спасибо за отзыв!");
  });
}

// Booking form: load component, fill rooms, handle submit
async function loadBookingForm(containerId, selectId, lang="ru"){
  const container = document.getElementById(containerId);
  if (!container) return;

  try{
    const res = await fetch("components/booking_form.html", {cache:"no-store"});
    container.innerHTML = await res.text();
  }catch(e){ console.error("booking_form load error", e); return; }

  await loadRooms(null, selectId, lang);

  const form = document.getElementById("bookingForm");
  form?.addEventListener("submit", (e)=>{
    e.preventDefault();
    const data = {
      name: document.getElementById("name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      checkin: document.getElementById("checkin").value,
      checkout: document.getElementById("checkout").value,
      room: document.getElementById("room").value,
      guests: document.getElementById("guests").value
    };

    if (new Date(data.checkout) <= new Date(data.checkin)){
      showToast("Дата отъезда должна быть позже даты заезда");
      return;
    }
    if (!data.room){
      showToast("Пожалуйста, выберите номер");
      return;
    }

    // Send booking + create checkout session
    fetch("/api/book",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data)}).catch(()=>{});
    fetch("/api/create-checkout-session",{method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({roomId:data.room, nights:1, email:data.email})})
      .then(r=>r.json())
      .then(j=>{ if (j.url) { window.location.href = j.url; } else { showToast("Не удалось открыть оплату"); } })
      .catch(()=> showToast("Ошибка оплаты"));

  });
}

function initHeroBookingForm(){
  const form = document.getElementById("heroBookingForm");
  const roomSelect = document.getElementById("heroRoomSelect");
  if (!form || !roomSelect) return;

  const checkinInput = document.getElementById("heroCheckin");
  const checkoutInput = document.getElementById("heroCheckout");

  const today = new Date();
  const todayIso = today.toISOString().split("T")[0];
  if (checkinInput){
    if (!checkinInput.value) checkinInput.value = todayIso;
    checkinInput.min = todayIso;
  }
  if (checkoutInput){
    const base = checkinInput?.value ? new Date(checkinInput.value) : new Date(todayIso);
    const minCheckout = new Date(base);
    minCheckout.setDate(minCheckout.getDate() + 1);
    const minCheckoutIso = minCheckout.toISOString().split("T")[0];
    checkoutInput.min = minCheckoutIso;
    if (!checkoutInput.value || (checkinInput && new Date(checkoutInput.value) <= new Date(checkinInput.value))){
      checkoutInput.value = minCheckoutIso;
    }
  }
  if (checkinInput && checkoutInput){
    checkinInput.addEventListener("change", ()=>{
      if (!checkinInput.value) return;
      const start = new Date(checkinInput.value);
      const min = new Date(start);
      min.setDate(min.getDate() + 1);
      const iso = min.toISOString().split("T")[0];
      checkoutInput.min = iso;
      if (!checkoutInput.value || new Date(checkoutInput.value) <= start){
        checkoutInput.value = iso;
      }
    });
  }

  if (form.dataset.bound === "true") return;
  form.dataset.bound = "true";

  form.addEventListener("submit", (event)=>{
    event.preventDefault();
    const lang = window.currentLang || "ru";
    const checkin = checkinInput?.value || "";
    const checkout = checkoutInput?.value || "";
    if (!roomSelect.value){
      const message = lang === "en" ? "Please choose a room" : lang === "kz" ? "Бөлме таңдаңыз" : "Пожалуйста, выберите номер";
      showToast(message);
      return;
    }
    if (checkin && checkout && new Date(checkout) <= new Date(checkin)){
      const msg = lang === "en"
        ? "Check-out must be after check-in"
        : lang === "kz"
          ? "Шығу күні келу күнінен кейін болуы керек"
          : "Дата отъезда должна быть позже даты заезда";
      showToast(msg);
      return;
    }

    const params = new URLSearchParams();
    params.set("roomId", roomSelect.value);
    const selectedText = roomSelect.options[roomSelect.selectedIndex]?.text || "";
    if (selectedText) params.set("room", selectedText);
    if (checkin) params.set("checkin", checkin);
    if (checkout) params.set("checkout", checkout);
    const guests = document.getElementById("heroGuests")?.value;
    if (guests) params.set("guests", guests);
    window.location.href = `booking_contacts.html?${params.toString()}`;
  });
}

// Language switch
function updateCurrentFlag(lang){
  const current = document.querySelector(".lang-toggle .current-flag");
  if (!current) return;
  const flag = lang === "en" ? "🇺🇸" : lang === "kz" ? "🇰🇿" : "🇷🇺";
  current.textContent = flag;
  current.setAttribute("data-lang-current", lang);
}

function initLanguageSwitch(){
  document.querySelectorAll(".lang-item[data-lang]").forEach(item=>{
    item.addEventListener("click", async (e)=>{
      e.preventDefault();
      const lang = item.getAttribute("data-lang");
      if (!lang) return;
      window.currentLang = lang;
      try{ localStorage.setItem("lang", lang); }catch(_){ /* ignore */ }
      updateCurrentFlag(lang);
      initLanguage(lang);
      const prevSelection = document.getElementById("heroRoomSelect")?.value || "";
      await loadRooms("roomsContainer", "heroRoomSelect", lang);
      if (prevSelection){
        const heroSelect = document.getElementById("heroRoomSelect");
        if (heroSelect) heroSelect.value = prevSelection;
      }
      initHeroBookingForm();
      if (document.getElementById("roomsDetailedContainer")){
        await loadRoomsDetailed("roomsDetailedContainer", lang);
      }
      await loadReviews("reviewsContainer", lang);
      await loadBookingForm("bookingFormContainer", "room", lang);
    });
  });
}

// Button ripple coordinates
function enableRipples(){
  document.addEventListener("click", (e)=>{
    const btn = e.target.closest(".ripple");
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--x", `${e.clientX - rect.left}px`);
    btn.style.setProperty("--y", `${e.clientY - rect.top}px`);
    btn.classList.remove("is-anim");
    void btn.offsetWidth;
    btn.classList.add("is-anim");
    setTimeout(()=>btn.classList.remove("is-anim"), 650);
  });
}

// Toast helper (Bootstrap)
function showToast(msg){
  let tc = document.querySelector(".toast-container");
  if (!tc){
    tc = el("div",{class:"toast-container"}); document.body.appendChild(tc);
  }
  const t = el("div",{class:"toast align-items-center border-0", role:"alert","aria-live":"assertive","aria-atomic":"true"}, [
    el("div",{class:"d-flex"}, [
      el("div",{class:"toast-body", text:msg}),
      el("button",{class:"btn-close btn-close-white me-2 m-auto","data-bs-dismiss":"toast","aria-label":"Close"})
    ])
  ]);
  tc.appendChild(t);
  const toast = new bootstrap.Toast(t,{delay:2500});
  toast.show();
  t.addEventListener("hidden.bs.toast", ()=> t.remove());
}

// INIT
document.addEventListener("DOMContentLoaded", async ()=>{
  let preferredLang = "ru";
  try{
    const stored = localStorage.getItem("lang");
    if (stored) preferredLang = stored;
  }catch(_){ /* ignore */ }
  window.currentLang = preferredLang;

  await loadComponent("headerContainer","components/header.html");
  await loadComponent("footerContainer","components/footer.html");

  updateCurrentFlag(preferredLang);
  initLanguage(preferredLang);

  // Sections
  await loadBookingForm("bookingFormContainer", "room", preferredLang);
  const pre = getQueryParam("roomId");
  await loadRooms("roomsContainer","heroRoomSelect", preferredLang);
  const heroSelect = document.getElementById("heroRoomSelect");
  if (pre && heroSelect){
    heroSelect.value = pre;
  }
  initHeroBookingForm();
  const onRoomsPage = window.location.pathname.endsWith("/rooms.html") || window.location.pathname.endsWith("rooms.html");
  if (onRoomsPage){
    await loadRoomsDetailed("roomsDetailedContainer", preferredLang);
  }
  await loadGallery("galleryContainer");
  await loadReviews("reviewsContainer", preferredLang);
  initReviewForm("reviewForm","reviewsContainer");
  attachRoomListeners("roomsContainer");

  // UI
  enableSmoothScroll();
  enableRipples();
  initLanguageSwitch();

  // AOS
  if (window.AOS) AOS.init({duration:1000, once:true});

  // Secret owner access: triple-click brand OR Ctrl+Shift+O
  let clicks = 0; const brand = document.querySelector(".navbar-brand");
  if (brand){
    brand.addEventListener("click", ()=>{
      clicks++; setTimeout(()=>clicks=0, 800);
      if (clicks>=3) window.location.href = "owner.html";
    });
  }
  document.addEventListener("keydown", (e)=>{
    if (e.ctrlKey && e.shiftKey && (e.key==='O' || e.key==='o')){
      window.location.href = "owner.html";
    }
  });
});

// Detailed rooms renderer for rooms.html
async function loadRoomsDetailed(containerId="roomsDetailedContainer", lang="ru"){
  try{
    if (!roomsData.length) roomsData = await loadJSON("data/rooms.json");
  }catch(e){ console.error("rooms.json error", e); return; }

  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const activeLang = lang || window.currentLang || "ru";

  roomsData.forEach((room, idx)=>{
    const title = room.title?.[activeLang] || room.title?.ru || "Номер";
    const desc  = room.description?.[activeLang] || room.description?.ru || "";
    const features = room.features || ["wifi","tv","ac","kettle","safe","breakfast"];

    const mapIcon = {
      wifi: "bi-wifi", tv:"bi-tv", ac:"bi-snow", kettle:"bi-cup-hot", safe:"bi-shield-lock", breakfast:"bi-egg-fried", balcony:"bi-building"
    };

    const featureList = document.createElement("ul");
    featureList.className = "features-list";
    features.forEach(f=>{
      const li = document.createElement("li");
      const i = document.createElement("i");
      i.className = `bi ${mapIcon[f]||"bi-dot"}`;
      const span = document.createElement("span");
      const human = {wifi:"Wi‑Fi", tv:"TV", ac:"Кондиционер", kettle:"Чайник", safe:"Сейф", breakfast:"Завтрак", balcony:"Балкон"};
      span.textContent = human[f] || f;
      li.append(i, span);
      featureList.appendChild(li);
    });

    const row = el("div",{
      class:"row align-items-center g-4 mb-4 room-detail-row",
      "data-room-id": String(room.id),
      "data-aos":"fade-up",
      "data-aos-delay": String(idx*80)
    }, [
      el("div",{class:"col-lg-5"},[ el("img",{src:room.image, alt:title, class:"img-fluid rounded-4 shadow-sm"}) ]),
      el("div",{class:"col-lg-7"},[
        el("h3",{class:"mb-2", text:title}),
        el("p",{class:"text-secondary mb-2", text:desc}),
        featureList,
        el("div",{class:"d-flex align-items-center gap-3 mt-3"},[
          el("div",{class:"fw-semibold", text: (room.price ? `от ${room.price} ₼/ночь` : "")}),
          el("a",{href:`booking_contacts.html?roomId=${room.id}`, class:"btn btn-gold ripple"},[document.createTextNode("Забронировать")])
        ])
      ])
    ]);

    container.appendChild(row);
  });

  if (window.AOS) AOS.refresh();

  const highlightId = getQueryParam("id") || getQueryParam("roomId");
  if (highlightId){
    const safeId = String(highlightId).replace(/"/g, '\\"');
    const match = container.querySelector(`[data-room-id="${safeId}"]`);
    if (match){
      match.classList.add("room-highlight");
      match.scrollIntoView({behavior:"smooth", block:"center"});
      setTimeout(()=> match.classList.remove("room-highlight"), 2200);
    }
  }
}



// === Rooms "Подробнее" modal/gallery ===
function openRoomModal(room){
  const modalEl = document.getElementById("roomModal");
  if (!modalEl) return;
  const lang = window.currentLang || "ru";
  const title = modalEl.querySelector(".modal-title");
  const body = modalEl.querySelector(".modal-body");
  if (title) title.textContent = room.title?.[lang] || room.title?.ru || "Номер";
  if (body){
    body.innerHTML = "";
    const imgs = room.extraImages && room.extraImages.length ? room.extraImages : [room.image];
    imgs.forEach(src=>{
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = src;
      body.appendChild(img);
    });
    const desc = room.description?.[lang] || room.description?.ru || "";
    if (desc){
      const p = document.createElement("p");
      p.className = "mt-2";
      p.textContent = desc;
      body.appendChild(p);
    }
    if (Array.isArray(room.features) && room.features.length){
      const list = document.createElement("ul");
      list.className = "features-list";
      const human = {wifi:"Wi‑Fi", tv:"TV", ac:"Кондиционер", kettle:"Чайник", safe:"Сейф", breakfast:"Завтрак", balcony:"Балкон"};
      room.features.forEach(f=>{
        const li = document.createElement("li");
        li.textContent = human[f] || f;
        list.appendChild(li);
      });
      body.appendChild(list);
    }
    if (room.price){
      const price = document.createElement("div");
      price.className = "fw-semibold mt-2";
      price.textContent = `от ${room.price} ₼/ночь`;
      body.appendChild(price);
    }
  }
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

function attachRoomListeners(containerId="roomsContainer"){ 
  const container = document.getElementById(containerId);
  if (!container || container.dataset.roomHandlersBound === "true") return;
  container.dataset.roomHandlersBound = "true";

  container.addEventListener("click", (event)=>{
    const card = event.target.closest("[data-room-index]");
    if (!card) return;
    const idx = Number(card.getAttribute("data-room-index"));
    const room = (window.roomsData || [])[idx];
    if (!room) return;

    const lang = window.currentLang || "ru";
    const bookBtn = event.target.closest(".js-book-room");
    const detailBtn = event.target.closest(".js-room-detail");

    if (bookBtn){
      event.preventDefault();
      const title = room.title?.[lang] || room.title?.ru || `Room ${room.id}`;
      window.location.href = `booking_contacts.html?roomId=${encodeURIComponent(room.id)}&room=${encodeURIComponent(title)}`;
      return;
    }

    if (detailBtn){
      event.preventDefault();
      if (document.getElementById("roomModal")){
        openRoomModal(room);
      } else {
        window.location.href = `rooms.html?id=${encodeURIComponent(room.id)}`;
      }
      return;
    }

    if (event.target.closest(".card")){
      window.location.href = `rooms.html?id=${encodeURIComponent(room.id)}`;
    }
  });
}

// Try attach after dynamic loads
document.addEventListener("rooms:rendered", (evt)=>{
  const containerId = evt.detail?.containerId || "roomsContainer";
  attachRoomListeners(containerId);
});

// === Booking: populate rooms, prefill, and send ===
function qs(name){ const u = new URL(window.location.href); return u.searchParams.get(name); }

async function initBookingForm(){
  const form = document.getElementById("bookingForm");
  if (!form) return;
  // load rooms for select
  if (!window.roomsData || window.roomsData.length===0){
    const res = await fetch("data/rooms.json"); window.roomsData = await res.json();
  }
  const sel = document.getElementById("bRoom");
  const lang = window.currentLang || "ru";
  window.roomsData.forEach(r=>{
    const opt = document.createElement("option");
    const label = r.title?.[lang] || r.title?.ru || ("Номер "+r.id);
    opt.value = label;
    opt.textContent = label;
    opt.dataset.roomId = String(r.id);
    sel.appendChild(opt);
  });
  // prefill from ?room
  const pre = qs("room");
  if (pre){
    [...sel.options].forEach(o=>{ if (o.value.toLowerCase()===pre.toLowerCase()) sel.value=o.value; });
  }
  const preId = qs("roomId");
  if (preId && !pre){
    [...sel.options].forEach(o=>{ if (o.dataset.roomId === preId) sel.value = o.value; });
  }
  const qCheckin = qs("checkin");
  const qCheckout = qs("checkout");
  const qGuests = qs("guests");
  if (qCheckin){
    const el = document.getElementById("bCheckin");
    if (el) el.value = qCheckin;
  }
  if (qCheckout){
    const el = document.getElementById("bCheckout");
    if (el) el.value = qCheckout;
  }
  if (qGuests){
    const el = document.getElementById("bGuests");
    if (el) el.value = qGuests;
  }
  // handle submit
  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const payload = {
      name: document.getElementById("bName").value.trim(),
      email: document.getElementById("bEmail").value.trim(),
      phone: document.getElementById("bPhone").value.trim(),
      room: document.getElementById("bRoom").value,
      checkin: document.getElementById("bCheckin").value,
      checkout: document.getElementById("bCheckout").value,
      guests: document.getElementById("bGuests").value,
      notes: document.getElementById("bNotes").value.trim(),
    };
    // EmailJS placeholder (if connected)
    if (window.emailjs){
      try{
        // Replace with your EmailJS IDs
        const serviceID = "YOUR_SERVICE_ID";
        const templateID = "YOUR_TEMPLATE_ID";
        await emailjs.send(serviceID, templateID, payload);
        alert("Бронирование отправлено! Мы скоро свяжемся с вами.");
      }catch(err){
        console.error(err);
        fallbackMail(payload);
      }
    } else {
      fallbackMail(payload);
    }
  });
}

function fallbackMail(p){
  const toHotel = "info@oldbaku.example"; // замените на реальную почту отеля
  const subject = encodeURIComponent("Бронирование: " + p.room + " ("+p.checkin+"–"+p.checkout+")");
  const body = encodeURIComponent(
    "Имя: " + p.name + "\nEmail: " + p.email + "\nТелефон: " + p.phone +
    "\nНомер: " + p.room + "\nЗаезд: " + p.checkin + "\nВыезд: " + p.checkout +
    "\nГостей: " + p.guests + "\nПожелания: " + p.notes
  );
  // Откроем почтовый клиент пользователя с письмом в отель
  window.location.href = "mailto:"+toHotel+"?subject="+subject+"&body="+body;
  // Также покажем пользователю копию на экран
  alert("Заявка на бронирование сформирована. Проверьте ваш почтовый клиент.");
}

document.addEventListener("DOMContentLoaded", initBookingForm);

// === Gallery Lightbox ===
function openLightbox(index, list){
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.dataset.index = index;
  lb.dataset.total = list.length;
  const img = lb.querySelector("img");
  img.src = list[index];
  lb.classList.add("is-open");
  const prev = lb.querySelector(".lb-prev");
  const next = lb.querySelector(".lb-next");
  const close = lb.querySelector(".lb-close");
  prev.onclick = ()=>{ let i = (+lb.dataset.index+list.length-1)%list.length; lb.dataset.index=i; img.src=list[i]; };
  next.onclick = ()=>{ let i = (+lb.dataset.index+1)%list.length; lb.dataset.index=i; img.src=list[i]; };
  close.onclick = ()=> lb.classList.remove("is-open");
  lb.onclick = (e)=>{ if (e.target===lb) lb.classList.remove("is-open"); };
}

// === Reviews helpers ===
function starString(n){ return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5-n); }

// === Homepage Gallery (carousel) ===
async function buildHomeGallery(){
  const track = document.getElementById("homeGallery");
  if (!track) return;
  // Try to fetch from data/gallery.json; fallback to defaults
  let list = [];
  try{
    const res = await fetch("data/gallery.json", {cache:"no-store"});
    if (res.ok) list = await res.json();
  }catch(e){ /* ignore */ }
  if (!Array.isArray(list) || list.length===0){
    list = [
      "images/gallery1.jpg","images/gallery2.jpg","images/gallery3.jpg",
      "images/gallery4.jpg","images/gallery5.jpg","images/gallery6.jpg"
    ];
  }
  // Normalize to [{src, alt}]
  list = list.map((it,i)=> typeof it==="string" ? {src:it, alt:"Hotel photo "+(i+1)} : it);

  track.innerHTML = "";
  list.forEach((it)=>{
    const wrap = document.createElement("div");
    wrap.className = "carousel-item";
    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = it.src;
    img.alt = it.alt || "Hotel photo";
    // Click → go to full Gallery page
    img.addEventListener("click", ()=> window.location.href = "gallery.html");
    wrap.appendChild(img);
    track.appendChild(wrap);
  });

  // Arrows
  const left = document.querySelector(".js-gal-left");
  const right = document.querySelector(".js-gal-right");
  const scrollBy = Math.floor(track.clientWidth * 0.9) || 400;
  if (left && right){
    left.onclick = ()=> track.scrollBy({left:-scrollBy, behavior:"smooth"});
    right.onclick = ()=> track.scrollBy({left: scrollBy, behavior:"smooth"});
  }
}
document.addEventListener("DOMContentLoaded", buildHomeGallery);
