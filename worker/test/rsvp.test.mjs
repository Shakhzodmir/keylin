// Запуск: из папки worker выполнить  node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { parseRsvp, formatMessage } from '../src/index.js';

const ORIGIN = 'https://shakhzodmir.github.io';
const baseEnv = () => ({ TELEGRAM_BOT_TOKEN: '123456:SECRET-TOKEN', TELEGRAM_CHAT_IDS: '-100111, 222', ALLOWED_ORIGINS: ORIGIN });

function post(body, { origin = ORIGIN, headers = {} } = {}) {
  const h = Object.assign({ 'Content-Type': 'application/json' }, headers);
  if (origin) h.Origin = origin;
  return new Request('https://keylin-rsvp.example.workers.dev/rsvp', { method: 'POST', headers: h, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

// подмена fetch к Telegram
async function withTelegram(handler, fn) {
  const real = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    return handler(calls.length - 1, String(url));
  };
  try { return await fn(calls); } finally { globalThis.fetch = real; }
}
const ok = () => new Response('{"ok":true}', { status: 200 });
const fail = () => new Response('{"ok":false}', { status: 400 });

const valid = { name: 'Малика', attending: true, guests: 3, note: 'Принесу цветы', lang: 'ru' };

test('предварительный запрос с нашего сайта разрешён', async () => {
  const res = await worker.fetch(new Request('https://x.dev/rsvp', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), baseEnv());
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
});

test('предварительный запрос с чужого сайта без разрешающих заголовков', async () => {
  const res = await worker.fetch(new Request('https://x.dev/rsvp', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), baseEnv());
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), null);
});

test('верный ответ уходит во все чаты, токен не попадает в ответ', async () => {
  await withTelegram(ok, async (calls) => {
    const res = await worker.fetch(post(valid), baseEnv());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls.map((c) => c.body.chat_id).sort(), ['-100111', '222']);
    assert.ok(calls[0].url.includes('/bot123456:SECRET-TOKEN/sendMessage'));
    assert.ok(calls[0].body.text.includes('Малика'));
    assert.ok(calls[0].body.text.includes('человек: 3'));
    assert.ok(calls[0].body.text.includes('Принесу цветы'));
    assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
  });
});

test('ответ «не смогу»: гостей 0, в тексте нет числа человек', async () => {
  await withTelegram(ok, async (calls) => {
    const res = await worker.fetch(post({ name: 'Аня', attending: false, guests: 5, lang: 'uz' }), baseEnv());
    assert.equal(res.status, 200);
    assert.ok(calls[0].body.text.includes('Не сможет прийти'));
    assert.ok(!calls[0].body.text.includes('человек'));
  });
});

test('чужой сайт и запрос без Origin получают 403 и ничего не отправляют', async () => {
  await withTelegram(ok, async (calls) => {
    assert.equal((await worker.fetch(post(valid, { origin: 'https://evil.example' }), baseEnv())).status, 403);
    assert.equal((await worker.fetch(post(valid, { origin: '' }), baseEnv())).status, 403);
    assert.equal(calls.length, 0);
  });
});

test('плохие данные отклоняются с 400', async () => {
  await withTelegram(ok, async (calls) => {
    const cases = [
      '{не json',
      { attending: true, guests: 1 },
      { name: '   ', attending: true, guests: 1 },
      { name: 'x'.repeat(61), attending: true, guests: 1 },
      { name: 'Аня', attending: 'yes', guests: 1 },
      { name: 'Аня', attending: true, guests: 99 },
      { name: 'Аня', attending: true, guests: 0 },
      { name: 'Аня', attending: true, guests: 1.5 },
      { name: 'Аня', attending: true, guests: 1, note: 123 },
      ['массив']
    ];
    for (const c of cases) {
      const res = await worker.fetch(post(c), baseEnv());
      assert.equal(res.status, 400, JSON.stringify(c));
    }
    assert.equal(calls.length, 0);
  });
});

test('слишком большое тело отклоняется с 413', async () => {
  const res = await worker.fetch(post({ name: 'Аня', attending: true, guests: 1, note: 'я'.repeat(5000) }), baseEnv());
  assert.equal(res.status, 413);
});

test('управляющие символы и лишние пробелы вычищаются', () => {
  const r = parseRsvp({ name: '  Аня\u0000\n  Каримова  ', attending: false, note: 'a' + String.fromCharCode(0x202e) + 'b' });
  assert.equal(r.value.name, 'Аня Каримова');
  assert.equal(r.value.note, 'a b');
});

test('Telegram не настроен: 503', async () => {
  const res = await worker.fetch(post(valid), { ALLOWED_ORIGINS: ORIGIN });
  assert.equal(res.status, 503);
});

test('Telegram отвечает ошибкой везде: 502; хотя бы в один чат дошло: 200', async () => {
  await withTelegram(fail, async () => {
    assert.equal((await worker.fetch(post(valid), baseEnv())).status, 502);
  });
  await withTelegram((i) => (i === 0 ? ok() : fail()), async () => {
    assert.equal((await worker.fetch(post(valid), baseEnv())).status, 200);
  });
});

test('сетевая ошибка при отправке не роняет Worker', async () => {
  await withTelegram(() => { throw new Error('network'); }, async () => {
    assert.equal((await worker.fetch(post(valid), baseEnv())).status, 502);
  });
});

test('ограничение частоты: 429 и ничего не отправлено', async () => {
  await withTelegram(ok, async (calls) => {
    const env = Object.assign(baseEnv(), { RSVP_LIMITER: { limit: async () => ({ success: false }) } });
    assert.equal((await worker.fetch(post(valid), env)).status, 429);
    assert.equal(calls.length, 0);
  });
});

test('проверка здоровья не раскрывает секреты', async () => {
  const res = await worker.fetch(new Request('https://x.dev/health'), baseEnv());
  const text = await res.text();
  assert.equal(JSON.parse(text).configured, true);
  assert.ok(!text.includes('SECRET'));
  const empty = await (await worker.fetch(new Request('https://x.dev/'), {})).json();
  assert.equal(empty.configured, false);
});

test('неизвестный путь и метод', async () => {
  assert.equal((await worker.fetch(new Request('https://x.dev/other', { method: 'POST' }), baseEnv())).status, 404);
  assert.equal((await worker.fetch(new Request('https://x.dev/rsvp', { method: 'GET', headers: { Origin: ORIGIN } }), baseEnv())).status, 405);
});

test('текст сообщения', () => {
  const t = formatMessage({ name: 'Аня', attending: true, guests: 2, note: '', lang: 'uz' });
  assert.equal(t, '💌 Новый ответ на приглашение\n👤 Аня\n✅ Придёт, человек: 2\n🌐 Язык страницы: uz');
});
