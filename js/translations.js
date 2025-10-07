export const translations = {
  aboutLink: { ru: "О нас", en: "About Us", kz: "Біз туралы" },
  roomsLink: { ru: "Номера", en: "Rooms", kz: "Бөлмелер" },
  servicesLink: { ru: "Услуги", en: "Services", kz: "Қызметтер" },
  galleryLink: { ru: "Галерея", en: "Gallery", kz: "Галерея" },
  reviewsLink: { ru: "Отзывы", en: "Reviews", kz: "Пікірлер" },
  bookingLink: { ru: "Бронирование", en: "Booking", kz: "Брондау" },

  heroTitle: { ru: "Добро пожаловать в Old Baku Boutique Hotel", en: "Welcome to Old Baku Boutique Hotel", kz: "Old Baku Boutique қонақүйіне қош келдіңіз" },
  heroLead:  { ru: "В самом сердце Ичеришехера — в 2 минутах от Дворца Ширваншахов", en: "In the heart of Icherisheher — 2 minutes to Palace of the Shirvanshahs", kz: "Ічэрішәхәр жүрегінде — Ширваншахтар сарайына 2 минут" },
  bookingButton: { ru: "Забронировать сейчас", en: "Book Now", kz: "Қазір брондау" },

  aboutTitle: { ru: "О нас", en: "About Us", kz: "Біз туралы" },
  aboutText:  { ru: "Бутик‑отель в Старом городе Баку. Исторические улицы, уютные номера, терраса и шаговая доступность до Девичьей башни и Низами.", en: "Boutique hotel in Baku Old City with cozy rooms and terrace steps from Maiden Tower and Nizami Street.", kz: "Бакудың Ескі қаласындағы бутик қонақүйі: жайлы бөлмелер, терраса, Тұғым мұнарасы мен Низами көшесіне бірнеше қадам." },

  roomsTitle: { ru: "Наши номера", en: "Our Rooms", kz: "Бөлмелер" },
  servicesTitle: { ru: "Услуги", en: "Services", kz: "Қызметтер" },
  galleryTitle: { ru: "Галерея", en: "Gallery", kz: "Галерея" },
  reviewsTitle: { ru: "Отзывы гостей", en: "Guest Reviews", kz: "Қонақтар пікірлері" },
  bookingTitle: { ru: "Бронирование", en: "Booking", kz: "Брондау" },

  name: { ru: "Имя", en: "Name", kz: "Аты" },
  email: { ru: "Email", en: "Email", kz: "Эл. пошта" },
  phone: { ru: "Телефон", en: "Phone", kz: "Телефон" },
  checkin: { ru: "Дата заезда", en: "Check‑in", kz: "Келу күні" },
  checkout: { ru: "Дата отъезда", en: "Check‑out", kz: "Шығу күні" },
  room: { ru: "Тип номера", en: "Room Type", kz: "Бөлме түрі" },
  selectRoom: { ru: "Выберите номер", en: "Select Room", kz: "Бөлме таңдаңыз" },
  guests: { ru: "Количество гостей", en: "Guests", kz: "Қонақтар саны" },
  submit: { ru: "Отправить бронирование", en: "Submit Booking", kz: "Брондауды жіберу" },

  footerText: { ru: "© 2025 Old Baku Boutique Hotel. Все права защищены.", en: "© 2025 Old Baku Boutique Hotel. All rights reserved.", kz: "© 2025 Old Baku Boutique Hotel. Барлық құқықтар қорғалған." }
};

export function initLanguage(defaultLang="ru"){
  const ids = [
    "aboutLink","roomsLink","servicesLink","galleryLink","reviewsLink","bookingLink",
    "heroTitle","heroLead","bookingButton",
    "aboutTitle","aboutText",
    "roomsTitle","servicesTitle","galleryTitle","reviewsTitle","bookingTitle",
    "footerText"
  ];

  ids.forEach(id=>{
    const el = document.getElementById(id);
    if (!el) return;
    const key = translations[id];
    if (key && key[defaultLang]) el.textContent = key[defaultLang];
  });

  // Booking form labels if present
  const map = {
    nameLabel:"name", emailLabel:"email", phoneLabel:"phone",
    checkinLabel:"checkin", checkoutLabel:"checkout", roomLabel:"room",
    guestsLabel:"guests", submitBtn:"submit"
  };
  for (const [labelId, tKey] of Object.entries(map)){
    const el = document.getElementById(labelId);
    if (el && translations[tKey] && translations[tKey][defaultLang]){
      if (el.tagName === "BUTTON") el.textContent = translations[tKey][defaultLang];
      else el.textContent = translations[tKey][defaultLang];
    }
  }
}
