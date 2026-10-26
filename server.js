'use strict';

const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const products = require('./products.json');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const productById = new Map(products.map(p => [p.id, p]));

app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

function cents(value) { return Math.round((Number(value) + Number.EPSILON) * 100); }
function jsonError(res, status, error) { return res.status(status).json({ error }); }

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, paymentConfigured: Boolean(MP_ACCESS_TOKEN), publicUrlConfigured: Boolean(PUBLIC_BASE_URL) });
});

app.post('/api/create-preference', async (req, res) => {
  if (!MP_ACCESS_TOKEN) return jsonError(res, 503, 'O backend ainda não tem MP_ACCESS_TOKEN configurado.');
  if (!PUBLIC_BASE_URL || !/^https:\/\//i.test(PUBLIC_BASE_URL)) {
    return jsonError(res, 503, 'Configure PUBLIC_BASE_URL com a URL HTTPS pública deste backend.');
  }

  const body = req.body || {};
  const nick = typeof body.nick === 'string' ? body.nick.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const platform = body.platform;
  const coupon = typeof body.coupon === 'string' ? body.coupon.trim().toUpperCase() : '';
  const items = body.items;

  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(nick)) return jsonError(res, 400, 'Nickname inválido.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError(res, 400, 'E-mail inválido.');
  if (!['Java', 'Bedrock'].includes(platform)) return jsonError(res, 400, 'Plataforma inválida.');
  if (!Array.isArray(items) || items.length < 1 || items.length > 30) return jsonError(res, 400, 'Carrinho inválido.');
  if (coupon && coupon !== 'VOID10') return jsonError(res, 400, 'Cupom inválido.');

  const counts = new Map();
  for (const item of items) {
    const id = Number(item && item.id);
    const qty = Number(item && item.qty);
    if (!Number.isInteger(id) || !productById.has(id) || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      return jsonError(res, 400, 'Um dos produtos ou quantidades do carrinho é inválido.');
    }
    counts.set(id, (counts.get(id) || 0) + qty);
    if (counts.get(id) > 20) return jsonError(res, 400, 'Quantidade máxima por produto: 20.');
  }

  const preferenceItems = [];
  let totalCents = 0;
  for (const [id, quantity] of counts) {
    const product = productById.get(id);
    // O preço vem do catálogo do servidor, nunca do navegador.
    const unitCents = cents(product.price * (coupon === 'VOID10' ? 0.90 : 1));
    if (unitCents < 1) return jsonError(res, 400, 'Preço de produto inválido.');
    totalCents += unitCents * quantity;
    preferenceItems.push({
      id: String(product.id),
      title: product.name.slice(0, 250),
      quantity,
      currency_id: 'BRL',
      unit_price: unitCents / 100
    });
  }
  if (totalCents < 100 || totalCents > 100000000) return jsonError(res, 400, 'O total do pedido está fora dos limites permitidos.');

  const orderReference = `VOID-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const preference = {
    items: preferenceItems,
    payer: { email },
    external_reference: orderReference,
    metadata: { order_reference: orderReference, minecraft_nick: nick, platform, coupon: coupon || 'none' },
    back_urls: {
      success: `${PUBLIC_BASE_URL}/pagamento/sucesso`,
      pending: `${PUBLIC_BASE_URL}/pagamento/pendente`,
      failure: `${PUBLIC_BASE_URL}/pagamento/falha`
    },
    auto_return: 'approved',
    statement_descriptor: 'VOIDMC STORE'
  };

  try {
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(preference),
      signal: AbortSignal.timeout(15000)
    });
    const data = await mpResponse.json().catch(() => ({}));
    if (!mpResponse.ok || !data.init_point) {
      console.error('Mercado Pago preference error:', mpResponse.status, data.message || data.error || 'unknown');
      return jsonError(res, 502, 'O Mercado Pago não conseguiu iniciar o checkout. Verifique a credencial e tente novamente.');
    }
    // Não salvar dados pessoais nem declarar o pedido como pago neste protótipo.
    return res.status(201).json({ checkout_url: data.init_point, order_reference: orderReference });
  } catch (error) {
    console.error('Checkout request failed:', error.name || 'Error');
    return jsonError(res, 502, 'Não foi possível conectar ao Mercado Pago. Tente novamente.');
  }
});

app.get('/pagamento/:status', (req, res) => {
  const messages = {
    sucesso: ['Retorno do Mercado Pago recebido', 'A página de retorno não confirma o pagamento. A loja precisa verificar o status da transação no painel/API antes de entregar itens.'],
    pendente: ['Pagamento pendente', 'O pagamento ainda pode estar em análise. Não considere o pedido pago até confirmar o status oficial.'],
    falha: ['Pagamento não concluído', 'Nenhuma entrega será iniciada. Você pode voltar à loja e tentar novamente.']
  };
  const message = messages[req.params.status];
  if (!message) return res.status(404).send('Página não encontrada.');
  res.type('html').send(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${message[0]} — VoidMC</title><body style="margin:0;background:#0b0715;color:#eee;font:16px system-ui;display:grid;min-height:100vh;place-items:center"><main style="max-width:620px;padding:32px"><h1>${message[0]}</h1><p>${message[1]}</p><a style="color:#c7a4ff" href="/">Voltar para a VoidMC</a></main></body></html>`);
});

app.listen(PORT, () => console.log(`VoidMC backend listening on port ${PORT}`));
