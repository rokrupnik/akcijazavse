/* ===========================================================
   GUMB DELI — deli/kopira povezavo do strani
   Na mobilcu odpre sistemski deli (z lepim predogledom),
   na namizju kopira URL v odložišče.
   =========================================================== */
(function () {
  const URL = "https://www.akcijazavse.si/";

  function toast(msg) {
    const t = document.createElement("div");
    t.className = "azv-toast";
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add("show"));
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 1800);
  }
  function copiedMsg() {
    return (window.AZV && window.AZV.t("share_copied")) || "Povezava kopirana!";
  }
  function fallbackCopy() {
    const ta = document.createElement("textarea");
    ta.value = URL; ta.setAttribute("readonly", ""); ta.style.position = "absolute"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    if (ok) toast(copiedMsg()); else prompt("Kopiraj povezavo / Copy link:", URL);
  }
  async function doShare() {
    const data = { title: "Akcija za vse", text: "Igre in stripi bratov Simon, Jakob in Andrej", url: URL };
    if (navigator.share) {
      try { await navigator.share(data); return; }
      catch (e) { if (e && e.name === "AbortError") return; /* sicer pade na kopiranje */ }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(URL); toast(copiedMsg()); return; }
      catch (e) { /* pade na fallback */ }
    }
    fallbackCopy();
  }

  function wire() {
    document.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", doShare));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
