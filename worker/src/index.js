/* KeLin Cosmetics: приём ответов гостей и пересылка в Telegram.
 *
 * Сайт (GitHub Pages) шлёт POST /rsvp с JSON. Worker проверяет данные и отправляет текст в Telegram.
 * Токен бота и номера чатов лежат только в секретах Cloudflare, в коде и в репозитории их нет.
 *
 * Секреты (задаются командой wrangler secret put):
 *   TELEGRAM_BOT_TOKEN   токен от @BotFather
 *   TELEGRAM_CHAT_IDS    номера чатов через запятую (группа сестёр и/или личные чаты)
 * Переменные (wrangler.toml):
 *   ALLOWED_ORIGINS      сайты, которым можно слать ответы, через запятую
 */

const MAX_BODY_BYTES = 4096;
const MAX_NAME = 60;
const MAX_NOTE = 300;
const MAX_GUESTS = 6;

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://shakhzodmir.github.io')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(origin, env) {
  if (!origin || !allowedOrigins(env).includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function reply(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {})
  });
}

// убираем управляющие символы и лишние пробелы
function clean(value, max) {
  return String(value)
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function parseRsvp(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'body' };
  if (typeof data.name !== 'string') return { error: 'name' };
  const name = clean(data.name, MAX_NAME + 1);
  if (!name || name.length > MAX_NAME) return { error: 'name' };
  if (typeof data.attending !== 'boolean') return { error: 'attending' };

  let guests = 0;
  if (data.attending) {
    guests = data.guests;
    if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) return { error: 'guests' };
  }

  let note = '';
  if (data.note !== undefined && data.note !== null) {
    if (typeof data.note !== 'string') return { error: 'note' };
    note = clean(data.note, MAX_NOTE);
  }
  return { value: { name, attending: data.attending, guests, note } };
}

// В Telegram уходит только суть: кто, придёт ли, сколько человек и комментарий.
export function formatMessage(r) {
  const lines = ['👤 ' + r.name];
  lines.push(r.attending ? '✅ Придёт, человек: ' + r.guests : '❌ Не сможет прийти');
  if (r.note) lines.push('💬 ' + r.note);
  return lines.join('\n');
}

async function sendToTelegram(env, text) {
  const ids = String(env.TELEGRAM_CHAT_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!env.TELEGRAM_BOT_TOKEN || !ids.length) return { configured: false, sent: 0 };

  const results = await Promise.all(ids.map(async (chatId) => {
    try {
      const res = await fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, link_preview_options: { is_disabled: true } }),
        signal: AbortSignal.timeout(8000)
      });
      if (!res.ok) console.warn('telegram sendMessage failed, status', res.status);   // токен в лог не попадает
      return res.ok;
    } catch (e) {
      console.warn('telegram sendMessage error', e && e.name);
      return false;
    }
  }));
  return { configured: true, sent: results.filter(Boolean).length };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
      return reply({ ok: true, service: 'keylin-rsvp', configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_IDS) }, 200);
    }
    if (url.pathname !== '/rsvp') return reply({ ok: false, error: 'not_found' }, 404);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return reply({ ok: false, error: 'method_not_allowed' }, 405, cors);

    // ответы принимаем только с нашего сайта
    if (!origin || !allowedOrigins(env).includes(origin)) return reply({ ok: false, error: 'forbidden' }, 403);

    if (env.RSVP_LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      const { success } = await env.RSVP_LIMITER.limit({ key: ip });
      if (!success) return reply({ ok: false, error: 'rate_limited' }, 429, cors);
    }

    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BODY_BYTES) return reply({ ok: false, error: 'too_large' }, 413, cors);
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return reply({ ok: false, error: 'too_large' }, 413, cors);

    let data;
    try { data = JSON.parse(raw); } catch (e) { return reply({ ok: false, error: 'bad_json' }, 400, cors); }
    const parsed = parseRsvp(data);
    if (parsed.error) return reply({ ok: false, error: 'invalid_' + parsed.error }, 400, cors);

    const sent = await sendToTelegram(env, formatMessage(parsed.value));
    if (!sent.configured) return reply({ ok: false, error: 'not_configured' }, 503, cors);
    if (sent.sent === 0) return reply({ ok: false, error: 'telegram_failed' }, 502, cors);
    return reply({ ok: true }, 200, cors);
  }
};
