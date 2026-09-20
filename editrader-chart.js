/* EdiTrader — canvas + XHR, Safari iOS 9 */
function getJSON(url, ok, fail) {
  var x = new XMLHttpRequest();
  x.open('GET', url, true);
  x.onreadystatechange = function () {
    if (x.readyState !== 4) return;
    if (x.status === 200) {
      try { ok(JSON.parse(x.responseText)); } catch (e) { if (fail) fail(); }
    } else if (fail) fail();
  };
  x.send(null);
}

function sma(closes, period) {
  var out = [], i, j, s;
  for (i = 0; i < closes.length; i++) {
    if (i < period - 1) out.push(null);
    else {
      s = 0;
      for (j = i - period + 1; j <= i; j++) s += closes[j];
      out.push(s / period);
    }
  }
  return out;
}

function rsi(closes, period) {
  var out = [], i;
  for (i = 0; i < closes.length; i++) out.push(null);
  if (closes.length <= period) return out;
  var gain = 0, loss = 0;
  for (i = 1; i <= period; i++) {
    var d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period;
  loss /= period;
  out[period] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (i = period + 1; i < closes.length; i++) {
    var ch = closes[i] - closes[i - 1];
    var g = ch > 0 ? ch : 0;
    var l = ch < 0 ? -ch : 0;
    gain = (gain * (period - 1) + g) / period;
    loss = (loss * (period - 1) + l) / period;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

function brlInt(n) {
  var s = Math.round(n).toString();
  var out = '', i, c = 0;
  for (i = s.length - 1; i >= 0; i--) {
    out = s.charAt(i) + out;
    c++;
    if (c === 3 && i > 0) { out = '.' + out; c = 0; }
  }
  return out;
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }
function horaAgora() {
  var d = new Date();
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}
function yOf(v, min, max, top, h) {
  if (max === min) return top + h / 2;
  return top + (1 - (v - min) / (max - min)) * h;
}

function desenhaTudo(cv, velas, ma9, ma21, ma50, ma200, rsiArr) {
  var ctx = cv.getContext('2d');
  var w = cv.width, h = cv.height;
  var padL = 10, padR = 44, padT = 8;
  var gap = 8;
  var rsiH = Math.floor(h * 0.18);
  var volH = Math.floor(h * 0.12);
  var priceH = h - padT - rsiH - volH - gap * 2 - 8;
  var priceTop = padT;
  var volTop = priceTop + priceH + gap;
  var rsiTop = volTop + volH + gap;
  var cw = w - padL - padR;
  var n = velas.length, i;

  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, h);
  if (!n) return;

  var lo = velas[0].l, hi = velas[0].h, vmax = velas[0].v || 1;
  for (i = 0; i < n; i++) {
    if (velas[i].l < lo) lo = velas[i].l;
    if (velas[i].h > hi) hi = velas[i].h;
    if (velas[i].v > vmax) vmax = velas[i].v;
  }
  function pushM(arr) {
    for (i = 0; i < arr.length; i++) {
      if (arr[i] !== null) {
        if (arr[i] < lo) lo = arr[i];
        if (arr[i] > hi) hi = arr[i];
      }
    }
  }
  pushM(ma9); pushM(ma21); pushM(ma50); pushM(ma200);
  if (hi === lo) hi = lo + 1;
  if (!vmax) vmax = 1;

  ctx.strokeStyle = '#1c1c1c';
  ctx.lineWidth = 1;
  for (i = 1; i <= 3; i++) {
    var gy = priceTop + priceH * (i / 4);
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + cw, gy);
    ctx.stroke();
  }

  var slot = cw / n;
  var bodyW = Math.max(2, slot * 0.62);

  for (i = 0; i < n; i++) {
    var v = velas[i];
    var x = padL + slot * i + slot / 2;
    var yH = yOf(v.h, lo, hi, priceTop, priceH);
    var yL = yOf(v.l, lo, hi, priceTop, priceH);
    var yO = yOf(v.o, lo, hi, priceTop, priceH);
    var yC = yOf(v.c, lo, hi, priceTop, priceH);
    var up = v.c >= v.o;
    var col = up ? '#2ecc71' : '#e74c3c';
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(x, yH);
    ctx.lineTo(x, yL);
    ctx.stroke();
    var top = Math.min(yO, yC);
    var bot = Math.max(yO, yC);
    if (bot - top < 1) bot = top + 1;
    ctx.fillStyle = col;
    ctx.fillRect(x - bodyW / 2, top, bodyW, bot - top);

    var vh = (v.v / vmax) * volH;
    ctx.fillStyle = up ? 'rgba(46,204,113,0.45)' : 'rgba(231,76,60,0.45)';
    ctx.fillRect(x - bodyW / 2, volTop + volH - vh, bodyW, vh);
  }

  function linha(arr, color, thick, top, hh, mn, mx) {
    var started = false;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    for (i = 0; i < n; i++) {
      if (arr[i] === null) { started = false; continue; }
      var x = padL + slot * i + slot / 2;
      var y = yOf(arr[i], mn, mx, top, hh);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  linha(ma9, '#f1c40f', 2, priceTop, priceH, lo, hi);
  linha(ma21, '#e74c3c', 2, priceTop, priceH, lo, hi);
  linha(ma50, '#3498db', 2, priceTop, priceH, lo, hi);
  linha(ma200, '#ffffff', 2, priceTop, priceH, lo, hi);

  ctx.strokeStyle = '#1c1c1c';
  ctx.beginPath();
  ctx.moveTo(padL, rsiTop + rsiH * 0.3);
  ctx.lineTo(padL + cw, rsiTop + rsiH * 0.3);
  ctx.moveTo(padL, rsiTop + rsiH * 0.7);
  ctx.lineTo(padL + cw, rsiTop + rsiH * 0.7);
  ctx.stroke();
  ctx.fillStyle = 'rgba(231,76,60,0.08)';
  ctx.fillRect(padL, rsiTop, cw, rsiH * 0.3);
  ctx.fillStyle = 'rgba(46,204,113,0.08)';
  ctx.fillRect(padL, rsiTop + rsiH * 0.7, cw, rsiH * 0.3);

  linha(rsiArr, '#b388ff', 2, rsiTop, rsiH, 0, 100);

  ctx.fillStyle = '#555';
  ctx.font = '11px Helvetica';
  ctx.fillText('70', padL + cw + 4, rsiTop + rsiH * 0.3 + 3);
  ctx.fillText('30', padL + cw + 4, rsiTop + rsiH * 0.7 + 3);
  ctx.fillText('RSI', padL + 2, rsiTop + 12);
  ctx.fillText('VOL', padL + 2, volTop + 12);
}

function iniciarQuadro(cfg) {
  var titulo = document.getElementById('titulo');
  var preco = document.getElementById('preco');
  var sub = document.getElementById('sub');
  var hora = document.getElementById('hora');
  var extra = document.getElementById('extra');
  var cv = document.getElementById('c');

  titulo.innerHTML = 'EDITRADER · ' + cfg.label;

  function tamanho() {
    var wrap = document.getElementById('canvaswrap');
    cv.width = Math.max(320, wrap.clientWidth || 980);
    cv.height = Math.max(240, wrap.clientHeight || 420);
  }

  function atualiza() {
    hora.innerHTML = horaAgora();
    var url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=' +
      encodeURIComponent(cfg.interval) + '&limit=' + cfg.limit;
    getJSON(url, function (k) {
      if (!k || !k.length) return;
      var velas = [], closes = [], i;
      for (i = 0; i < k.length; i++) {
        velas.push({
          o: parseFloat(k[i][1]),
          h: parseFloat(k[i][2]),
          l: parseFloat(k[i][3]),
          c: parseFloat(k[i][4]),
          v: parseFloat(k[i][5])
        });
        closes.push(parseFloat(k[i][4]));
      }
      var vis = cfg.visivel;
      if (vis > velas.length) vis = velas.length;
      var start = velas.length - vis;
      var vShow = velas.slice(start);
      var m9 = sma(closes, 9).slice(start);
      var m21 = sma(closes, 21).slice(start);
      var m50 = sma(closes, 50).slice(start);
      var m200 = sma(closes, 200).slice(start);
      var r = rsi(closes, 14).slice(start);

      var last = closes[closes.length - 1];
      var first = vShow[0].c;
      preco.innerHTML = 'US$ ' + brlInt(last);
      preco.style.color = last >= first ? '#2ecc71' : '#e74c3c';
      var d = last - first;
      var pct = (d / first) * 100;
      sub.style.color = d >= 0 ? '#2ecc71' : '#e74c3c';
      sub.innerHTML = (d >= 0 ? '+' : '') + pct.toFixed(2) + '% · ' + cfg.label;

      var lastR = r[r.length - 1];
      var last200 = m200[m200.length - 1];
      var bits = [];
      if (lastR !== null) bits.push('RSI 14  ' + lastR.toFixed(1));
      if (last200 !== null) {
        var dist = ((last - last200) / last200) * 100;
        bits.push('vs M200  ' + (dist >= 0 ? '+' : '') + dist.toFixed(1) + '%');
      }
      if (extra) extra.innerHTML = bits.join('   ·   ');

      var body = document.body;
      body.className = d >= 0 ? 'alta' : 'baixa';

      tamanho();
      desenhaTudo(cv, vShow, m9, m21, m50, m200, r);
    });
  }

  tamanho();
  atualiza();
  setInterval(atualiza, cfg.refresh || 30000);
}
