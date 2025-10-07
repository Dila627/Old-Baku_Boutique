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

  const container = containerId ? document.getElementById(containerId) : null;
  const select = selectId ? document.getElementById(selectId) : null;

  if (container) container.innerHTML = "";
  if (select){
    select.innerHTML = "";
    select.appendChild(el("option",{value:"",text:translations.selectRoom[lang] || "Select Room"}));
  }

  roomsData.forEach((room, idx)=>{
    const title = (room.title && room.title[lang]) ? room.title[lang] : (room.title?.ru || "Номер");
    const desc  = (room.description && room.description[lang]) ? room.description[lang] : (room.description?.ru || "");

    if (container){
      const card = el("div", {class:"col-md-4", "data-aos":"fade-up", "data-aos-delay":String(idx*100)}, [
        el("div", {class:"card h-100"}, [
          el("img", {src:room.image, alt:title, class:"card-img-top"}),
          el("div", {class:"card-body"}, [
            el("h5", {class:"card-title", text:title}),
            el("p", {class:"card-text", text:desc})
          ])
        ])
      ]);
      
container.appendChild(card);
// dispatch event after render
document.dispatchEvent(new Event("rooms:rendered"));

    }

    if (select){
      select.appendChild(el("option",{value:String(room.id), text:title}));
    }
  });

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

  galleryData.forEach((img, idx)=>{
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
    const card = el("div", {class:"col-md-4", "data-aos":"fade-up", "data-aos-delay":String(idx*100)}, [
      el("div", {class:"card p-3 h-100"}, [
        el("p", {class:"mb-1", text:`"${text}"`}),
        el("small", {text:`— ${name}`})
      ])
    ]);
    
container.appendChild(card);
// dispatch event after render
document.dispatchEvent(new Event("rooms:rendered"));

  });

  if (window.AOS) AOS.refresh();
}

// Review form (optimistic add)
function initReviewForm(formId, containerId){
  const form = document.getElementById(formId);
  const list = document.getElementById(containerId);
  if (!form || !list) return;
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const name = form.querySelector("#reviewName").value.trim();
    const text = form.querySelector("#reviewText").value.trim();
    if (!name || !text) return;

    const card = el("div", {class:"col-md-4", "data-aos":"fade-up"}, [
      el("div", {class:"card p-3 h-100"}, [
        el("p", {class:"mb-1", text:`"${text}"`}),
        el("small", {text:`— ${name}`})
      ])
    ]);
    list.prepend(card);
    if (window.AOS) AOS.refresh();
    form.reset();
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

// Language switch
function initLanguageSwitch(){
  document.querySelectorAll(".dropdown-item[data-lang]").forEach(item=>{
    item.addEventListener("click", async (e)=>{
      e.preventDefault();
      const lang = item.getAttribute("data-lang");
      const dd = document.getElementById("langDropdown");
      if (dd) dd.textContent = lang.toUpperCase();
      initLanguage(lang);
      await loadRooms("roomsContainer", "room", lang);
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
  await loadComponent("headerContainer","components/header.html");
  await loadComponent("footerContainer","components/footer.html");

  // Init i18n
  initLanguage("ru");

  // Sections
  await loadBookingForm("bookingFormContainer", "room", "ru");
  const pre = getQueryParam('roomId'); if (pre) { const sel = document.getElementById('room'); if (sel) sel.value = pre; }
  await loadRooms("roomsContainer","room","ru");
  if (window.location.pathname.endsWith('/rooms.html') || window.location.pathname.endsWith('rooms.html')) { await loadRoomsDetailed('roomsDetailedContainer','ru'); }
  await loadGallery("galleryContainer");
  await loadReviews("reviewsContainer","ru");
  initReviewForm("reviewForm","reviewsContainer");

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

  roomsData.forEach((room, idx)=>{
    const title = room.title?.[lang] || room.title?.ru || "Номер";
    const desc  = room.description?.[lang] || room.description?.ru || "";
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

    const row = el("div",{class:"row align-items-center g-4 mb-4", "data-aos":"fade-up", "data-aos-delay": String(idx*80)}, [
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
}



// === Language dropdown handling (flags) ===
document.addEventListener("click", (e)=>{
  const item = e.target.closest(".lang-item");
  if (item){
    e.preventDefault();
    const lang = item.getAttribute("data-lang");
    try { localStorage.setItem("lang", lang); } catch(_){}
    // update flag in toggle
    const flag = item.querySelector(".flag")?.textContent || "🌐";
    const current = document.querySelector(".lang-toggle .current-flag");
    if (current){ current.textContent = flag; current.setAttribute("data-lang-current", lang); }
    // re-init translations if available
    if (typeof initLanguage === "function"){ initLanguage(lang); }
  }
});

// === Rooms "Подробнее" modal/gallery ===
function openRoomModal(room){
  const modalEl = document.getElementById("roomModal");
  if (!modalEl) return;
  const title = modalEl.querySelector(".modal-title");
  const body = modalEl.querySelector(".modal-body");
  if (title) title.textContent = (room.title?.[window.currentLang||'ru']) || room.title?.ru || "Номер";
  if (body){
    body.innerHTML = "";
    const imgs = room.extraImages && room.extraImages.length ? room.extraImages : [room.image];
    imgs.forEach(src=>{
      const img = document.createElement("img");
      img.loading = "lazy";
      img.src = src;
      body.appendChild(img);
    });
  }
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();
}

// === Persisted language across pages ===
(function applySavedLanguage(){
  try{
    const saved = localStorage.getItem("lang");
    if (saved){
      window.currentLang = saved;
      if (typeof initLanguage === "function"){ initLanguage(saved); }
      const cur = document.querySelector(".lang-toggle .current-flag");
      if (cur){
        cur.textContent = saved === "ru" ? "🇷🇺" : saved === "en" ? "🇺🇸" : "🇰🇿";
        cur.setAttribute("data-lang-current", saved);
      }
    } else {
      window.currentLang = window.currentLang || "ru";
    }
  }catch(_){}
})();

// === Build Gallery (index) ===
async 
function buildGallery(containerId="galleryContainer"){
  const onHome = !!document.getElementById("homeGallery");
  const target = document.getElementById(onHome ? "homeGallery" : containerId);
  if (!target) return;
  const imgs = ["images/gallery1.jpg","images/gallery2.jpg","images/gallery3.jpg","images/gallery4.jpg","images/gallery5.jpg","images/gallery6.jpg"];
  target.innerHTML = "";
  imgs.forEach((src, i)=>{
    const img = document.createElement("img");
    img.loading = "lazy"; img.src = src; img.alt = "Hotel photo "+(i+1);
    if (onHome){
      const wrap = document.createElement("div");
      wrap.className = "carousel-item";
      img.addEventListener("click", ()=> window.location.href = "gallery.html");
      wrap.appendChild(img);
      target.appendChild(wrap);
    }else{
      img.dataset.index = String(i);
      img.addEventListener("click", ()=> openLightbox(i, imgs));
      target.appendChild(img);
    }
  });
  if (onHome){
    const track = target;
    const left = document.querySelector(".js-gal-left");
    const right = document.querySelector(".js-gal-right");
    const scrollBy = 320;
    if (left && right){
      left.onclick = ()=> track.scrollBy({left:-scrollBy, behavior:"smooth"});
      right.onclick = ()=> track.scrollBy({left: scrollBy, behavior:"smooth"});
    }
  }
}
document.addEventListener("DOMContentLoaded", ()=>{ buildGallery("galleryContainer"); });
document.addEventListener("DOMContentLoaded", ()=>{
  buildGallery("galleryContainer");
});

function attachRoomListeners(containerId="roomsContainer"){
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll("[data-room-index]").forEach(card=>{
    card.addEventListener("click", (e)=>{
      const idx = parseInt(card.getAttribute("data-room-index"));
      const room = (window.roomsData || [])[idx];
      if (room){ window.location.href = `rooms.html?id=${encodeURIComponent(room.id)}`; }
    });
    const book = card.querySelector(".js-book-room");
    if (book){
      book.addEventListener("click", (e)=>{
        e.stopPropagation();
        const idx = parseInt(card.getAttribute("data-room-index"));
        const room = (window.roomsData || [])[idx];
        const name = room?.title?.[window.currentLang||"ru"] || room?.title?.ru || "Room";
        window.location.href = "booking_contacts.html?room=" + encodeURIComponent(name);
      });
    }
  });
}
// Try attach after dynamic loads
document.addEventListener("rooms:rendered", ()=> attachRoomListeners("roomsContainer"));

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
    opt.value = r.title?.[lang] || r.title?.ru || ("Номер "+r.id);
    opt.textContent = opt.value;
    sel.appendChild(opt);
  });
  // prefill from ?room
  const pre = qs("room");
  if (pre){
    [...sel.options].forEach(o=>{ if (o.value.toLowerCase()===pre.toLowerCase()) sel.value=o.value; });
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

// === Reviews rendering with avatars and flags ===
const countryFlags = { "RU":"🇷🇺", "KZ":"🇰🇿", "US":"🇺🇸", "AZ":"🇦🇿", "TR":"🇹🇷", "DE":"🇩🇪", "GB":"🇬🇧", "FR":"🇫🇷", "IT":"🇮🇹" };

function initials(name){
  if (!name) return "🧑";
  const parts = name.trim().split(/\s+/);
  const a = (parts[0]||"")[0]||""; const b = (parts[1]||"")[0]||"";
  return (a+b).toUpperCase() || "★";
}

function buildReviews(containerId="reviewsContainer"){
  const c = document.getElementById(containerId);
  if (!c) return;
  const demo = [
    {name:"Aigerim", country:"KZ", rating:5, text:"Очень уютно, чисто и тихо. Отличное расположение."},
    {name:"Elvin", country:"AZ", rating:4, text:"Вежливый персонал, вкусный завтрак. Номер просторный."},
    {name:"Natalia", country:"RU", rating:5, text:"Красивый интерьер и вид из окна. Вернёмся снова!"}
  ];
  c.innerHTML = "";
  demo.forEach(r=>{
    const col = document.createElement("div"); col.className="col-md-6 col-lg-4";
    const card = document.createElement("div"); card.className="review-card";
    const head = document.createElement("div"); head.className="review-head";
    const av = document.createElement("div"); av.className="avatar"; av.textContent = initials(r.name);
    const meta = document.createElement("div"); meta.innerHTML = "<strong>"+r.name+"</strong><div class='text-secondary small'>"+(countryFlags[r.country]||"🌍")+" "+r.country+"</div>";
    head.appendChild(av); head.appendChild(meta);
    const rating = document.createElement("div"); rating.className="rating mb-2"; rating.textContent = "★★★★★".slice(0, r.rating);
    const text = document.createElement("p"); text.textContent = r.text;
    card.appendChild(head); card.appendChild(rating); card.appendChild(text);
    col.appendChild(card); c.appendChild(col);
  });
}
document.addEventListener("DOMContentLoaded", ()=>buildReviews("reviewsContainer"));

// Update flag after header component is loaded dynamically
document.addEventListener("DOMContentLoaded", ()=>{
  setTimeout(()=>{
    const saved = (localStorage.getItem("lang")||"ru");
    const cur = document.querySelector(".lang-toggle .current-flag");
    if (cur){
      cur.textContent = saved === "ru" ? "🇷🇺" : saved === "en" ? "🇺🇸" : "🇰🇿";
      cur.setAttribute("data-lang-current", saved);
    }
  }, 200);
});

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

function handleReviewForm(){
  const form = document.getElementById("reviewForm");
  if (!form) return;
  const nameI = document.getElementById("reviewName");
  const emailI = document.getElementById("reviewEmail");
  const textI = document.getElementById("reviewText");
  const countryI = document.getElementById("reviewCountry");
  const starsI = form.querySelector("input[name='rating']:checked");
  // Prefill from memory
  const savedEmail = localStorage.getItem("reviewEmail");
  const savedName = localStorage.getItem("reviewName");
  if (savedEmail && emailI) emailI.value = savedEmail;
  if (savedName && nameI) nameI.value = savedName;
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const rating = +(form.querySelector("input[name='rating']:checked")?.value || 0);
    const rv = {
      name: nameI?.value?.trim() || "Гость",
      email: emailI?.value?.trim() || "",
      country: countryI?.value || "AZ",
      rating,
      text: textI?.value?.trim() || ""
    };
    if (!rv.email){ return; }
    // remember who posted
    localStorage.setItem("reviewEmail", rv.email);
    localStorage.setItem("reviewName", rv.name);
    // render new review at top
    const cc = document.getElementById("reviewsContainer");
    if (cc){
      const flags = { "RU":"🇷🇺","KZ":"🇰🇿","US":"🇺🇸","AZ":"🇦🇿","TR":"🇹🇷","DE":"🇩🇪","GB":"🇬🇧","FR":"🇫🇷","IT":"🇮🇹" };
      const col = document.createElement("div"); col.className="col-md-6 col-lg-4";
      const card = document.createElement("div"); card.className="review-card";
      const head = document.createElement("div"); head.className="review-head";
      const av = document.createElement("div"); av.className="avatar"; av.textContent = (rv.name[0]||'').toUpperCase();
      const meta = document.createElement("div"); meta.innerHTML = "<div class='fw-semibold'>"+rv.name+"</div><div class='text-secondary small'><span class='flag-pill'>"+(flags[rv.country]||"🌍")+"</span></div>";
      head.append(av, meta);
      const stars = document.createElement("div"); stars.className="stars mb-1"; stars.textContent = "★".repeat(rating);
      const p = document.createElement("p"); p.textContent = rv.text;
      card.append(head, stars, p);
      const wrap = document.createElement("div"); wrap.className="col-md-6 col-lg-4";
      wrap.appendChild(card);
      cc.prepend(wrap);
      form.reset();
    }
  });
}
document.addEventListener("DOMContentLoaded", handleReviewForm);

async function renderRoomDetail(){
  const id = getQueryParam("id");
  const container = document.getElementById("roomsContainer");
  if (!container || !id) return;
  if (!roomsData.length) roomsData = await loadJSON("data/rooms.json");
  const lang = window.currentLang || "ru";
  const room = roomsData.find(r=> String(r.id) === String(id) || r.slug === id);
  if (!room) return;
  container.innerHTML = "";
  const title = room.title?.[lang] || room.title?.ru || "Номер";
  const desc = room.description?.[lang] || room.description?.ru || "";
  const imgs = room.images?.length ? room.images : [room.image];
  const gallery = document.createElement("div"); gallery.className="d-flex gap-3 flex-wrap mb-3";
  imgs.forEach(src=>{ const i=document.createElement("img"); i.src=src; i.alt=title; i.className="img-fluid rounded-4"; i.style.width="300px"; i.style.aspectRatio="4/3"; i.style.objectFit="cover"; gallery.appendChild(i); });
  const bookBtn = document.createElement("a"); bookBtn.className="btn btn-gold ripple"; bookBtn.href = `booking_contacts.html?room=${encodeURIComponent(title)}`; bookBtn.textContent="Забронировать";
  const wrap = document.createElement("div"); wrap.className="col-12"; 
  wrap.append(
    el("h2",{text:title}), 
    el("p",{class:"text-secondary", text:desc}), 
    gallery, 
    bookBtn
  );
  container.appendChild(wrap);
}
document.addEventListener("DOMContentLoaded", renderRoomDetail);

// Home: click on any room card navigates to Rooms page
document.addEventListener("DOMContentLoaded", ()=>{
  const rc = document.getElementById("roomsContainer");
  if (rc){
    rc.addEventListener("click", (e)=>{
      const card = e.target.closest("[data-room-index]");
      if (card) window.location.href = "rooms.html";
    });
  }
});

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
