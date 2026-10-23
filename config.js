/* Keylin Cosmetics: настройки приглашения.
 *
 * Всё, что нужно поменять без правки кода, лежит здесь.
 * Значения помеченные «ПРИМЕР» пока выдуманы для сэмпла и заменяются настоящими.
 */
window.KELIN = {
  // Показывает маленькую плашку «Демо-версия» внизу страницы. Для боевой версии поставить false.
  sample: false,

  // Дата открытия подтверждена: 25 октября 2026, воскресенье. Время подтверждено: 10:00 утра. Часовой пояс Ташкента (UTC+5). Из этого считаются таймер, дата и календарь.
  opening: { year: 2026, month: 10, day: 25, hour: 10, minute: 0, tzOffset: 5, durationHours: 3 },

  // Адрес текстом. Пустая строка = показать «Ташкент, точный адрес на карте».
  address: { uz: 'Toshkent, Yashnobod tumani, Aviasozlar-3 massivi', ru: 'Ташкент, Яшнабадский район, массив Авиасозлар-3' },

  // Точка магазина: из ссылки Яндекс (Что здесь), 23.10. Здание по карте OSM: дом 38, массив Авиасозлар-3.
  coords: { lat: 41.2884, lng: 69.344235 },

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

  // Визитки сестёр. Порядок всегда такой: сначала Фотима, потом Зухра (так просили владелицы). У каждой можно добавить phone, phoneLabel и email: пустые поля на визитке
  // просто не показываются. Страница и репозиторий публичные, поэтому личные данные
  // (e-mail, личный номер) владелицы добавляют сами и только если согласны их публиковать.
  people: [
    { id: 'fotima', first: 'Fotima', last: 'Akhmedova', phone: '', phoneLabel: '', email: '' },
    { id: 'zuhra', first: 'Zuhra', last: 'Ahmedova', phone: '+998990552249', phoneLabel: '+998 99 055-22-49', email: '' }
  ],

  // Адрес, куда уходят ответы гостей: Cloudflare Worker (папка worker/), он пересылает их в Telegram.
  // Если очистить строку, форма перейдёт в демо-режим: ответ никуда не отправляется.
  rsvpEndpoint: 'https://keylin-rsvp.koreanmadie.workers.dev/rsvp',

  // Фото и видео. Положите файл в assets/photos/ и впишите путь, рамка заменится на медиа.
  // Арт: campaign, ritual, origin. Личные фото: hero-zuhra, hero-fotima (сёстры),
  // story-1a, story-1b, story-2. Галерея: gallery-1 … gallery-5 (у видео можно добавить poster:
  // 'gallery-3': { src: 'assets/photos/open.mp4', poster: 'assets/photos/open.jpg' } и data-type="video" в index.html).
  media: {
    // Сгенерированные арт-композиции для оформления, не фото реальных товаров или магазина.
    'campaign': { src: 'assets/art/campaign.webp' },
    'ritual': { src: 'assets/art/ritual.webp' },
    'origin': { src: 'assets/art/origin.webp' },

    // Настоящие фото сестёр. Файлы обрезаны под рамки и очищены от метаданных (геопозиция и т. п.).
    // Текст на дипломах размыт: там напечатаны полные имена. Не заменять оригиналами.
    'hero-zuhra': { src: 'assets/photos/portrait-zuhra.webp' },
    'hero-fotima': { src: 'assets/photos/portrait-fotima.webp' },
    'story-1a': { src: 'assets/photos/childhood-toddlers.webp' },
    'story-1b': { src: 'assets/photos/childhood-tubeteika.webp' },
    'story-2': { src: 'assets/photos/sakura-korea.webp' },
    'gallery-1': { src: 'assets/photos/sisters-burgundy.webp' },
    'gallery-2': { src: 'assets/photos/graduation-bears.webp' },
    'gallery-3': { src: 'assets/photos/sakura-pose.webp' },
    'gallery-4': { src: 'assets/photos/graduation-red.webp' },
    'gallery-5': { src: 'assets/photos/graduation-banner.webp' },

    // Раздел «Наш магазин»: настоящие фото. Видео без звука и метаданных, играет само, пока на экране.
    'store-facade': { src: 'assets/photos/store-facade.webp' },
    'store-sign': { src: 'assets/photos/store-sign-photo.webp' },
    'store-clip': { src: 'assets/photos/store-sign.mp4', poster: 'assets/photos/store-sign-poster.webp', autoplay: true },
    'store-shelves': { src: 'assets/photos/store-shelves.webp' },
    'store-window': { src: 'assets/photos/store-window.webp' },
    'store-lounge': { src: 'assets/photos/store-lounge.webp' }
  }
};
