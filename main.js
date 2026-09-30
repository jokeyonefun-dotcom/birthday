(function () {
  "use strict";

  var DEFAULTS = {
    name: "亲爱的老婆",
    fromName: "你的老公",
    togetherSince: "2018-05-20",
    wish: "愿你永远被爱，被温柔以待",
    music: "assets/music.mp3",
    candles: 5,
    title: "生日快乐",
  };

  var cfg = Object.assign({}, DEFAULTS, window.BIRTHDAY_CONFIG || {});
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var story = document.getElementById("story");
  var openBtn = document.getElementById("open-btn");
  var musicBtn = document.getElementById("music-toggle");
  var finale = document.getElementById("finale");
  var opened = false;
  var finished = false;

  document.title = cfg.name + "，生日快乐";
  document.getElementById("gate-name").textContent = cfg.name;
  document.getElementById("hero-name").textContent = cfg.name;
  document.getElementById("finale-name").textContent = cfg.name;
  document.getElementById("finale-title").textContent = cfg.title;
  fillTitle(document.getElementById("hero-title"), cfg.title);

  var audio = null;
  var audioCtx = null;
  var mode = "none";
  var musicOn = false;
  var synthOn = false;
  var synthTimer = 0;
  var nextTime = 0;
  var step = 0;
  var MELODY = [
    [523.25, 0.32],
    [659.25, 0.32],
    [783.99, 0.32],
    [880.0, 0.48],
    [783.99, 0.32],
    [659.25, 0.32],
    [698.46, 0.64],
    [0, 0.22],
    [587.33, 0.32],
    [698.46, 0.32],
    [880.0, 0.32],
    [1046.5, 0.48],
    [880.0, 0.32],
    [783.99, 0.32],
    [659.25, 0.72],
    [0, 0.42],
  ];

  var candles = [];
  var lit = 0;
  var listening = false;
  var micStream = null;
  var micCtx = null;
  var micFrame = 0;
  var hotFrames = 0;
  var lastBlow = 0;

  openBtn.addEventListener("click", openSurprise);
  musicBtn.addEventListener("click", toggleMusic);

  function fillTitle(el, text) {
    el.textContent = "";
    String(text).split("").forEach(function (ch, i) {
      var span = document.createElement("span");
      span.className = "char";
      span.textContent = ch;
      span.style.animationDelay = 0.45 + i * 0.12 + "s";
      el.appendChild(span);
    });
  }

  function openSurprise() {
    if (opened) return;
    opened = true;
    openBtn.disabled = true;
    unlockAudio();
    startMusic();
    document.body.classList.add("is-opening");
    window.setTimeout(function () {
      document.body.classList.add("is-open");
      story.removeAttribute("inert");
      musicBtn.hidden = false;
      emitHearts(window.innerWidth / 2, window.innerHeight / 2, 20);
    }, 680);
  }

  function unlockAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function startMusic() {
    audio = new Audio();
    audio.preload = "auto";
    audio.loop = true;
    audio.volume = 0.85;
    audio.src = cfg.music;
    var failed = false;
    audio.addEventListener("error", function () {
      failed = true;
      if (mode !== "file") ensureSynth();
    });
    try {
      var pending = audio.play();
      if (pending && pending.then) {
        pending.then(function () {
          if (failed) return;
          mode = "file";
          musicOn = true;
          if (audioCtx && audioCtx.state === "running") audioCtx.suspend();
          paintMusic();
        }).catch(function () {
          ensureSynth();
        });
      } else {
        ensureSynth();
      }
    } catch (err) {
      ensureSynth();
    }
    musicOn = true;
    paintMusic();
  }

  function ensureSynth() {
    if (mode === "file" || mode === "synth") return;
    if (!audioCtx) return;
    mode = "synth";
    musicOn = true;
    synthOn = true;
    nextTime = audioCtx.currentTime + 0.08;
    step = 0;
    scheduleSynth();
    paintMusic();
  }

  function scheduleSynth() {
    if (!synthOn || !audioCtx) return;
    if (nextTime < audioCtx.currentTime) nextTime = audioCtx.currentTime + 0.05;
    var horizon = audioCtx.currentTime + 0.28;
    while (nextTime < horizon) {
      var note = MELODY[step % MELODY.length];
      if (note[0]) playNote(note[0], nextTime, note[1]);
      nextTime += note[1];
      step += 1;
    }
    synthTimer = window.setTimeout(scheduleSynth, 70);
  }

  function playNote(freq, when, dur) {
    var osc = audioCtx.createOscillator();
    var low = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    var lowGain = audioCtx.createGain();
    osc.type = "sine";
    low.type = "triangle";
    osc.frequency.value = freq;
    low.frequency.value = freq / 2;
    lowGain.gain.value = 0.22;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.2, when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(0.12, dur * 0.95));
    osc.connect(gain);
    low.connect(lowGain);
    lowGain.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(when);
    low.start(when);
    osc.stop(when + dur + 0.02);
    low.stop(when + dur + 0.02);
  }

  function toggleMusic() {
    if (mode === "file" && audio) {
      if (audio.paused) {
        audio.play();
        musicOn = true;
      } else {
        audio.pause();
        musicOn = false;
      }
    } else if (mode === "synth" && audioCtx) {
      if (musicOn) {
        musicOn = false;
        synthOn = false;
        window.clearTimeout(synthTimer);
        audioCtx.suspend();
      } else {
        musicOn = true;
        synthOn = true;
        audioCtx.resume();
        scheduleSynth();
      }
    } else {
      unlockAudio();
      ensureSynth();
      return;
    }
    paintMusic();
  }

  function paintMusic() {
    musicBtn.classList.toggle("is-on", musicOn);
    musicBtn.setAttribute("aria-pressed", musicOn ? "true" : "false");
    musicBtn.setAttribute("aria-label", musicOn ? "暂停音乐" : "播放音乐");
  }

  function parseStart(value) {
    var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    var date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return date;
  }

  function setupCounter() {
    var start = parseStart(cfg.togetherSince);
    var since = document.getElementById("since");
    var daysEl = document.getElementById("days");
    var hoursEl = document.getElementById("hours");
    var minutesEl = document.getElementById("minutes");
    var secondsEl = document.getElementById("seconds");
    if (!start) {
      since.textContent = "在 config.js 里填上你们在一起的日子";
      setNum(daysEl, "—");
      setNum(hoursEl, "—");
      setNum(minutesEl, "—");
      setNum(secondsEl, "—");
      return;
    }
    since.textContent = "从 " + start.getFullYear() + " 年 " + (start.getMonth() + 1) + " 月 " + start.getDate() + " 日开始";
    function render() {
      var diff = Math.max(0, Date.now() - start.getTime());
      setNum(daysEl, String(Math.floor(diff / 86400000)));
      setNum(hoursEl, pad(Math.floor(diff / 3600000) % 24));
      setNum(minutesEl, pad(Math.floor(diff / 60000) % 60));
      setNum(secondsEl, pad(Math.floor(diff / 1000) % 60));
    }
    render();
    window.setInterval(render, 1000);
  }

  function setNum(el, value) {
    if (el.textContent === value) return;
    el.textContent = value;
    el.classList.remove("tick");
    void el.offsetWidth;
    el.classList.add("tick");
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function buildCandles() {
    var count = Math.max(1, Math.min(9, parseInt(cfg.candles, 10) || 5));
    var wrap = document.getElementById("candles");
    for (var i = 0; i < count; i += 1) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "candle";
      btn.setAttribute("aria-label", "吹灭这根蜡烛");
      btn.innerHTML = '<span class="flame"></span><span class="wick"></span><span class="stick"></span><span class="smoke"></span>';
      btn.addEventListener("click", function (event) {
        extinguish(event.currentTarget);
      });
      wrap.appendChild(btn);
      candles.push(btn);
    }
    lit = candles.length;
  }

  function extinguish(candle) {
    if (!candle || candle.classList.contains("out") || finished) return;
    candle.classList.add("out");
    candle.disabled = true;
    lit -= 1;
    if (lit <= 0) onAllOut();
  }

  function extinguishNext() {
    for (var i = 0; i < candles.length; i += 1) {
      if (!candles[i].classList.contains("out")) {
        extinguish(candles[i]);
        return;
      }
    }
  }

  function setupMicButton() {
    var blowBtn = document.getElementById("blow-btn");
    var micOk = location.protocol !== "file:" && window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    if (!micOk) return;
    blowBtn.hidden = false;
    document.getElementById("cake-hint").textContent = "点一下烛火，或对着麦克风吹一口气";
    blowBtn.addEventListener("click", function () {
      if (listening) stopMic();
      else startMic();
    });
  }

  function startMic() {
    var blowBtn = document.getElementById("blow-btn");
    var msg = document.getElementById("blow-msg");
    msg.hidden = false;
    msg.textContent = "请允许使用麦克风";
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      listening = true;
      micStream = stream;
      blowBtn.classList.add("listening");
      blowBtn.textContent = "正在听你吹气";
      blowBtn.setAttribute("aria-pressed", "true");
      msg.textContent = "用力吹一口气";
      document.getElementById("blow-meter").hidden = false;
      var AC = window.AudioContext || window.webkitAudioContext;
      micCtx = new AC();
      var source = micCtx.createMediaStreamSource(stream);
      var analyser = micCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.35;
      source.connect(analyser);
      var buf = new Uint8Array(analyser.fftSize);
      hotFrames = 0;
      function watch() {
        if (!listening) return;
        analyser.getByteTimeDomainData(buf);
        var sum = 0;
        for (var i = 0; i < buf.length; i += 1) {
          var v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        var rms = Math.sqrt(sum / buf.length);
        document.getElementById("meter").style.width = Math.min(100, Math.round(rms * 420)) + "%";
        if (rms > 0.1) hotFrames += 1;
        else hotFrames = 0;
        var now = performance.now();
        if (hotFrames >= 5 && now - lastBlow > 420) {
          hotFrames = 0;
          lastBlow = now;
          extinguishNext();
        }
        micFrame = requestAnimationFrame(watch);
      }
      watch();
    }).catch(function () {
      msg.textContent = "麦克风没有打开，点烛火也可以吹灭";
    });
  }

  function stopMic() {
    listening = false;
    cancelAnimationFrame(micFrame);
    if (micStream) {
      micStream.getTracks().forEach(function (track) { track.stop(); });
      micStream = null;
    }
    if (micCtx) {
      micCtx.close();
      micCtx = null;
    }
    var blowBtn = document.getElementById("blow-btn");
    blowBtn.classList.remove("listening");
    blowBtn.textContent = "对着麦克风吹气";
    blowBtn.setAttribute("aria-pressed", "false");
    document.getElementById("blow-meter").hidden = true;
    if (!finished) document.getElementById("blow-msg").hidden = true;
  }

  function onAllOut() {
    if (finished) return;
    finished = true;
    stopMic();
    document.getElementById("blow-btn").hidden = true;
    document.getElementById("blow-meter").hidden = true;
    var msg = document.getElementById("blow-msg");
    msg.hidden = false;
    msg.textContent = "愿望已许下";
    document.getElementById("cake-hint").textContent = "愿望已许下";
    window.setTimeout(showFinale, 700);
  }

  function showFinale() {
    finale.hidden = false;
    finale.setAttribute("aria-hidden", "false");
    document.body.classList.add("finale-on");
    startFireworks();
    var wish = document.getElementById("wish");
    var sign = document.getElementById("sign");
    var text = String(cfg.wish || DEFAULTS.wish);
    sign.textContent = "— " + cfg.fromName;
    if (reduceMotion) {
      wish.textContent = text;
      sign.classList.add("show");
      return;
    }
    var i = 0;
    wish.textContent = "";
    var typer = window.setInterval(function () {
      wish.textContent += text.charAt(i);
      i += 1;
      if (i >= text.length) {
        window.clearInterval(typer);
        window.setTimeout(function () { sign.classList.add("show"); }, 360);
      }
    }, 90);
  }

  var ambient = document.getElementById("ambient");
  var actx = ambient.getContext("2d");
  var stars = [];
  var petals = [];
  var balloons = [];
  var hearts = [];
  var ambientOn = true;
  var viewW = 0;
  var viewH = 0;
  var COLORS = ["#ffb3c7", "#f6d58a", "#fff6ea", "#ff8fab", "#e7c1ff"];

  function resizeAmbient() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    ambient.width = Math.floor(viewW * dpr);
    ambient.height = Math.floor(viewH * dpr);
    ambient.style.width = viewW + "px";
    ambient.style.height = viewH + "px";
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startAmbient() {
    resizeAmbient();
    var starCount = 48;
    var petalCount = reduceMotion ? 0 : 26;
    var balloonCount = reduceMotion ? 0 : (window.innerWidth < 760 ? 4 : 6);
    for (var s = 0; s < starCount; s += 1) {
      stars.push({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        r: Math.random() * 1.4 + 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
    for (var p = 0; p < petalCount; p += 1) petals.push(makePetal(true));
    for (var b = 0; b < balloonCount; b += 1) balloons.push(makeBalloon(true));
    window.addEventListener("resize", resizeAmbient);
    drawAmbient();
  }

  function makePetal(anywhere) {
    var roll = Math.random();
    return {
      x: Math.random() * viewW,
      y: anywhere ? Math.random() * viewH : -20,
      r: 5 + Math.random() * 7,
      w: 10 + Math.random() * 12,
      h: 3 + Math.random() * 3,
      vy: 0.35 + Math.random() * 0.9,
      vx: -0.35 + Math.random() * 0.7,
      rot: Math.random() * Math.PI,
      vr: -0.02 + Math.random() * 0.04,
      phase: Math.random() * Math.PI * 2,
      kind: roll < 0.34 ? "heart" : roll < 0.67 ? "ribbon" : "petal",
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    };
  }

  function makeBalloon(anywhere) {
    var narrow = viewW < 760;
    var gutter = narrow ? Math.max(24, viewW * 0.07) : Math.min(150, viewW * 0.14);
    var baseX = Math.random() < 0.5 ? 12 + Math.random() * gutter : viewW - 12 - Math.random() * gutter;
    return {
      baseX: baseX,
      x: baseX,
      y: anywhere ? 96 + Math.random() * Math.max(120, viewH - 180) : viewH + 30 + Math.random() * 180,
      r: (narrow ? 11 : 16) + Math.random() * (narrow ? 6 : 14),
      vy: 0.28 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * 3)],
    };
  }

  function emitHearts(x, y, n) {
    if (reduceMotion) return;
    for (var i = 0; i < n; i += 1) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1.2 + Math.random() * 2.6;
      hearts.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.4,
        life: 1,
        r: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: -0.05 + Math.random() * 0.1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  function drawAmbient() {
    if (!ambientOn) return;
    actx.clearRect(0, 0, viewW, viewH);
    var t = Date.now() / 1000;
    for (var s = 0; s < stars.length; s += 1) {
      var star = stars[s];
      actx.globalAlpha = reduceMotion ? 0.7 : 0.35 + Math.sin(t * 1.4 + star.phase) * 0.35;
      actx.fillStyle = "#fff6ea";
      actx.beginPath();
      actx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      actx.fill();
    }
    actx.globalAlpha = 0.85;
    for (var p = 0; p < petals.length; p += 1) {
      var petal = petals[p];
      petal.y += petal.vy;
      petal.x += petal.vx + Math.sin(t + petal.phase) * 0.35;
      petal.rot += petal.vr;
      if (petal.y > viewH + 20) {
        petals[p] = makePetal(false);
        continue;
      }
      actx.fillStyle = petal.color;
      if (petal.kind === "heart") drawHeart(actx, petal.x, petal.y, petal.r, petal.rot);
      else if (petal.kind === "ribbon") {
        actx.save();
        actx.translate(petal.x, petal.y);
        actx.rotate(petal.rot);
        actx.fillRect(-petal.w / 2, -petal.h / 2, petal.w, petal.h);
        actx.restore();
      } else {
        actx.save();
        actx.translate(petal.x, petal.y);
        actx.rotate(petal.rot);
        actx.beginPath();
        actx.ellipse(0, 0, petal.r * 0.45, petal.r, 0, 0, Math.PI * 2);
        actx.fill();
        actx.restore();
      }
    }
    for (var b = 0; b < balloons.length; b += 1) {
      var balloon = balloons[b];
      balloon.y -= balloon.vy;
      balloon.phase += 0.01;
      balloon.x = balloon.baseX + Math.sin(balloon.phase) * 10;
      if (balloon.y < -80) balloons[b] = makeBalloon(false);
      else drawBalloon(balloon);
    }
    for (var h = hearts.length - 1; h >= 0; h -= 1) {
      var heart = hearts[h];
      heart.x += heart.vx;
      heart.y += heart.vy;
      heart.vy -= 0.015;
      heart.rot += heart.vr;
      heart.life -= 0.012;
      if (heart.life <= 0) {
        hearts.splice(h, 1);
        continue;
      }
      actx.globalAlpha = Math.max(0, heart.life);
      actx.fillStyle = heart.color;
      drawHeart(actx, heart.x, heart.y, heart.r, heart.rot);
    }
    actx.globalAlpha = 1;
    requestAnimationFrame(drawAmbient);
  }

  function drawHeart(ctx, x, y, size, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(size / 12, size / 12);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-8, -4, -14, 4, 0, 12);
    ctx.bezierCurveTo(14, 4, 8, -4, 0, 4);
    ctx.fill();
    ctx.restore();
  }

  function drawBalloon(balloon) {
    actx.save();
    actx.translate(balloon.x, balloon.y);
    actx.rotate(Math.sin(balloon.phase) * 0.08);
    actx.fillStyle = balloon.color;
    actx.globalAlpha = 0.9;
    actx.beginPath();
    actx.ellipse(0, 0, balloon.r * 0.72, balloon.r, 0, 0, Math.PI * 2);
    actx.fill();
    actx.beginPath();
    actx.moveTo(-4, balloon.r - 1);
    actx.lineTo(0, balloon.r + 8);
    actx.lineTo(4, balloon.r - 1);
    actx.fill();
    actx.strokeStyle = "rgba(255,246,234,0.45)";
    actx.lineWidth = 1;
    actx.beginPath();
    actx.moveTo(0, balloon.r + 8);
    actx.quadraticCurveTo(12, balloon.r + 28, -2, balloon.r + 52);
    actx.stroke();
    actx.fillStyle = "rgba(255,255,255,0.38)";
    actx.beginPath();
    actx.ellipse(-balloon.r * 0.22, -balloon.r * 0.28, balloon.r * 0.16, balloon.r * 0.26, -0.5, 0, Math.PI * 2);
    actx.fill();
    actx.restore();
    actx.globalAlpha = 1;
  }

  var fireworks = document.getElementById("fireworks");
  var fctx = fireworks.getContext("2d");
  var rockets = [];
  var sparks = [];
  var fwOn = false;
  var fwW = 0;
  var fwH = 0;
  var launches = 0;
  var launchTimer = 0;

  function resizeFireworks() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    fwW = window.innerWidth;
    fwH = window.innerHeight;
    fireworks.width = Math.floor(fwW * dpr);
    fireworks.height = Math.floor(fwH * dpr);
    fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startFireworks() {
    if (reduceMotion) return;
    resizeFireworks();
    fwOn = true;
    launchRocket();
    drawFireworks();
  }

  function launchRocket() {
    if (!fwOn) return;
    rockets.push({
      x: fwW * (0.18 + Math.random() * 0.64),
      y: fwH * 0.92,
      vy: -(6.5 + Math.random() * 2.4),
      target: fwH * (0.12 + Math.random() * 0.38),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
    launches += 1;
    var wait = launches < 10 ? 700 : 1500;
    launchTimer = window.setTimeout(launchRocket, wait);
  }

  function burst(x, y, color) {
    var n = 46;
    for (var i = 0; i < n; i += 1) {
      var angle = (Math.PI * 2 * i) / n + Math.random() * 0.2;
      var speed = 1.4 + Math.random() * 3.2;
      sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.008 + Math.random() * 0.012,
        color: color,
      });
    }
  }

  function drawFireworks() {
    if (!fwOn) return;
    fctx.clearRect(0, 0, fwW, fwH);
    for (var r = rockets.length - 1; r >= 0; r -= 1) {
      var rocket = rockets[r];
      rocket.y += rocket.vy;
      fctx.fillStyle = rocket.color;
      fctx.globalAlpha = 0.9;
      fctx.fillRect(rocket.x, rocket.y, 2, 10);
      if (rocket.y <= rocket.target) {
        burst(rocket.x, rocket.y, rocket.color);
        rockets.splice(r, 1);
      }
    }
    for (var s = sparks.length - 1; s >= 0; s -= 1) {
      var spark = sparks[s];
      spark.x += spark.vx;
      spark.y += spark.vy;
      spark.vy += 0.035;
      spark.vx *= 0.992;
      spark.life -= spark.decay;
      if (spark.life <= 0) {
        sparks.splice(s, 1);
        continue;
      }
      fctx.globalAlpha = Math.max(0, spark.life) * 0.35;
      fctx.fillStyle = spark.color;
      fctx.beginPath();
      fctx.arc(spark.x, spark.y, 6, 0, Math.PI * 2);
      fctx.fill();
      fctx.globalAlpha = Math.max(0, spark.life);
      fctx.beginPath();
      fctx.arc(spark.x, spark.y, 2.6, 0, Math.PI * 2);
      fctx.fill();
    }
    fctx.globalAlpha = 1;
    if (sparks.length > 240) sparks.splice(0, sparks.length - 240);
    requestAnimationFrame(drawFireworks);
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      ambientOn = false;
      fwOn = false;
      window.clearTimeout(launchTimer);
    } else {
      if (!ambientOn) {
        ambientOn = true;
        drawAmbient();
      }
      if (finished && !reduceMotion && !fwOn) {
        fwOn = true;
        drawFireworks();
        launchRocket();
      }
    }
  });

  window.addEventListener("resize", function () {
    if (fwOn || finished) resizeFireworks();
  });

  buildCandles();
  setupMicButton();
  setupCounter();
  startAmbient();
})();
