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
    if (i < period - 1) {
      out.push(null);
    } else {
      s = 0;
      for (j = i - period + 1; j <= i; j++) s += closes[j];
      out.push(s / period);
    }
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

function desenhaVelas(cv, velas, ma9, ma21, ma50, ma200) {
  var ctx = cv.getContext('2d');
  var w = cv.width, h = cv.height;
  var padL = 8, padR = 8, padT = 10, padB = 10;
  var cw = w - padL - padR, ch = h - padT - padB;
  var n = velas.length;
  var i, lo = velas[0].l, hi = velas[0].h;

  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, w, h);
  if (!n) return;

  for (i = 0; i < n; i++) {
    if (velas[i].l < lo) lo = velas[i].l;
    if (velas[i].h > hi) hi = velas[i].h;
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

  ctx.strokeStyle = '#1c1c1c';
  ctx.lineWidth = 1;
  for (i = 1; i <= 3; i++) {
    var gy = padT + ch * (i / 4);
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
    var yH = yOf(v.h, lo, hi, padT, ch);
    var yL = yOf(v.l, lo, hi, padT, ch);
    var yO = yOf(v.o, lo, hi, padT, ch);
    var yC = yOf(v.c, lo, hi, padT, ch);
    var up = v.c >= v.o;
    var col = up ? '#2ecc71' : '#e74c3c';
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, yH);
    ctx.lineTo(x, yL);
    ctx.stroke();
    var top = Math.min(yO, yC);
    var bot = Math.max(yO, yC);
    if (bot - top < 1) bot = top + 1;
    ctx.fillStyle = col;
    ctx.fillRect(x - bodyW / 2, top, bodyW, bot - top);
  }

  function linha(arr, color, thick) {
    var started = false;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = thick;
    for (i = 0; i < n; i++) {
      if (arr[i] === null) { started = false; continue; }
      var x = padL + slot * i + slot / 2;
      var y = yOf(arr[i], lo, hi, padT, ch);
      if (!started) { ctx.moveTo(x, y); started = true; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  linha(ma9, '#f1c40f', 2);
  linha(ma21, '#e74c3c', 2);
  linha(ma50, '#3498db', 2);
  linha(ma200, '#ffffff', 2);
}

function iniciarQuadro(cfg) {
  var titulo = document.getElementById('titulo');
  var preco = document.getElementById('preco');
  var sub = document.getElementById('sub');
  var hora = document.getElementById('hora');
  var cv = document.getElementById('c');

  titulo.innerHTML = 'EDITRADER · ' + cfg.label;

  function tamanho() {
    var wrap = document.getElementById('canvaswrap');
    var rw = wrap.clientWidth || 980;
    var rh = wrap.clientHeight || 420;
    cv.width = Math.max(320, rw);
    cv.height = Math.max(200, rh);
  }

  function atualiza() {
    hora.innerHTML = horaAgora();
    var url = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=' +
      encodeURIComponent(cfg.interval) + '&limit=' + cfg.limit;
    getJSON(url, function (k) {
      if (!k || !k.length) return;
      var velas = [], closes = [], i;
      for (i = 0; i < k.length; i++) {
        var o = parseFloat(k[i][1]);
        var h = parseFloat(k[i][2]);
        var l = parseFloat(k[i][3]);
        var c = parseFloat(k[i][4]);
        velas.push({ o: o, h: h, l: l, c: c });
        closes.push(c);
      }
      var vis = cfg.visivel;
      if (vis > velas.length) vis = velas.length;
      var start = velas.length - vis;
      var vShow = velas.slice(start);
      var m9 = sma(closes, 9).slice(start);
      var m21 = sma(closes, 21).slice(start);
      var m50 = sma(closes, 50).slice(start);
      var m200 = sma(closes, 200).slice(start);

      var last = closes[closes.length - 1];
      var first = vShow[0].c;
      preco.innerHTML = 'US$ ' + brlInt(last);
      preco.style.color = last >= first ? '#2ecc71' : '#e74c3c';
      var d = last - first;
      var pct = (d / first) * 100;
      sub.style.color = d >= 0 ? '#2ecc71' : '#e74c3c';
      sub.innerHTML = (d >= 0 ? '+' : '') + pct.toFixed(2) + '% nesta tela · ' + cfg.label;

      tamanho();
      desenhaVelas(cv, vShow, m9, m21, m50, m200);
    });
  }

  tamanho();
  atualiza();
  setInterval(atualiza, cfg.refresh || 30000);
}
