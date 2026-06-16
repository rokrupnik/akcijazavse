/* ===========================================================
   MATHQUIZ — večkratno uporaben kviz z računi (za matematične igre)
   runQuiz({mount, op, count, range, title, sub, lang, allowType})
     -> Promise<{correct, total}>
   op: "add" | "sub" | "mul" | "div"
   Privzeto gumbi z izbiro (4 možnosti); gumb za preklop na tipkanje.
   =========================================================== */

const SYM = { add: "+", sub: "−", mul: "×", div: "÷" };

/* ---------- zvok ---------- */
let actx = null;
function tone(freq, dur, type, vol, slideTo) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
function sfxRight() { tone(660, 0.09, "triangle", 0.18, 990); setTimeout(() => tone(990, 0.12, "triangle", 0.18), 90); }
function sfxWrong() { tone(200, 0.22, "sawtooth", 0.2, 90); }

/* ---------- generator nalog ---------- */
function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
export function makeProblem(op, range) {
  let a, b, ans;
  if (op === "add") { a = ri(0, range); b = ri(0, range); ans = a + b; }
  else if (op === "sub") { a = ri(0, range); b = ri(0, a); ans = a - b; }
  else if (op === "mul") { a = ri(0, range); b = ri(0, range); ans = a * b; }
  else { b = ri(1, range); const q = ri(0, range); a = b * q; ans = q; }   // div: a÷b = q (celo)
  return { text: a + " " + SYM[op] + " " + b, answer: ans };
}
function distractors(ans, range) {
  const set = new Set([ans]), out = [];
  const span = Math.max(3, Math.round(range * 0.4));
  let guard = 0;
  while (out.length < 3 && guard++ < 60) {
    const off = ri(1, span);
    let d = ans + (Math.random() < 0.5 ? -off : off);
    if (d < 0) d = ans + off;
    if (!set.has(d)) { set.add(d); out.push(d); }
  }
  let k = 1;
  while (out.length < 3) { if (!set.has(ans + k)) { set.add(ans + k); out.push(ans + k); } k++; }
  return out;
}
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/* ---------- CSS (enkrat) ---------- */
let cssDone = false;
function injectCss() {
  if (cssDone) return; cssDone = true;
  const s = document.createElement("style");
  s.textContent = `
  .mq-card{background:#fdfdf7;border:5px solid #2b2b2b;border-radius:20px;padding:16px 20px;width:min(86%,520px);
    box-shadow:0 10px 30px rgba(0,0,0,.45);font-family:"Baloo 2",sans-serif;text-align:center;color:#1a1a1a;}
  .mq-title{font-weight:800;font-size:20px;margin:0;}
  .mq-sub{color:#666;font-size:13px;margin:2px 0 8px;}
  .mq-dots{display:flex;gap:6px;justify-content:center;margin:6px 0 8px;}
  .mq-dot{width:13px;height:13px;border-radius:50%;background:#dcdce2;border:1px solid #b9b9c2;}
  .mq-dot.ok{background:#2ec27e;border-color:#1e9c61;} .mq-dot.bad{background:#e34b4b;border-color:#b53636;}
  .mq-dot.cur{background:#ffcf33;border-color:#d9a300;}
  .mq-prob{font-weight:800;font-size:42px;margin:6px 0 14px;letter-spacing:1px;}
  .mq-opts{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .mq-opt{font-family:inherit;font-weight:800;font-size:28px;padding:14px 6px;border-radius:14px;border:3px solid #2b2b2b;
    background:#eaf1ff;cursor:pointer;color:#16315c;}
  .mq-opt:active{transform:scale(.96);}
  .mq-opt.ok{background:#bff0d4;border-color:#2ec27e;color:#155e37;} .mq-opt.bad{background:#f6c5c5;border-color:#e34b4b;color:#8e2323;}
  .mq-opt:disabled{cursor:default;}
  .mq-input{font-family:inherit;font-size:34px;font-weight:800;width:140px;text-align:center;border:3px solid #2b2b2b;border-radius:12px;padding:6px;background:#fff;}
  .mq-keypad{display:grid;grid-template-columns:repeat(3,64px);gap:8px;justify-content:center;margin:12px auto 0;}
  .mq-key{font-family:inherit;font-size:22px;font-weight:800;padding:12px 0;border-radius:12px;border:2px solid #2b2b2b;background:#eee;cursor:pointer;}
  .mq-key:active{transform:scale(.94);}
  .mq-key.ok{background:#ffcf33;}
  .mq-toggle{margin-top:12px;font-size:13px;color:#0a6cc2;cursor:pointer;background:none;border:none;font-family:inherit;text-decoration:underline;}
  `;
  document.head.appendChild(s);
}

/* ---------- glavni kviz ---------- */
export function runQuiz(opts) {
  injectCss();
  const { mount, op, count, range, title, sub, lang } = opts;
  const allowType = opts.allowType !== false;
  return new Promise((resolve) => {
    let i = 0, correct = 0, typeMode = false, locked = false;
    const results = [];
    const card = document.createElement("div"); card.className = "mq-card";
    mount.innerHTML = ""; mount.appendChild(card); mount.classList.add("show");

    function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
    function finish() { mount.classList.remove("show"); mount.innerHTML = ""; resolve({ correct, total: count }); }

    function next(ok) {
      results[i] = ok ? "ok" : "bad"; if (ok) correct++; i++;
      // ob napačnem odgovoru počakaj dlje, da igralec vidi pravilni odgovor
      setTimeout(render, ok ? 700 : 1700);
    }

    function render() {
      locked = false;
      if (i >= count) { setTimeout(finish, 300); return; }
      const p = makeProblem(op, range);
      card.innerHTML = "";
      card.appendChild(el("div", "mq-title", title));
      if (sub) card.appendChild(el("div", "mq-sub", sub));
      const dots = el("div", "mq-dots");
      for (let k = 0; k < count; k++) dots.appendChild(el("div", "mq-dot" + (k < i ? " " + results[k] : k === i ? " cur" : "")));
      card.appendChild(dots);
      card.appendChild(el("div", "mq-prob", p.text + " = ?"));

      if (!typeMode) {
        const grid = el("div", "mq-opts");
        shuffle([p.answer].concat(distractors(p.answer, range))).forEach((v) => {
          const b = el("button", "mq-opt", String(v));
          b.onclick = () => {
            if (locked) return; locked = true;
            const ok = v === p.answer;
            [...grid.children].forEach((x) => { x.disabled = true; if (+x.textContent === p.answer) x.classList.add("ok"); });
            if (!ok) b.classList.add("bad");
            ok ? sfxRight() : sfxWrong();
            next(ok);
          };
          grid.appendChild(b);
        });
        card.appendChild(grid);
      } else {
        const inp = el("input", "mq-input"); inp.readOnly = true; inp.value = "";
        card.appendChild(inp);
        const pad = el("div", "mq-keypad");
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].forEach((t) => {
          const k = el("button", "mq-key" + (t === "OK" ? " ok" : ""), t);
          k.onclick = () => {
            if (locked) return;
            if (t === "⌫") inp.value = inp.value.slice(0, -1);
            else if (t === "OK") { if (inp.value !== "") { locked = true; const ok = parseInt(inp.value, 10) === p.answer; ok ? sfxRight() : sfxWrong(); next(ok); } }
            else if (inp.value.length < 4) inp.value += t;
          };
          pad.appendChild(k);
        });
        card.appendChild(pad);
      }
      if (allowType) {
        const tg = el("button", "mq-toggle", typeMode ? (lang === "en" ? "⬜ Choices" : "⬜ Izbira") : (lang === "en" ? "⌨ Type the answer" : "⌨ Tipkaj odgovor"));
        tg.onclick = () => { typeMode = !typeMode; render(); };
        card.appendChild(tg);
      }
    }
    render();
  });
}
