/*Utilidades pequeñas*/
function $(sel) { return document.querySelector(sel); }
function escapeHtml(str) {
    return String(str) 
        .replaceAll("&","&amp;")
        .replaceAll("<","&lt;")
        .replaceAll(">","&gt;");
}

function nowISO() { return new Date().toISOString(); }

function formatDateTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { dataStyle: "medium", timeStyle: "short" });
}

/*Toast*/
const toast=$("#toast");
function say(msg) {
    if (!toast) return;
    toast.textContent = msg;
    clearTimeout(say._t);
    say._t = setTimeout(() => (toast.textContent = ""), 1800);
}

/*Navegación entre pantallas*/
const views = {
    home: $("#viewhome"),
    sos: $("#viewSOS"),
    loop: $("#viewLoop"),
    notNow: $("#viewNotNow"),
    dump: $("#viewDump"),
    patterns: $("#viewPatterns"),
};

function show(viewKey) {
  Object.values(views).forEach(v => v.classList.remove("is-active"));
  views[viewKey].classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  
  //cada vez qye abrimos patrones, refrescamos
  if (viewKey === "patterns") renderPatterns();
}

$("#btnHome").addEventListener("click", () => show("home"));
$("#goSOS").addEventListener("click", () => show("sos"));
$("#goLoop").addEventListener("click", () => show("loop"));
$("#goNotNow").addEventListener("click", () => show("notNow"));
$("#goDump").addEventListener("click", () => show("dump"));
$("#goPatterns").addEventListener("click", () => show("patterns"));

/*SOS 30s (temporizador simple)*/
let sosTimer = null;
let sosLeft = 30;

const sosTime = $("#sosTime");
const sosHint = $("#sosHint");

function setSOS(text, hint) {
    sosTime.textContent = String(text);
    sosHint.textContent = hint;
}

function stopSOS() {
    clearInterval(sosTimer);
    sosTimer = null;
    sosLeft = 30;
    setSOS(30, "Pulsa empezar");
}

function startSOS() {
    if (sosTimer) return;

    sosLeft = 30;
    setSOS(sosLeft, "Sigue el guión. Solo eso.");

    sosTimer = setInterval(() => {
        sosLeft--;
        setSOS(sosLeft, sosLeft>0 ? "Sigue el guión. Respira." : "Hecho. Has bajado la ola.");

        if (sosLeft <= 0) {
            clearInterval(sosTimer);
            sosTimer = null;

            //mini feedback
            try {navigator.vibrate?.([120,80,120]); } catch {}
            setTimeout(() => setSOS(30, "Si quieres, repite una vez."), 1200);
        }
    }, 1000);
}

$("#sosStart").addEventListener("click", startSOS);
$("#sosStop").addEventListener("click", stopSOS);

/*Salir del bucle: respiración 4-6*/
let breathTimer = null;
let cyclesLeft = 0;
let phase = "idle"; //inhale / exhale

const ring = $("#breathRing");
const cue = $("#breathCue");
const count = $("#breathCount");

function setRing(scale, glow) {
    ring.style.transform = `scale(${scale})`;
    ring.style.boxShadow = `0 0 0 ${glow}px rgba(110,231,255,.18)`;
}

function stopBreathingUI() {
    clearInterval(breathTimer);

    breathTimer = null;
    phase = "idle";
    cue.textContent = "Listo";
    count.textContent = "6 ciclos";
    setRing(1, 0);
}

function startBreathing() {
    if (breathTimer) return;

    cyclesLeft = 6;
    phase = "inhale";
    cue.textContent = "Inhala 4";
    count.textContent = `${cyclesLeft} ciclos`;
    setRing(1.18, 10);

    let seconds = 4;

    breathTimer = setInterval(() => {
        seconds--;

        if (seconds <= 0) {
            if (phase === "inhale") {
                phase = "exhale";
                cue.textContent = "Exhala 6";
                seconds = 6;
                setRing(0.92, 2);
            } else {
                cyclesLeft--;
                count.textContent = `${cyclesLeft} ciclos`;

                if (cyclesLeft <= 0) {
                    clearInterval(breathTimer);
                    breathTimer = "Hecho ✨";
                    setRing(1, 0);
                    return;
                }

                phase = "inhale";
                cue.textContent = "Inhala 4";
                seconds = 4;
                setRing(1.18, 10);
            }
        }
    }, 1000);
}

$("#startBreath").addEventListener("click", startBreathing);
$("#stopBreath").addEventListener("click", stopBreathingUI);

/*Grounding: copiar guía*/
$("#copyGrounding").addEventListener("click", async () => {
    const text = "5 cosas que ves · 4 que sientes · 3 que oyes · 2 que hueles · 1 que saboreas";
    try {
        await navigator.clipboard.writeText(text);
        say("Guía copiada ✅");
    } catch {
        say("No pude copiar (permiso del navegador) 🥲");
    }
});

/*Anchors: mostrar toast*/
$("#anchors").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    say(`Ancla: "${btn.textContent}"`);
});

/*Storage keys (localStorage)*/

const LS_ACTIONS = "bucle_actions";
const LS_REMINDERS = "bucle_reminders";
const LS_DUMP = "bucle_dump";
const LS_PATTERNS = "bucle_patterns";

/*Acciones guardadas*/

const actionsList = $("#actionsList");

function getActions() {
  return JSON.parse(localStorage.getItem(LS_ACTIONS) || "[]");
}

function setActions(arr) {
    localStorage.setItem(LS_ACTIONS, JSON.stringify(arr));
}

function renderActions() {
    const actions = getActions();
    actionsList.innerHTML = actions.map(a => `<li>${escapeHtml(a)}</li>`).join("");
}

$("#storeAction").addEventListener("click", () => {
    const input = $("#actionInput");
    const val = input.value.trim();
    if (!val) return;

    const actions = getActions();
    actions.unshift(val);
    setActions(actions);

    input.value ="";
    renderActions();
    say("Acción guardada ✅");
});

$("#clearActions").addEventListener("click", () => {
    localStorage.removeItem(LS_ACTIONS);
    renderActions();
    say("Acciones vaciadas 🧺");
});

/*Recordatorios internos*/

const remindersList = $("#remindersList");
const reminderIn = $("#reminderIn");
const reminderNote = $("#reminderNote");

function getReminders() {
    return JSON.parse(localStorage.getItem(LS_REMINDERS) || "[]");
}
function setReminders(arr) {
    localStorage.setItem(LS_REMINDERS, JSON.stringify(arr));
}

function renderReminders() {
    const reminders = getReminders()
        .sort((a, b) => a.when - b.when);

    remindersList.innerHTML = reminders.map(r => {
        const label = r.note ? `· ${escapeHtml(r.note)}` : "";
        return `<li><strong>${formatDateTime(r.when)}</strong>${label}</li>`;
    }).join("");
}

/*Notificaciones del navegador (opcional)*/
async function enableNotifications() {
    if (!("Notification" in window)) {
        say("Este navegador no soporta notificaciones 🥲");
        return;
    }
    const res = await Notification.requestPermission();
    if (res === "granted") say("Notificaciones activadas ✅");
    else say("Sin permiso (no pasa nada) 🙂");
}
$("#enableNotifications").addEventListener("click", enableNotifications);

/*Programar recordatorio*/
$("#setReminder").addEventListener("click", () => {
    const minutes = Number(reminderIn.value);
    const when = Date.now() + minutes * 60 * 1000;

    const reminders= getReminders();
    reminders.unshift({
        id: crypto.randomUUID?.() || String(Math.random()),
        when,
        note: reminderNote.value.trim(),
        createdAt: nowISO(),
    });

    setReminders(reminders);
    renderReminders();
    reminderNote.value = "";

    say("Recordatorio guardado ✅");
});

/*Limpiar recordatorios*/
$("#clearReminders").addEventListener("click", () => {
    localStorage.removeItem(LS_REMINDERS);
    renderReminders();
    say("Recordatorios vaciados 🧺");
});

/*Chequeo periódico (si hay recordatorios vencidos, avisamos)*/
function checkReminders() {
    const reminders = getReminders();
    if (reminders.length === 0) return;

    const now = Date.now();
    const due = reminders.filter(r => r.when <= now);

    if (due.length === 0) return;

    //Mostramos aviso interno
    const first = due[0];
    const label =first.note ? `\n\nEtiqueta: ${first.note}` : "";
    alert(`🧠 Momento pactado\n\nEsto estaba aparcado. Ahora puedes mirarlo (o reprogramarlo).${label}`);

    //Si hay permiso, también notificación (cuando la app está abierta)
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Momento pactado", {
            body: first.note ?`Etiqueta: ${first.note}` : "Esto estaba aparcado. Ahora puedes mirarlo.",
        });
    }

    //Quitamos los vencidos para no repetir
    const remaining = reminders.filter(r => r.when > now);
    setReminders(remaining);
    renderReminders();
}
setInterval(checkReminders, 5000);

/*No es un problema ahora: decidir + toggles*/

const qNow = $("#qNow");
const qControl = $("#qControl");
const qInfo = $("#qInfo");

const nnResult = $("#nnResult");
const nnHeadline = $("#nnHeadline");
const nnText = $("#nnText");

const actionBox = $("#actionBox");
const reminderBox = $("#reminderBox");

$("#toggleActionBox").addEventListener("click", () => {
    actionBox.hidden = !actionBox.hidden;
    if (!actionBox.hidden) $("#actionInput").focus();
});

$("#toggleReminderBox").addEventListener("click", () => {
    reminderBox.hidden = !reminderBox.hidden;
    if (!reminderBox.hidden) reminderNote.focus();
});

$("#decide").addEventListener("click", () => {
    nnResult.hidden = false;

    const yesCount = [qNow.checked, qControl.checked, qInfo.checked].filter(Boolean).length;

    if (yesCount >= 2) {
        nnHeadline.textContent = "Acción mínima (10 min)";
        nnText.textContent =
            "No necesitas resolverlo todo. Elige una acción pequeña. Lo demás, luego.";
        actionBox.hidden = false;
        reminderBox.hidden = true;
        $("#actionInput").focus();
    } else {
        nnHeadline.textContent = "Aparcar con intención";
        nnText.textContent =
            "No hay acción útil ahora. Lo aparcamos con un recordatorio y vuelves al presente.";
        actionBox.hidden = true;
        reminderBox.hidden = false;
        reminderNote.focus();
    }

    renderActions();
    renderReminders();
})

/*Registro de patrone*/

const patTrigger = $("#patTrigger");
const patTheme = $("#patTheme");
const patThought = $("#patThought");
const patIntensity = $("#patIntensity");
const patIntensityLabel = $("#patIntensityLabel");
const patMove = $("#patMove");

function getPatterns() {
    return JSON.parse(localStorage.getItem(LS_PATTERNS) || "[]");
}
function savePattern(arr) {
    localStorage.setItem(LS_PATTERNS, JSON.stringify(arr));
}

patIntensity.addEventListener("input", () => {
    patIntensityLabel.textContent = `${patIntensity.value}/10`;
});

$("#savePattern").addEventListener("click", () => {
    const entry = {
        id: crypto.randomUUID?.() || String(Math.random()),
        createdAt: Date.now(),
        trigger: patTrigger.value.trim(),
        theme: patTheme.value,
        thought: patThought.value.trim(),
        intensity: Number(patIntensity.value),
        move: patMove.value,
    };

    //mínimo viable: pensamiento o disparador
    if (!entry.trigger && !entry.thought) {
        say("Escribe al menos: disparador o pensamiento 🙂");
        return;
    }

    const patterns = getPatterns();
    patterns.unshift(entry);
    savePattern(patterns);

    //limpiamos campos suaves (no todos, por si quieres repetir tema)
    patTrigger.value ="";
    patThought.value = "";
    patMove.value = "";
    say("Patrón guardado ✅");
});

/*ista "Mis patrones"*/
const patternsWrap = $("#patternsWrap");
const patternsEmpty = $("#patternsEmpty");

function renderPatterns() {
    const patterns = getPatterns();

    patternsEmpty.hidden = patterns.length !== 0;
    patternsWrap.innerHTML = patterns.map(p => {
        const when = formatDateTime(p.createdAt);
        const theme = p.theme ? `<span class="pill">tema: ${escapeHtml(p.theme)}</span>` : "";
        const move = p.move ? `<span class= "pill">hice: ${escapeHtml(p.move)}</span>` : "";
        const trig = p.trigger ? `<p><strong>Disparó:</strong> ${escapeHtml(p.trigger)}</p>` : "";
        const thought = p.thought ? `<p><strong>Pensamiento:</strong> ${escapeHtml(p.thought)}</p>` : "";

        return `
            <div class="patternCard">
                <div class="patternTop">
                    <span class="pill">${when}</span>
                    <span class="pill">intensidad: ${p.intensity}/10>/span>
                    ${theme}
                    ${move}
                </div>
                ${trig}
                ${thought}
            </div>
        `;    
    }).join("");
}

$("#clearPatterns").addEventListener("click", () => {
    if (!confirm("¿Borrar todos los patrones?")) return;
    localStorage.removeItem(LS_PATTERNS);
    renderPatterns();
    say("Patrones borrados 🧺");
});

$("#exportPatterns").addEventListener("click", async ()=> {
    const data = JSON.stringify(getPatterns(), null, 2);
      // 1) Intento: copiar al portapapeles (cuando el navegador lo permite)
  try {
    await navigator.clipboard.writeText(data);
    say("Copiado al portapapeles ✅");
    return;
  } catch {
    // seguimos al fallback
  }

  // 2) Fallback robusto: descarga como archivo .json
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "salir-del-bucle-patrones.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  say("Descarga iniciada ✅");
});

/*Volcado rápido*/

const dumpText = $("#dumpText");
const dumpSaved = $("#dumpSaved");
const dumpList = $("#dumpList");

function getDump() {
    return JSON.parse(localStorage.getItem(LS_DUMP) || "[]");
}
function setDump(arr) {
    localStorage.setItem(LS_DUMP, JSON.stringify(arr));
}
function renderDump() {
    const items = getDump();
    dumpList.innerHTML = items.map(t => `<li>${escapeHtml(t)}</li>`).join("");
    dumpSaved.hidden = items.length === 0;
}

$("#saveDump").addEventListener("click", () => {
    const val= dumpText.value.trim();
    if (!val) return;

    const items = getDump();
    items.unshift(val);
    setDump(items);

    dumpText.value = "";
    renderDump();
    say("Guardado en el cajón ✅");
});

$("#clearDump").addEventListener("click", () => {
    dumpText.value = "";
    say("Limpio ✨");
});

$("#clearDumpAll").addEventListener("click", () => {
    if (!confirm("¿Vaciar el cajón?")) return;
    localStorage.removeItem(LS_DUMP);
    renderDump();
    say("Cajón vaciado 🧺");
});

/*Init*/

renderActions();
renderReminders();
renderDump();
renderPatterns();