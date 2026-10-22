/* KeLin Cosmetics: настройки приглашения.
 *
 * Всё, что нужно поменять без правки кода, лежит здесь.
 * Значения помеченные «ПРИМЕР» пока выдуманы для сэмпла и заменяются настоящими.
 */
window.KELIN = {
  // Показывает маленькую плашку «Демо-версия» внизу страницы. Для боевой версии поставить false.
  sample: true,

  // ПРИМЕР: дата и время открытия по Ташкенту (UTC+5). Из этого считаются таймер, дата и календарь.
  opening: { year: 2026, month: 11, day: 15, hour: 18, minute: 0, tzOffset: 5, durationHours: 3 },

  // Адрес текстом. Пустая строка = показать «Ташкент, точный адрес на карте».
  address: { uz: '', ru: '' },

  // Точка на карте (из ссылки, которую прислали).
  coords: { lat: 41.288503, lng: 69.344578 },

  links: {
    invitation: 'https://shakhzodmir.github.io/keylin/',
    instagram: 'https://www.instagram.com/keylin_cosmetics/',
    telegram: 'https://t.me/keylincosmetics',
    phone: '+998990552249',
    phoneLabel: '+998 99 055-22-49',
    telegramContact: 'https://t.me/KeylinFZ',
    telegramContactLabel: 'KeylinFZ',
    instagramLabel: 'keylin_cosmetics'
  },

  // Визитки сестёр. У каждой можно добавить phone, phoneLabel и email: пустые поля на визитке
  // просто не показываются. Страница и репозиторий публичные, поэтому личные данные
  // (e-mail, личный номер) владелицы добавляют сами и только если согласны их публиковать.
  people: [
    { id: 'zuhra', first: 'Zuhra', last: 'Ahmedova', phone: '+998990552249', phoneLabel: '+998 99 055-22-49', email: '' },
    { id: 'fotima', first: 'Fotima', last: 'Akhmedova', phone: '', phoneLabel: '', email: '' }
  ],

  // Адрес, куда уходят ответы гостей: Cloudflare Worker (папка worker/), он пересылает их в Telegram.
  // Если очистить строку, форма перейдёт в демо-режим: ответ никуда не отправляется.
  rsvpEndpoint: 'https://keylin-rsvp.koreanmadie.workers.dev/rsvp',

  // Фото и видео. Положите файл в assets/photos/ и впишите путь, рамка заменится на медиа.
  // Арт: campaign, ritual, origin. Личные фото: hero-zuhra, hero-fotima (сёстры),
  // story-1a, story-1b, story-2. Галерея: gallery-1 … gallery-5.
  // (gallery-3 и gallery-5 рассчитаны на видео; у видео можно добавить poster).
  media: {
    // Сгенерированные арт-композиции для оформления, не фото реальных товаров или магазина.
    'campaign': { src: 'assets/art/campaign.webp' },
    'ritual': { src: 'assets/art/ritual.webp' },
    'origin': { src: 'assets/art/origin.webp' },
    'gallery-1': { src: 'assets/art/campaign.webp' },
    'gallery-2': { src: 'assets/art/ritual.webp' },
    'gallery-4': { src: 'assets/art/bloom.webp' },
    // 'story-1a': { src: 'assets/photos/story-1a.jpg' },
    // 'gallery-3': { src: 'assets/photos/open.mp4', poster: 'assets/photos/open.jpg' }
  }
};
