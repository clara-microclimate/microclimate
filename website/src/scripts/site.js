(function(){
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- language ----------
     每種語言有自己的網址（/ 與 /en/），語言按鈕是一般連結，由伺服器端決定內容 */
  var isHome = document.body.dataset.page === 'home';

  /* ---------- big headings: split into characters (entrance ink-in + push-apart on hover) ---------- */
  // 把文字拆成單字：英文單字包成不換行的一組，空白保留，中文逐字拆開
  function splitChars(el, animated){
    var full = Array.from(el.childNodes).map(function(n){ return n.nodeName === 'BR' ? ' ' : n.textContent; }).join('').replace(/\s+/g, ' ').trim();
    var idx = 0;
    function wrapChar(c){
      var inner = document.createElement('span');
      inner.className = 'chi'; inner.textContent = c;
      if (!animated) return inner;
      var outer = document.createElement('span');
      outer.className = 'ch'; outer.style.setProperty('--i', idx++);
      outer.appendChild(inner);
      return outer;
    }
    function walk(node, parent){
      Array.from(node.childNodes).forEach(function(n){
        if (n.nodeType === 3){
          var frag = document.createDocumentFragment();
          (n.textContent.match(/\s+|[A-Za-z0-9'’.,\-]+|[\s\S]/g) || []).forEach(function(tok){
            if (/^\s+$/.test(tok)){ frag.appendChild(document.createTextNode(' ')); return; }
            if (tok.length > 1){
              var w = document.createElement('span'); w.className = 'w';
              Array.from(tok).forEach(function(c){ w.appendChild(wrapChar(c)); });
              frag.appendChild(w);
            } else frag.appendChild(wrapChar(tok));
          });
          parent.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR'){
          walk(n, n);
        }
      });
    }
    walk(el, el);
    Array.from(el.children).forEach(function(c){ if (c.tagName !== 'BR') c.setAttribute('aria-hidden','true'); });
    el.querySelectorAll('br').forEach(function(b){ b.setAttribute('aria-hidden','true'); });
    var sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = full;
    el.appendChild(sr);
  }
  document.querySelectorAll('.brand').forEach(function(h){ splitChars(h, true); });
  document.querySelectorAll('.closing-line').forEach(function(h){ splitChars(h, false); });

  // 滑過大標題時，游標附近的字被「擠開」，帶一點旋轉，離開後像彈簧一樣回位
  (function(){
    if (reduceMotion) return;
    var heads = Array.from(document.querySelectorAll('.brand, .closing-line')).map(function(el){
      return { el: el, chars: [], active: false, running: false, mx: -1e4, my: -1e4 };
    });
    function measure(h){
      var hr = h.el.getBoundingClientRect();
      h.fs = parseFloat(getComputedStyle(h.el).fontSize) || 60;
      h.chars = Array.from(h.el.querySelectorAll('.chi')).map(function(c){
        var o = c._p || { x:0, y:0, r:0, vx:0, vy:0, vr:0 };
        var r = c.getBoundingClientRect();
        // 記錄「未位移時」相對於標題左上角的字中心
        return { el: c, p: o,
                 cx: r.left + r.width/2 - hr.left - o.x,
                 cy: r.top + r.height/2 - hr.top - o.y };
      });
      h.chars.forEach(function(c){ c.el._p = c.p; });
    }
    function step(h){
      // 擠開：游標兩側的字整排往外讓開（同一行影響最大），越遠讓得越少，
      // 位移變化很平緩，所以相鄰的字不會疊在一起；最靠近的字再帶一點旋轉與浮動
      var PUSH = h.fs*0.26, W0 = h.fs*0.7, T = h.fs*4, moving = false;
      var hr = h.el.getBoundingClientRect();
      var px = h.mx - hr.left, py = h.my - hr.top;
      function sm(f){ f = Math.max(0, Math.min(1, f)); return f*f*(3 - 2*f); }
      h.chars.forEach(function(c){
        var dx = c.cx - px, dy = c.cy - py, adx = Math.abs(dx), d = Math.sqrt(dx*dx + dy*dy) || 1;
        var on = h.active ? 1 : 0;
        var row = sm(1 - Math.abs(dy)/(h.fs*1.15));          // 同一行 = 1，上下行漸弱
        var spread = adx < W0 ? 1 : sm(1 - (adx - W0)/T);   // 兩側整排讓開，遠處漸弱
        var near = sm(1 - d/(h.fs*1.3));                     // 緊貼游標的字
        var tx = on*(dx < 0 ? -1 : 1)*PUSH*spread*row;
        var ty = on*(dy/d)*near*h.fs*0.16;
        var tr = on*(dx < 0 ? -1 : 1)*near*9;
        var p = c.p;
        p.vx = (p.vx + (tx - p.x)*0.16)*0.74;
        p.vy = (p.vy + (ty - p.y)*0.16)*0.74;
        p.vr = (p.vr + (tr - p.r)*0.16)*0.74;
        p.x += p.vx; p.y += p.vy; p.r += p.vr;
        if (Math.abs(p.x) > 0.05 || Math.abs(p.y) > 0.05 || Math.abs(p.vx) > 0.05 || Math.abs(p.vy) > 0.05 || Math.abs(p.r) > 0.05) moving = true;
        else { p.x = p.y = p.r = p.vx = p.vy = p.vr = 0; }
        c.el.style.transform = (p.x || p.y || p.r)
          ? 'translate(' + p.x.toFixed(2) + 'px,' + p.y.toFixed(2) + 'px) rotate(' + p.r.toFixed(2) + 'deg)'
          : '';
      });
      if (moving || h.active) requestAnimationFrame(function(){ step(h); });
      else h.running = false;
    }
    function onMove(x, y){
      heads.forEach(function(h){
        if (!h.el.offsetParent) { h.active = false; return; }   // 被語言切換隱藏的那一個
        var r = h.el.getBoundingClientRect();
        var pad = (h.fs || 60)*1.6;
        var inside = x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;
        h.mx = x; h.my = y;
        if (inside && !h.active){ measure(h); }
        h.active = inside;
        if (inside && !h.running){ h.running = true; requestAnimationFrame(function(){ step(h); }); }
      });
    }
    addEventListener('pointermove', function(e){ onMove(e.clientX, e.clientY); }, {passive:true});
    document.addEventListener('pointerleave', function(){ heads.forEach(function(h){ h.active = false; }); });
    addEventListener('touchend', function(){ heads.forEach(function(h){ h.active = false; }); }, {passive:true});
  })();

  /* ---------- scroll reveal ---------- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if (e.isIntersecting){ e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, {threshold:0.12, rootMargin:'0px 0px -8% 0px'});
    items.forEach(function(el, i){
      el.style.transitionDelay = Math.min(i%6,5)*0.05 + 's';
      io.observe(el);
    });
  } else {
    items.forEach(function(el){ el.classList.add('in-view'); });
  }

  /* ---------- scroll progress ---------- */
  var bar = document.getElementById('progress');
  var ticking = false;
  // 頁面可捲動高度只在尺寸改變時量一次，避免每一幀讀 scrollHeight 造成強制重排
  var pageMax = 0;
  function measurePage(){ pageMax = document.documentElement.scrollHeight - innerHeight; }
  function updateBar(){
    bar.style.transform = 'scaleX(' + (pageMax > 0 ? Math.min(1, scrollY / pageMax) : 0) + ')';
    ticking = false;
  }
  addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(updateBar); } }, {passive:true});
  addEventListener('resize', function(){ measurePage(); updateBar(); });
  if ('ResizeObserver' in window) new ResizeObserver(function(){ measurePage(); updateBar(); }).observe(document.body);
  requestAnimationFrame(function(){ measurePage(); updateBar(); });

  /* ---------- day / night with ink-spread transition ---------- */
  var themeMeta = document.getElementById('themeColor');
  var inking = false;
  function syncThemeBtns(){
    var dark = root.dataset.theme === 'dark';
    document.querySelectorAll('.js-theme').forEach(function(b){ b.setAttribute('aria-pressed', dark ? 'true' : 'false'); });
  }
  syncThemeBtns();
  function applyTheme(t){
    root.dataset.theme = t;
    themeMeta.content = t === 'dark' ? '#15140F' : '#F6F3EA';
    try{ localStorage.setItem('mc-theme', t); }catch(e){}
    syncThemeBtns();
    window.dispatchEvent(new Event('mc-theme'));
  }
  function inkTransition(next, ox, oy){
    if (reduceMotion){ applyTheme(next); return; }
    inking = true;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var c = document.createElement('canvas');
    c.className = 'theme-ink'; c.setAttribute('aria-hidden','true');
    c.width = Math.ceil(innerWidth*dpr); c.height = Math.ceil(innerHeight*dpr);
    c.style.width = '100%'; c.style.height = '100%';
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    var x = ox*dpr, y = oy*dpr;
    var maxR = Math.hypot(Math.max(x, c.width - x), Math.max(y, c.height - y))*1.18;
    var color = next === 'dark' ? '#15140F' : '#F6F3EA';
    var s1 = Math.random()*6.28, s2 = Math.random()*6.28, s3 = Math.random()*6.28;
    var drops = [];
    for (var i = 0; i < 16; i++){
      drops.push({ a: Math.random()*6.28, d: 0.12 + Math.random()*0.5,
                   r: (4 + Math.random()*16)*dpr, t: Math.random()*0.4 });
    }
    var start = performance.now(), D = 1000;
    function ease(p){ return p < .5 ? 4*p*p*p : 1 - Math.pow(-2*p + 2, 3)/2; }
    (function frame(now){
      var p = Math.min(1, (now - start)/D), e = ease(p), R = e*maxR;
      ctx.clearRect(0,0,c.width,c.height);
      ctx.fillStyle = color;
      // 不規則的墨暈邊緣
      ctx.beginPath();
      for (var a = 0; a <= 6.3; a += 0.035){
        var w = 1 + 0.07*Math.sin(a*5 + s1 + p*4) + 0.045*Math.sin(a*11 + s2 - p*3) + 0.025*Math.sin(a*23 + s3);
        var px = x + Math.cos(a)*R*w, py = y + Math.sin(a)*R*w;
        a === 0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
      }
      ctx.closePath(); ctx.fill();
      // 濺出的墨點
      for (var j = 0; j < drops.length; j++){
        var dr = drops[j];
        if (e < dr.t) continue;
        var k = Math.min(1, (e - dr.t)/0.3);
        var dist = R*(1 + dr.d*0.35) + dr.r*2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(dr.a)*dist, y + Math.sin(dr.a)*dist, dr.r*k, 0, 6.2832);
        ctx.fill();
      }
      if (p < 1) requestAnimationFrame(frame);
      else {
        applyTheme(next);
        requestAnimationFrame(function(){ c.style.opacity = '0'; });
        setTimeout(function(){ c.remove(); inking = false; }, 560);
      }
    })(start);
  }
  document.querySelectorAll('.js-theme').forEach(function(btn){
    btn.addEventListener('click', function(e){
      if (inking) return;
      var r = btn.getBoundingClientRect();
      var ox = e.clientX || (r.left + r.width/2), oy = e.clientY || (r.top + r.height/2);
      inkTransition(root.dataset.theme === 'dark' ? 'light' : 'dark', ox, oy);
    });
  });

  /* ---------- logo: replay the draw animation and go back to top ---------- */
  var navLogo = document.getElementById('navLogo');
  document.querySelector('.nav-mark').addEventListener('click', function(e){
    if (!isHome) return;   // 其他頁面：照連結回首頁
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) closeMenu(false);
    navLogo.classList.remove('play');
    void navLogo.getBoundingClientRect();   // 強制重排，讓動畫能重新播放
    navLogo.classList.add('play');
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });

  /* ---------- ambient music: soft, slow pad + sparse bell notes, synthesized live (no audio file) ---------- */
  var Ambience = (function(){
    var AC = window.AudioContext || window.webkitAudioContext;
    var ac, master, fade, padBus, bellBus, timer = null, on = false, vol = 0.3;
    var nextChordT = 0, nextNoteT = 0, chordIdx = 0;
    var GAIN = 3.2;                              // 實測校正：預設 30% 約 -40 dBFS，100% 時峰值約 -12 dBFS，不會破音
    function curve(v){ return GAIN*Math.pow(v, 1.4); }
    function hz(m){ return 440*Math.pow(2, (m - 69)/12); }

    // D 大調五聲音階，和弦慢慢輪替：Dmaj9 → Bm11 → Gmaj9 → Asus
    var CHORDS = [
      [50, 57, 61, 64, 66],
      [47, 54, 57, 62, 64],
      [43, 50, 54, 59, 62],
      [45, 52, 57, 59, 64]
    ];
    var SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81];   // D E F# A B 兩個八度
    var CHORD_LEN = 9;                                  // 每個和弦停留約 9 秒

    // 用衰減雜訊產生殘響的脈衝響應，讓聲音有溫暖的空間感
    function impulse(sec){
      var len = Math.floor(ac.sampleRate*sec), buf = ac.createBuffer(2, len, ac.sampleRate);
      for (var ch = 0; ch < 2; ch++){
        var d = buf.getChannelData(ch);
        for (var i = 0; i < len; i++) d[i] = (Math.random()*2 - 1)*Math.pow(1 - i/len, 3.2);
      }
      return buf;
    }
    function init(){
      ac = new AC();
      master = ac.createGain(); master.gain.value = curve(vol);
      fade = ac.createGain(); fade.gain.value = 0;
      var verb = ac.createConvolver(); verb.buffer = impulse(4.5);
      var wet = ac.createGain(); wet.gain.value = 0.55;
      var dry = ac.createGain(); dry.gain.value = 0.7;
      var tone = ac.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3200;  // 收掉刺耳高頻
      padBus = ac.createGain(); padBus.gain.value = 0.11;
      bellBus = ac.createGain(); bellBus.gain.value = 0.09;
      [padBus, bellBus].forEach(function(b){ b.connect(dry); b.connect(verb); });
      verb.connect(wet);
      dry.connect(tone); wet.connect(tone);
      tone.connect(fade); fade.connect(master); master.connect(ac.destination);
    }

    // 柔和的和弦鋪底：每個音由兩個略微走音的振盪器組成，慢慢淡入淡出
    function pad(t, chord){
      var dur = CHORD_LEN + 4;                     // 和弦之間互相重疊，銜接平順
      chord.forEach(function(m, i){
        var lp = ac.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.linearRampToValueAtTime(1100, t + dur*0.5);
        lp.frequency.linearRampToValueAtTime(600, t + dur);
        var g = ac.createGain();
        var peak = (i === 0 ? 0.32 : 0.22)/chord.length*3;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(peak, t + 3.5);
        g.gain.setValueAtTime(peak, t + dur - 4.5);
        g.gain.linearRampToValueAtTime(0, t + dur);
        lp.connect(g);
        if (ac.createStereoPanner){
          var p = ac.createStereoPanner(); p.pan.value = (i/(chord.length - 1) - .5)*0.6;
          g.connect(p); p.connect(padBus);
        } else g.connect(padBus);
        [-4, 4].forEach(function(det, k){
          var o = ac.createOscillator();
          o.type = k ? 'triangle' : 'sine';
          o.frequency.value = hz(m); o.detune.value = det;
          var og = ac.createGain(); og.gain.value = k ? 0.35 : 1;
          o.connect(og); og.connect(lp);
          o.start(t); o.stop(t + dur + 0.1);
        });
      });
    }

    // 偶爾落下的柔和鋼琴音，像水滴落進墨裡
    function bell(t, m){
      var g = ac.createGain();
      var a = 0.5 + Math.random()*0.35, dec = 3 + Math.random()*1.5;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(a, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec);
      if (ac.createStereoPanner){
        var p = ac.createStereoPanner(); p.pan.value = (Math.random() - .5)*0.8;
        g.connect(p); p.connect(bellBus);
      } else g.connect(bellBus);
      [[1, 1], [2, 0.22], [3, 0.06]].forEach(function(h){
        var o = ac.createOscillator(); o.type = 'sine';
        o.frequency.value = hz(m)*h[0];
        var og = ac.createGain(); og.gain.value = h[1];
        o.connect(og); og.connect(g);
        o.start(t); o.stop(t + dec + 0.1);
      });
    }

    function schedule(){
      var now = ac.currentTime, ahead = now + 0.6;
      if (nextChordT < now) nextChordT = now + 0.1;
      if (nextNoteT < now) nextNoteT = now + 2.5;
      while (nextChordT < ahead){
        pad(nextChordT, CHORDS[chordIdx % CHORDS.length]);
        chordIdx++; nextChordT += CHORD_LEN;
      }
      while (nextNoteT < ahead){
        // 偏好目前和弦內的音，聽起來更和諧
        var chord = CHORDS[(chordIdx + CHORDS.length - 1) % CHORDS.length];
        var pool = SCALE.filter(function(m){ return chord.some(function(c){ return (m - c) % 12 === 0; }); });
        if (!pool.length || Math.random() < 0.3) pool = SCALE;
        bell(nextNoteT, pool[Math.floor(Math.random()*pool.length)]);
        // 偶爾連續兩個音，形成簡單的小樂句
        if (Math.random() < 0.3) bell(nextNoteT + 0.45, pool[Math.floor(Math.random()*pool.length)]);
        nextNoteT += 2.2 + Math.random()*3.6;
      }
      timer = setTimeout(schedule, 250);
    }
    // sec：淡入秒數；peak：淡入後的音量比例（自動播放時刻意小一點）
    function start(sec, peak){
      if (!AC) return false;
      if (!ac) init();
      ac.resume();
      sec = sec || 3; peak = peak || 1;
      var t = ac.currentTime, from = fade.gain.value;
      fade.gain.cancelScheduledValues(t);
      // 前段很輕、後段才慢慢明顯的漸強曲線，聽感比直線淡入柔和
      var n = 64, cv = new Float32Array(n);
      for (var i = 0; i < n; i++){ var k = i/(n - 1); cv[i] = from + (peak - from)*k*k*k; }
      try { fade.gain.setValueCurveAtTime(cv, t, sec); }
      catch(e){ fade.gain.setValueAtTime(from, t); fade.gain.linearRampToValueAtTime(peak, t + sec); }
      on = true;
      if (!timer) schedule();
      return true;
    }
    function stop(){
      if (!ac) return;
      var t = ac.currentTime;
      fade.gain.cancelScheduledValues(t); fade.gain.setValueAtTime(fade.gain.value, t);
      fade.gain.linearRampToValueAtTime(0, t + 1.5);
      on = false; clearTimeout(timer); timer = null;
      setTimeout(function(){ if (!on){ ac.suspend(); nextChordT = nextNoteT = 0; } }, 1600);
    }
    document.addEventListener('visibilitychange', function(){
      if (!ac || !on) return;
      if (document.hidden){ ac.suspend(); clearTimeout(timer); timer = null; }
      else { ac.resume(); nextChordT = nextNoteT = 0; if (!timer) schedule(); }
    });
    return {
      toggle: function(){ if (on){ stop(); return false; } return start(); },
      start: start,
      isOn: function(){ return on; },
      running: function(){ return !!ac && ac.state === 'running'; },
      setVolume: function(v){
        vol = v;
        if (master) master.gain.setTargetAtTime(curve(v), ac.currentTime, 0.05);
      }
    };
  })();

  var soundBtns = document.querySelectorAll('.js-sound');
  function setPlaying(playing){
    soundBtns.forEach(function(x){ x.setAttribute('aria-pressed', playing ? 'true' : 'false'); });
    root.classList.toggle('sound-on', !!playing);
  }
  // 使用者自己按掉過配樂，就記住，不再自動播放
  var userOff = false;
  try{ userOff = localStorage.getItem('mc-music') === 'off'; }catch(e){}
  soundBtns.forEach(function(b){
    b.addEventListener('click', function(){
      var playing = Ambience.toggle();
      setPlaying(playing);
      disarm(); autoDone = true;
      try{ localStorage.setItem('mc-music', playing ? 'on' : 'off'); }catch(e){}
      if (!playing) userOff = true;
    });
  });

  /* ---------- 往下捲動時自動以 3 秒漸強播放配樂 ----------
     瀏覽器規定：使用者「點過或按過鍵」之後網頁才能發聲，單純捲動不算。
     已互動過 → 捲下去直接漸強；只捲動過 → 底部浮出小提示，輕觸任何地方就開始。 */
  var hint = document.getElementById('musicHint');
  var autoDone = false, armed = false;
  function showHint(){ if (hint){ hint.hidden = false; requestAnimationFrame(function(){ hint.classList.add('show'); }); } }
  function hideHint(){ if (hint){ hint.classList.remove('show'); setTimeout(function(){ hint.hidden = true; }, 500); } }
  function disarm(){
    armed = false; hideHint();
    ['pointerdown','keydown','touchend'].forEach(function(ev){ removeEventListener(ev, onGesture, true); });
  }
  function autoStart(){
    if (autoDone || userOff || Ambience.isOn() && Ambience.running()) return;
    Ambience.start(3, 0.7);
    // 確認聲音真的開始了才算完成；被瀏覽器擋下就繼續等下一次輕觸
    setTimeout(function(){
      if (Ambience.running()){ autoDone = true; setPlaying(true); disarm(); }
      else if (!armed){ armed = true; showHint(); ['pointerdown','keydown','touchend'].forEach(function(ev){ addEventListener(ev, onGesture, true); }); }
    }, 250);
  }
  function onGesture(e){
    if (!armed) return;
    var t = e.target;
    if (t && t.closest && (t.closest('.js-sound') || t.closest('#musicHintClose'))) return;  // 交給按鈕自己處理
    autoStart();
  }
  function onScrollArm(){
    if (autoDone || userOff) { removeEventListener('scroll', onScrollArm); return; }
    if (scrollY < innerHeight*0.35) return;
    removeEventListener('scroll', onScrollArm);
    autoStart();
  }
  addEventListener('scroll', onScrollArm, {passive:true});
  var hintClose = document.getElementById('musicHintClose');
  if (hintClose) hintClose.addEventListener('click', function(){ userOff = true; disarm(); });

  // 音量條（導覽列與側欄同步，記住使用者的設定）
  var vol = 30;
  try{ var sv = parseInt(localStorage.getItem('mc-vol'), 10); if (sv >= 0 && sv <= 100) vol = sv; }catch(e){}
  var vols = document.querySelectorAll('.js-vol');
  var volNum = document.querySelector('.vol-num');
  function paintVol(){
    vols.forEach(function(r){
      r.value = vol;
      r.style.setProperty('--v', vol + '%');
      r.setAttribute('aria-valuetext', vol + '%');
    });
    if (volNum) volNum.textContent = vol;
  }
  paintVol(); Ambience.setVolume(vol/100);
  vols.forEach(function(r){
    r.addEventListener('input', function(){
      vol = +r.value; paintVol(); Ambience.setVolume(vol/100);
      try{ localStorage.setItem('mc-vol', vol); }catch(e){}
    });
  });

  /* ---------- side drawer menu ---------- */
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('scrim');
  var menuBtn = document.getElementById('menuBtn');
  var menuClose = document.getElementById('menuClose');
  // 選單開啟時，背後的頁面暫時不可操作（含讀螢幕軟體）
  var behind = document.querySelectorAll('body > .skip, body > .nav, body > main, body > footer');
  drawer.setAttribute('inert','');
  function openMenu(){
    document.body.classList.add('menu-open');
    drawer.removeAttribute('inert');
    behind.forEach(function(el){ el.setAttribute('inert',''); });
    menuBtn.setAttribute('aria-expanded','true');
    setTimeout(function(){ menuClose.focus(); }, 60);
  }
  function closeMenu(returnFocus){
    document.body.classList.remove('menu-open');
    behind.forEach(function(el){ el.removeAttribute('inert'); });
    drawer.setAttribute('inert','');
    menuBtn.setAttribute('aria-expanded','false');
    if (returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener('click', openMenu);
  menuClose.addEventListener('click', function(){ closeMenu(true); });
  scrim.addEventListener('click', function(){ closeMenu(true); });
  drawer.querySelectorAll('.drawer-nav a').forEach(function(a){
    a.addEventListener('click', function(){ closeMenu(false); });
  });
  document.addEventListener('keydown', function(e){
    if (!document.body.classList.contains('menu-open')) return;
    if (e.key === 'Escape'){ closeMenu(true); return; }
    if (e.key === 'Tab'){
      var f = Array.from(drawer.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])')).filter(function(el){ return el.offsetParent !== null; });
      var first = f[0], last = f[f.length-1];
      if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });
  // 標示目前所在段落
  if ('IntersectionObserver' in window){
    var links = {};
    drawer.querySelectorAll('.drawer-nav a').forEach(function(a){
      if (a.hash && a.pathname === location.pathname) links[a.hash.slice(1)] = a;
    });
    var secIO = new IntersectionObserver(function(es){
      es.forEach(function(en){
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function(k){ links[k].removeAttribute('aria-current'); });
        if (links[en.target.id]) links[en.target.id].setAttribute('aria-current','true');
      });
    }, {rootMargin:'-45% 0px -50% 0px'});
    Object.keys(links).forEach(function(id){ var s = document.getElementById(id); if (s) secIO.observe(s); });
  }

  function onScreen(el, cb){
    if (!('IntersectionObserver' in window)){ cb(true); return; }
    new IntersectionObserver(function(es){ cb(es[0].isIntersecting); }).observe(el);
  }

  /* ---------- page-wide ink weather + ridges that change as you scroll ---------- */
  (function(){
    var cv = document.getElementById('inkSky');
    if (!cv.getContext) return;
    var ctx = cv.getContext('2d');
    var SCALE = 0.2;           // 低解析度畫布放大顯示 = 自然的墨暈
    var W, H;
    var ridges = document.querySelectorAll('.ridge');
    // 每一段落對應一種「天氣」：墨雲的中心、散開程度、濃淡
    var IDS = ['top','philosophy','about','method','products','contact'];
    var STATES = {
      top:        { cx:.72, cy:.42, sx:.42, sy:.50, a:1.00 },  // 首頁：右側聚雲
      philosophy: { cx:.50, cy:.50, sx:1.30, sy:1.25, a:.30 }, // 理念：雲散開，留白
      about:      { cx:.24, cy:.55, sx:.38, sy:.50, a:.85 },   // 關於：飄向左側
      method:     { cx:.50, cy:.78, sx:.80, sy:.20, a:.65 },   // 工作方式：低垂成一帶山嵐
      products:   { cx:.78, cy:.36, sx:.34, sy:.42, a:.90 },   // 產品：聚在右上
      contact:    { cx:.50, cy:.98, sx:.85, sy:.22, a:1.15 }   // 聯絡：沉成一池墨
    };
    var secs = [], centers = [];
    IDS.forEach(function(id){ var s = document.getElementById(id); if (s) secs.push(s); });
    function measure(){
      centers = secs.map(function(s){ var r = s.getBoundingClientRect(); return r.top + scrollY + r.height/2; });
    }
    function resize(){
      W = cv.width = Math.max(1, Math.ceil(innerWidth*SCALE));
      H = cv.height = Math.max(1, Math.ceil(innerHeight*SCALE));
      centers = [];          // 下一幀再量段落位置，不在腳本執行時強制排版
    }

    function g(){ return (Math.random() + Math.random() + Math.random())/1.5 - 1; } // 約略常態分佈 -1..1
    var blobs = [];
    for (var i = 0; i < 20; i++){
      blobs.push({
        ux: g(), uy: g(),
        r: 0.07 + Math.random()*0.16, a: 0.05 + Math.random()*0.09,
        fx: 0.5 + Math.random(), fy: 0.4 + Math.random(), p: Math.random()*6.28,
        warm: i % 4 === 0, ox: 0, oy: 0
      });
    }

    function smooth(f){ return f*f*(3 - 2*f); }
    // 沒有首頁段落的頁面（文章、關於、配色）：固定一種較淡的天氣，不干擾閱讀
    var CALM = { cx:.82, cy:.30, sx:.36, sy:.40, a:.45 };
    function target(){
      if (!secs.length){ var o = {}; for (var k in CALM) o[k] = CALM[k]; o.pos = 0; return o; }
      if (!centers.length) measure();
      var mid = scrollY + innerHeight/2, n = centers.length, i = 0;
      while (i < n - 1 && centers[i + 1] <= mid) i++;
      var f = i < n - 1 ? (mid - centers[i])/(centers[i + 1] - centers[i]) : 0;
      f = smooth(Math.max(0, Math.min(1, f)));
      var A = STATES[secs[i].id], B = STATES[secs[Math.min(i + 1, n - 1)].id], out = {};
      for (var k in A) out[k] = A[k] + (B[k] - A[k])*f;
      out.pos = i + f;                     // 連續的段落位置
      return out;
    }
    var cur = null;

    var mx = -9, my = -9, tmx = -9, tmy = -9, lastY = scrollY, vel = 0;
    addEventListener('pointermove', function(e){ tmx = e.clientX/innerWidth; tmy = e.clientY/innerHeight; }, {passive:true});
    document.addEventListener('mouseleave', function(){ tmx = tmy = -9; });

    function render(t, instant, skipSky){
      var tg = target();
      if (!cur || instant) cur = tg;
      else for (var k in tg) cur[k] += (tg[k] - cur[k])*0.05;

      // 捲動速度：快速捲動時墨雲會被「拖」一下
      vel += ((scrollY - lastY) - vel)*0.15; lastY = scrollY;
      var drag = Math.max(-0.12, Math.min(0.12, vel*0.0015));

      // 理念段落附近整體變淡，讓留白真的留白
      var phi = IDS.indexOf('philosophy');
      var clear = Math.max(0, 1 - Math.abs(cur.pos - phi));

      mx += (tmx - mx)*0.05; my += (tmy - my)*0.05;
      var dark = root.dataset.theme === 'dark';
      // 墨雲移動很慢，每兩幀重繪一次即可，省下一半的繪製與合成成本
      if (!skipSky) ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < blobs.length && !skipSky; i++){
        var b = blobs[i];
        var x = cur.cx + b.ux*cur.sx + Math.sin(t*b.fx + b.p)*0.06 + Math.cos(t*b.fy*0.6 + b.p*2)*0.04;
        var y = cur.cy + b.uy*cur.sy + Math.cos(t*b.fy + b.p)*0.06 + Math.sin(t*b.fx*0.5 + b.p)*0.03 - drag*(0.5 + b.r*3);
        var dx = x - mx, dy = (y - my)*H/W, d = Math.sqrt(dx*dx + dy*dy);
        var push = d < 0.22 ? (0.22 - d)*0.6 : 0;            // 游標像微風輕推墨雲
        b.ox += ((d ? dx/d : 0)*push - b.ox)*0.06;
        b.oy += ((d ? dy/d : 0)*push - b.oy)*0.06;
        var px = (x + b.ox)*W, py = (y + b.oy)*H, pr = b.r*Math.max(W, H)*0.9;
        var al = b.a*cur.a;
        var c = b.warm ? (dark ? '199,157,110' : '140,104,66') : (dark ? '236,230,216' : '32,30,26');
        var gr = ctx.createRadialGradient(px, py, 0, px, py, pr);
        gr.addColorStop(0, 'rgba('+c+','+al+')');
        gr.addColorStop(0.55, 'rgba('+c+','+(al*0.45)+')');
        gr.addColorStop(1, 'rgba('+c+',0)');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.2832); ctx.fill();
      }

      // 山稜：隨捲動一筆一筆畫出，並以不同速度升起（視差）
      var p = pageMax > 0 ? Math.min(1, scrollY/pageMax) : 0;
      var RANGES = [[0.04, 0.45], [0.18, 0.62], [0.32, 0.85]], RISE = [40, 80, 130];
      for (var r = 0; r < ridges.length; r++){
        var q = Math.max(0, Math.min(1, (p - RANGES[r][0])/(RANGES[r][1] - RANGES[r][0])));
        ridges[r].style.strokeDashoffset = (1 - smooth(q)).toFixed(4);
        ridges[r].style.transform = 'translateY(' + ((1 - p)*RISE[r]).toFixed(1) + 'px)';
        ridges[r].style.opacity = (1 - 0.8*clear).toFixed(3);
      }
    }

    resize();
    addEventListener('resize', resize);
    addEventListener('load', function(){ centers = []; });
    addEventListener('mc-lang', function(){ centers = []; });
    if ('ResizeObserver' in window) new ResizeObserver(function(){ centers = []; }).observe(document.body);

    if (reduceMotion){
      // 減少動態：不做持續飄動，只在捲動時更新到對應段落的狀態
      var draw = function(){ render(1.3, true); };
      requestAnimationFrame(draw);
      addEventListener('scroll', function(){ requestAnimationFrame(draw); }, {passive:true});
      addEventListener('mc-theme', draw);
      return;
    }
    var t0 = performance.now();
    var fr = 0;
    requestAnimationFrame(function loop(now){
      render((now - t0)/1000*0.07, false, (fr++ & 1) === 1);
      requestAnimationFrame(loop);
    });
  })();

  /* ---------- philosophy: brush away the veil, it slowly settles back ---------- */
  (function(){
    if (reduceMotion) return;
    var block = document.getElementById('revealBlock');
    var cv = document.getElementById('revealCanvas');
    if (!block || !cv.getContext) return;
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var veil = getComputedStyle(root).getPropertyValue('--bg').trim() || '#F6F3EA';
    var visible = false, last = null, lastInput = 0, auto = 0;
    var coarse = matchMedia('(pointer: coarse)').matches;   // 手機：自動拂墨範圍大一點、快一點

    function fill(alpha){
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = alpha;
      ctx.fillStyle = veil;
      ctx.fillRect(0,0,cv.width,cv.height);
      ctx.globalAlpha = 1;
    }
    function resize(){
      cv.width = Math.max(1, Math.round(cv.clientWidth*dpr));
      cv.height = Math.max(1, Math.round(cv.clientHeight*dpr));
      fill(1); last = null;
    }
    function dab(x, y, r){
      // 不規則的墨點邊緣：一次畫數個略偏移的柔軟圓
      ctx.globalCompositeOperation = 'destination-out';
      for (var k = 0; k < 4; k++){
        var ox = (Math.random()-.5)*r*0.5, oy = (Math.random()-.5)*r*0.5;
        var rr = r*(0.55 + Math.random()*0.45);
        var g = ctx.createRadialGradient(x+ox,y+oy,0,x+ox,y+oy,rr);
        g.addColorStop(0,'rgba(0,0,0,.55)');
        g.addColorStop(0.6,'rgba(0,0,0,.25)');
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x+ox,y+oy,rr,0,6.2832); ctx.fill();
      }
    }
    function stroke(x, y, r){
      if (last){
        var dx = x - last.x, dy = y - last.y, d = Math.sqrt(dx*dx+dy*dy);
        var steps = Math.max(1, Math.ceil(d/(r*0.35)));
        for (var s = 1; s <= steps; s++) dab(last.x + dx*s/steps, last.y + dy*s/steps, r);
      } else dab(x, y, r);
      last = {x:x, y:y};
    }
    function toCanvas(cx, cy){
      var r = cv.getBoundingClientRect();
      return { x:(cx - r.left)*cv.width/r.width, y:(cy - r.top)*cv.height/r.height };
    }
    function input(cx, cy){
      var p = toCanvas(cx, cy);
      stroke(p.x, p.y, 85*dpr);
      lastInput = performance.now();
    }
    block.addEventListener('pointermove', function(e){ input(e.clientX, e.clientY); });
    block.addEventListener('pointerleave', function(){ last = null; });
    block.addEventListener('touchmove', function(e){
      if (e.touches[0]) input(e.touches[0].clientX, e.touches[0].clientY);
    }, {passive:true});

    // ResizeObserver 會在第一次排版後自動呼叫 resize，不必在腳本執行時強制排版
    if (!('ResizeObserver' in window)) resize();
    window.addEventListener('mc-theme', function(){
      veil = getComputedStyle(root).getPropertyValue('--bg').trim();
      fill(1); last = null;
    });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(block);
    else addEventListener('resize', resize);
    onScreen(block, function(v){ visible = v; });

    (function loop(now){
      if (visible){
        fill(0.0016);              // 墨色緩緩回到留白
        // 沒有人互動時（手機、鍵盤使用者），讓一支「看不見的筆」自己慢慢拂過
        if (now - lastInput > 2600){
          if (auto === 0) last = null;
          auto += coarse ? 0.012 : 0.008;
          var x = cv.width*(0.5 + 0.42*Math.sin(auto*1.3));
          var y = cv.height*(0.5 + 0.34*Math.sin(auto*2.1 + 0.7));
          stroke(x, y, (coarse ? 78 : 60)*dpr);
        } else auto = 0;
      }
      requestAnimationFrame(loop);
    })(performance.now());
  })();

  /* ---------- ink-drop cursor (mouse / trackpad only) ---------- */
  (function(){
    if (reduceMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    var cv = document.createElement('canvas');
    cv.className = 'ink-cursor'; cv.setAttribute('aria-hidden','true');
    document.body.appendChild(cv);
    var ctx = cv.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize(){ cv.width = innerWidth*dpr; cv.height = innerHeight*dpr; }
    resize(); addEventListener('resize', resize);

    var ink, accent;
    function colors(){
      var cs = getComputedStyle(root);
      ink = cs.getPropertyValue('--ink').trim(); accent = cs.getPropertyValue('--accent').trim();
    }
    colors(); addEventListener('mc-theme', colors);

    var x = -100, y = -100, tx = -100, ty = -100, px = -100, py = -100;
    var shown = false, hover = false, down = false, rad = 6, ring = 0;
    var drops = [], splash = [], running = false, t = 0, still = 0;

    addEventListener('mousemove', function(e){
      if (!shown){ x = tx = px = e.clientX; y = ty = py = e.clientY; }
      shown = true;
      tx = e.clientX; ty = e.clientY;
      var sp = Math.hypot(tx - px, ty - py);
      // 移動時沿路滴下小墨點，越快滴得越多
      if (sp > 3 && Math.random() < Math.min(0.9, sp/22)){
        drops.push({ x: tx + (Math.random()-.5)*6, y: ty + (Math.random()-.5)*6,
                     r: 1 + Math.random()*2.2*Math.min(1, sp/18), life: 1,
                     vx: (tx - px)*0.02, vy: (ty - py)*0.02 });
      }
      px = tx; py = ty;
      hover = !!(e.target.closest && e.target.closest('a,button,.reveal-block'));
      kick();
    }, {passive:true});
    document.addEventListener('mouseleave', function(){ shown = false; kick(); });
    addEventListener('mousedown', function(){
      down = true;
      // 點擊時墨滴濺開
      for (var i = 0; i < 9; i++){
        var a = Math.random()*6.283, v = 1.5 + Math.random()*3.5;
        splash.push({ x: tx, y: ty, vx: Math.cos(a)*v, vy: Math.sin(a)*v, r: 1 + Math.random()*2.4, life: 1 });
      }
      ring = 1; kick();
    });
    addEventListener('mouseup', function(){ down = false; kick(); });

    function kick(){ if (!running){ running = true; requestAnimationFrame(frame); } }
    function frame(){
      t += 0.016;
      var dx = tx - x, dy = ty - y;
      x += dx*0.3; y += dy*0.3;
      var target = hover ? 18 : 6;
      if (down) target *= 0.7;
      rad += (target - rad)*0.18;

      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.fillStyle = ink;

      // 尾跡墨點：慢慢下沉、縮小、淡出
      for (var i = drops.length - 1; i >= 0; i--){
        var d = drops[i];
        d.x += d.vx; d.y += d.vy; d.vx *= 0.94; d.vy = d.vy*0.94 + 0.03;
        d.life -= 0.022;
        if (d.life <= 0){ drops.splice(i,1); continue; }
        ctx.globalAlpha = d.life*0.55;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r*(0.4 + d.life*0.6), 0, 6.283); ctx.fill();
      }
      for (var j = splash.length - 1; j >= 0; j--){
        var s = splash[j];
        s.x += s.vx; s.y += s.vy; s.vx *= 0.88; s.vy = s.vy*0.88 + 0.05;
        s.life -= 0.03;
        if (s.life <= 0){ splash.splice(j,1); continue; }
        ctx.globalAlpha = s.life*0.7;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r*s.life, 0, 6.283); ctx.fill();
      }
      if (ring > 0){
        ctx.globalAlpha = ring*0.45; ctx.strokeStyle = ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(tx, ty, 8 + (1 - ring)*26, 0, 6.283); ctx.stroke();
        ring -= 0.05;
      }

      if (shown){
        // 主墨滴：隨速度拉長成水滴形，靜止時微微晃動
        var sp = Math.min(Math.hypot(dx, dy), 40), k = sp/40;
        var wob = 1 + 0.06*Math.sin(t*5)*Math.max(0, 1 - still/60);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.scale((1 + k*0.9)*wob, (1 - k*0.35)/wob);
        if (hover){
          ctx.globalAlpha = 0.16; ctx.fillStyle = accent;
          ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.283); ctx.fill();
          ctx.globalAlpha = 0.9; ctx.strokeStyle = accent; ctx.lineWidth = 1.2/Math.max(1, 1 + k*0.9);
          ctx.stroke();
          ctx.fillStyle = accent;
          ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.283); ctx.fill();
        } else {
          ctx.globalAlpha = 0.92;
          ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.283); ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      var settled = Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1 && Math.abs(target - rad) < 0.05;
      // 停著時仍保留晃動；滑出視窗且墨點散盡後才停止繪製
      if (!shown && !drops.length && !splash.length && ring <= 0){ running = false; ctx.clearRect(0,0,innerWidth,innerHeight); return; }
      // 游標靜止約一秒後停止重繪，不再持續耗電
      if (shown && settled && !drops.length && !splash.length && ring <= 0 && !down) still++; else still = 0;
      if (still > 70 || document.hidden){ running = false; still = 0; return; }
      requestAnimationFrame(frame);
    }
    root.classList.add('has-ink-cursor');
  })();
})();
