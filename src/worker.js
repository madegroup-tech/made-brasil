// Worker do formulário de contato. Só /api/* passa por aqui (ver run_worker_first em wrangler.jsonc);
// o resto do site é servido direto como arquivo estático.

const MAX = { nome: 120, empresa: 120, email: 254, whatsapp: 40, modo: 60, segmento: 80, msg: 4000 };
const REQUIRED = ['nome', 'empresa', 'email'];
const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Impede quebra de cabeçalho/assunto com quebras de linha.
const oneLine = (s) => s.replace(/[\r\n]+/g, ' ').trim();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/contato') return json({ error: 'not_found' }, 404);
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

    // Só aceita envio vindo do próprio site.
    const origin = request.headers.get('Origin');
    if (origin && new URL(origin).host !== url.host) return json({ error: 'forbidden' }, 403);

    let raw;
    try {
      raw = await request.json();
    } catch {
      return json({ error: 'invalid_json' }, 400);
    }
    if (!raw || typeof raw !== 'object') return json({ error: 'invalid_json' }, 400);

    // Honeypot: robôs preenchem; responde "ok" sem enviar nada.
    if (typeof raw.website === 'string' && raw.website.trim() !== '') return json({ ok: true });

    const data = {};
    for (const key of Object.keys(MAX)) {
      const v = raw[key];
      data[key] = typeof v === 'string' ? v.trim() : '';
    }

    const fields = [];
    for (const key of REQUIRED) if (!data[key]) fields.push(key);
    for (const [key, max] of Object.entries(MAX)) if (data[key].length > max && !fields.includes(key)) fields.push(key);
    if (data.email && !EMAIL_RE.test(data.email) && !fields.includes('email')) fields.push('email');
    if (fields.length) return json({ error: 'validation', fields }, 400);

    if (!env.RESEND_API_KEY || !env.MAIL_TO || !env.MAIL_FROM) {
      console.error('Configuração ausente: RESEND_API_KEY, MAIL_TO ou MAIL_FROM');
      return json({ error: 'server_config' }, 500);
    }

    const rows = [
      ['Nome', data.nome],
      ['Empresa', data.empresa],
      ['E-mail', data.email],
      ['WhatsApp / telefone', data.whatsapp || '—'],
      ['Como quer trabalhar com a Made', data.modo || '—'],
      ['Segmento', data.segmento || '—'],
    ];
    const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nDesafio:\n${data.msg || '—'}\n`;
    const html =
      `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1e1e1e">` +
      `<table cellpadding="6" style="border-collapse:collapse">` +
      rows.map(([k, v]) => `<tr><td style="color:#5f5856;vertical-align:top"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('') +
      `</table><p style="margin-top:16px"><b>Desafio</b></p><p style="white-space:pre-wrap">${esc(data.msg || '—')}</p>` +
      `<p style="color:#8a8280;font-size:12px;margin-top:24px">Enviado pelo formulário de madegroup.com.br. Responda este e-mail para falar direto com o contato.</p></div>`;

    let res;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: env.MAIL_TO.split(',').map((s) => s.trim()).filter(Boolean),
          reply_to: data.email,
          subject: oneLine(`Contato pelo site: ${data.nome} · ${data.empresa}`),
          html,
          text,
        }),
      });
    } catch (err) {
      console.error('Falha de rede ao chamar o Resend', err);
      return json({ error: 'send_failed' }, 502);
    }

    if (!res.ok) {
      console.error('Resend recusou o envio', res.status, await res.text());
      return json({ error: 'send_failed' }, 502);
    }
    return json({ ok: true });
  },
};
