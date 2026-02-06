// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: train;
// --- ZEITSTEUERUNG LOGIK ---
const now = new Date();
const hour = now.getHours();

let FROM, TO, DIRECTION_LABEL;

if (hour < 12) {
  // Vormittag: Thalwil nach Zürich HB
  FROM = "Thalwil";
  TO = "Zürich HB";
  DIRECTION_LABEL = "Thalwil ➔ HB";
} else {
  // Nachmittag: Zürich HB nach Thalwil
  FROM = "Zürich HB";
  TO = "Thalwil";
  DIRECTION_LABEL = "HB ➔ Thalwil";
}

const MAX_RESULTS = 3; 

// Farben & Design
const NAVY_BLUE = new Color("#1e3a5f");
const DIRECT_BG = new Color("#0a1628"); 
const IN_TRANSIT_BG = new Color("#2d5a3d"); // Vert foncé pour train en cours
const WARNING_RED = new Color("#8B0000");
const TEXT_WHITE = Color.white();
const TEXT_GRAY = new Color("#ffffff", 0.6); 
const DELAY_YELLOW = new Color("#ffcc00");
const DIRECT_COLOR = new Color("#ffcc00"); 

/**
 * Daten von der API laden
 */
const fetchConnections = async () => {
  // Demander des trains depuis 15 min avant pour capturer ceux en cours
  const now = new Date();
  const earlier = new Date(now.getTime() - 15 * 60 * 1000);
  const timeStr = String(earlier.getHours()).padStart(2, '0') + ":" + String(earlier.getMinutes()).padStart(2, '0');
  const dateStr = earlier.getFullYear() + "-" + String(earlier.getMonth() + 1).padStart(2, '0') + "-" + String(earlier.getDate()).padStart(2, '0');
  
  const url = `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}&direct=1&limit=10&passlist=1&date=${dateStr}&time=${timeStr}`;
  const req = new Request(url);
  try {
    const res = await req.loadJSON();
    return res.connections || [];
  } catch (e) {
    return [];
  }
}

/**
 * Bestimmt die Ausstiegsseite basierend auf Ankunftsgleis
 */
const getExitSide = (conn) => {
  // Essayer d'abord le quai d'arrivée, sinon chercher dans les sections
  let arrPlatform = conn.to.platform;
  if (!arrPlatform && conn.sections && conn.sections.length > 0) {
    const lastSection = conn.sections[conn.sections.length - 1];
    arrPlatform = lastSection.arrival?.platform;
  }
  if (!arrPlatform) return "?";
  arrPlatform = arrPlatform.replace(/!/g, "");
  const platNum = parseInt(arrPlatform);
  if (isNaN(platNum)) return "?";
  
  // Thalwil → ZRH HB: impair=droite, pair=gauche, sauf 33/34 inversé
  if (TO === "Zürich HB") {
    if (platNum === 33) return "←";
    if (platNum === 34) return "→";
    return platNum % 2 === 1 ? "→" : "←";
  }
  
  // ZRH HB → Thalwil: quai 3=droite, quai 4=gauche
  if (TO === "Thalwil") {
    if (platNum === 3) return "→";
    if (platNum === 4) return "←";
    return "";
  }
  
  return "";
}

/**
 * Berechnet verbleibende Minuten
 */
const getCountdown = (departureDate) => {
  const diffMs = departureDate - new Date();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin <= 0) return "Jetzt";
  return `${diffMin}'`;
}

/**
 * Reisedauer Formatierung
 */
const formatDuration = (durationStr) => {
  let parts = durationStr.split("d");
  let timePart = parts.length > 1 ? parts[1] : parts[0];
  let [h, m] = timePart.split(":");
  let totalMin = parseInt(h) * 60 + parseInt(m);
  return totalMin + "'";
}

/**
 * Prüft ob der Zug direkt fährt (basierend auf Reisedauer)
 * Direct: ~8-10 min, Mit Halt: ~12-17 min
 */
const checkIsDirect = (conn) => {
  let parts = conn.duration.split("d");
  let timePart = parts.length > 1 ? parts[1] : parts[0];
  let [h, m] = timePart.split(":");
  let totalMin = parseInt(h) * 60 + parseInt(m);
  return totalMin <= 10;
}

// --- HAUPTLOGIK ---
const allConns = await fetchConnections();
const currentTime = new Date().getTime();

// Train en cours (déjà parti, pas encore arrivé)
const inTransit = allConns.find(c => 
  new Date(c.from.departure).getTime() <= currentTime && 
  new Date(c.to.arrival).getTime() > currentTime
);

// Prochains trains à partir
const upcoming = allConns
  .filter(c => new Date(c.from.departure).getTime() > currentTime)
  .slice(0, inTransit ? 2 : 3);

let widget = new ListWidget();
widget.backgroundColor = NAVY_BLUE;
widget.refreshAfterDate = new Date(Date.now() + 5 * 60 * 1000);
widget.setPadding(0, 0, 0, 0);

// Deep Link zur SBB App mit spezifischer Suche
widget.url = `sbbmobile://timetable?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}`;

// Header - Padding oben (16) gegen Abschneiden
let headerStack = widget.addStack();
headerStack.setPadding(16, 10, 4, 10);
headerStack.addSpacer();
let title = headerStack.addText(DIRECTION_LABEL);
title.font = Font.boldSystemFont(12);
title.textColor = TEXT_WHITE;
headerStack.addSpacer();

widget.addSpacer(2);

// Fonction pour afficher une ligne
const addRow = (conn, showExit, isInTransitRow) => {
  const isDirect = checkIsDirect(conn);
  let rowOuter = widget.addStack();
  // Couleur: vert si en transit, sinon bleu foncé/normal
  if (isInTransitRow) {
    rowOuter.backgroundColor = IN_TRANSIT_BG;
  } else {
    rowOuter.backgroundColor = isDirect ? DIRECT_BG : NAVY_BLUE;
  }
  rowOuter.setPadding(8, 10, 8, 10);
  rowOuter.layoutHorizontally();
  rowOuter.centerAlignContent();
  
  // 1. Zeit & Countdown
  let timeStack = rowOuter.addStack();
  timeStack.layoutVertically();
  timeStack.size = new Size(38, 0);
  const depDate = new Date(conn.from.departure);
  let topTime = timeStack.addText(String(depDate.getHours()).padStart(2, '0') + ":" + String(depDate.getMinutes()).padStart(2, '0'));
  topTime.font = Font.boldSystemFont(10);
  topTime.textColor = TEXT_WHITE;
  
  let cdLabel;
  if (isInTransitRow) {
    // Afficher heure d'arrivée
    const arrDate = new Date(conn.to.arrival);
    cdLabel = "→" + String(arrDate.getHours()).padStart(2, '0') + ":" + String(arrDate.getMinutes()).padStart(2, '0');
  } else {
    cdLabel = getCountdown(depDate);
  }
  let cdTxt = timeStack.addText(cdLabel);
  cdTxt.font = Font.systemFont(7);
  cdTxt.textColor = isInTransitRow ? Color.yellow() : (cdLabel === "Jetzt" ? Color.yellow() : TEXT_GRAY);
  
  rowOuter.addSpacer(4);
  
  // 2. Gleis (arriv\u00e9e si en transit, d\u00e9part sinon)
  let gleisStack = rowOuter.addStack();
  gleisStack.size = new Size(32, 0);
  let platform;
  if (isInTransitRow) {
    // Quai d'arriv\u00e9e
    platform = conn.to.platform;
    if (!platform && conn.sections && conn.sections.length > 0) {
      const lastSection = conn.sections[conn.sections.length - 1];
      platform = lastSection.arrival?.platform;
    }
  } else {
    platform = conn.from.platform;
  }
  platform = (platform || "-").replace(/!/g, "");
  let pTxt = gleisStack.addText("Gl." + platform);
  pTxt.font = Font.systemFont(9);
  pTxt.textColor = TEXT_GRAY;

  rowOuter.addSpacer();

  // 3. Dauer
  let durStack = rowOuter.addStack();
  durStack.size = new Size(28, 0);
  let durTxt = durStack.addText(formatDuration(conn.duration));
  durTxt.font = Font.systemFont(9);
  durTxt.textColor = TEXT_WHITE;
  durTxt.textOpacity = 0.8;

  rowOuter.addSpacer();
  
  // 4. Ausstiegsseite (seulement pour train en cours)
  if (showExit) {
    let exitSide = getExitSide(conn);
    if (exitSide) {
      let exitTxt = rowOuter.addText(exitSide);
      exitTxt.font = Font.boldSystemFont(12);
      exitTxt.textColor = TEXT_WHITE;
    }
    rowOuter.addSpacer();
  }
  
  // 5. Status (delay) - pas pour train en cours
  if (!isInTransitRow) {
    const delay = conn.from.delay || 0;
    if (delay > 0) {
      let d = rowOuter.addText("+" + delay + "'");
      d.textColor = DELAY_YELLOW;
      d.font = Font.boldSystemFont(10);
    }
  }
}

if (!inTransit && upcoming.length === 0) {
  let err = widget.addText("Keine Daten");
  err.centerAlignText();
} else {
  // Ligne 1: train en cours (avec côté sortie)
  if (inTransit) {
    addRow(inTransit, true, true);
  }
  // Lignes 2-3: prochains départs (sans côté sortie)
  upcoming.forEach(conn => addRow(conn, false, false));
}

widget.addSpacer();
let footerStack = widget.addStack();
footerStack.setPadding(2, 10, 10, 10);
footerStack.addSpacer();
let updateTimeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
let footerText = footerStack.addText("Aktualisiert: " + updateTimeStr);
footerText.font = Font.systemFont(7);
footerText.textColor = TEXT_GRAY;
footerStack.addSpacer();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}
Script.complete();
