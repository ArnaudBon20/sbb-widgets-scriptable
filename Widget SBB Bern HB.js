// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: train;
// --- ZEITSTEUERUNG LOGIK ---
const now = new Date();
const hour = now.getHours();

let FROM, TO, DIRECTION_LABEL;

if (hour < 12) {
  // Vormittag: Zürich HB nach Bern
  FROM = "Zürich HB";
  TO = "Bern";
  DIRECTION_LABEL = "ZRH ➔ Bern";
} else {
  // Nachmittag: Bern nach Zürich HB
  FROM = "Bern";
  TO = "Zürich HB";
  DIRECTION_LABEL = "Bern ➔ ZRH";
}

const MAX_RESULTS = 3; 

// Farben & Design
const NAVY_BLUE = new Color("#1e3a5f");
const DIRECT_BG = new Color("#0a1628"); 
const IN_TRANSIT_BG = new Color("#2d5a3d"); // Vert foncé pour train en cours
const TEXT_WHITE = Color.white();
const TEXT_GRAY = new Color("#ffffff", 0.6); 
const DELAY_YELLOW = new Color("#ffcc00");

/**
 * Daten von der API laden (nur direkte Verbindungen)
 */
const fetchConnections = async () => {
  // Demander des trains depuis 60 min avant pour capturer ceux en cours (trajet ~1h)
  const now = new Date();
  const earlier = new Date(now.getTime() - 60 * 60 * 1000);
  const timeStr = String(earlier.getHours()).padStart(2, '0') + ":" + String(earlier.getMinutes()).padStart(2, '0');
  const dateStr = earlier.getFullYear() + "-" + String(earlier.getMonth() + 1).padStart(2, '0') + "-" + String(earlier.getDate()).padStart(2, '0');
  
  const url = `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(FROM)}&to=${encodeURIComponent(TO)}&direct=1&limit=10&date=${dateStr}&time=${timeStr}`;
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
  if (!arrPlatform) return "";
  arrPlatform = arrPlatform.replace(/!/g, "");
  const platNum = parseInt(arrPlatform);
  if (isNaN(platNum)) return "";
  
  // Bern → ZRH HB: impair=droite, pair=gauche, sauf 33/34 inversé
  if (TO === "Zürich HB") {
    if (platNum === 33) return "←";
    if (platNum === 34) return "→";
    return platNum % 2 === 1 ? "→" : "←";
  }
  
  // ZRH HB → Bern: 1,3,5,7,9,12=droite / 2,4,6,8,10,13=gauche
  if (TO === "Bern") {
    const rightPlatforms = [1, 3, 5, 7, 9, 12];
    const leftPlatforms = [2, 4, 6, 8, 10, 13];
    if (rightPlatforms.includes(platNum)) return "→";
    if (leftPlatforms.includes(platNum)) return "←";
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
 * Prüft ob der Zug direkt fährt (ZRH-Bern direct: ~56-58 min)
 */
const checkIsDirect = (conn) => {
  let parts = conn.duration.split("d");
  let timePart = parts.length > 1 ? parts[1] : parts[0];
  let [h, m] = timePart.split(":");
  let totalMin = parseInt(h) * 60 + parseInt(m);
  return totalMin <= 60;
}

// --- HAUPTLOGIK ---
const allConns = await fetchConnections();
const currentTime = new Date().getTime();

// Train direct en cours (déjà parti, pas encore arrivé)
const inTransit = allConns.find(c => 
  new Date(c.from.departure).getTime() <= currentTime && 
  new Date(c.to.arrival).getTime() > currentTime &&
  checkIsDirect(c)
);

// Prochains trains directs à partir
const upcoming = allConns
  .filter(c => new Date(c.from.departure).getTime() > currentTime)
  .filter(c => checkIsDirect(c))
  .slice(0, inTransit ? 2 : 3);

let widget = new ListWidget();
widget.backgroundColor = DIRECT_BG;
widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
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
  let rowOuter = widget.addStack();
  rowOuter.backgroundColor = isInTransitRow ? IN_TRANSIT_BG : DIRECT_BG;
  rowOuter.setPadding(6, 8, 6, 8);
  rowOuter.layoutHorizontally();
  rowOuter.centerAlignContent();
  
  // 1. Zeit & Countdown (largeur fixe)
  let timeStack = rowOuter.addStack();
  timeStack.layoutVertically();
  timeStack.size = new Size(42, 0);
  const depDate = new Date(conn.from.departure);
  let topTime = timeStack.addText(String(depDate.getHours()).padStart(2, '0') + ":" + String(depDate.getMinutes()).padStart(2, '0'));
  topTime.font = Font.boldSystemFont(11);
  topTime.textColor = TEXT_WHITE;
  
  let cdLabel;
  if (isInTransitRow) {
    const arrDate = new Date(conn.to.arrival);
    cdLabel = "→" + String(arrDate.getHours()).padStart(2, '0') + ":" + String(arrDate.getMinutes()).padStart(2, '0');
  } else {
    cdLabel = getCountdown(depDate);
  }
  let cdTxt = timeStack.addText(cdLabel);
  cdTxt.font = Font.systemFont(8);
  cdTxt.textColor = isInTransitRow ? Color.yellow() : (cdLabel === "Jetzt" ? Color.yellow() : TEXT_GRAY);
  
  // 2. Gleis (largeur fixe, centré)
  let gleisStack = rowOuter.addStack();
  gleisStack.size = new Size(44, 0);
  gleisStack.layoutHorizontally();
  gleisStack.addSpacer();
  let platform;
  if (isInTransitRow) {
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
  gleisStack.addSpacer();

  // 3. Dauer (largeur fixe, centré)
  let durStack = rowOuter.addStack();
  durStack.size = new Size(32, 0);
  durStack.layoutHorizontally();
  durStack.addSpacer();
  let durTxt = durStack.addText(formatDuration(conn.duration));
  durTxt.font = Font.systemFont(9);
  durTxt.textColor = TEXT_WHITE;
  durTxt.textOpacity = 0.8;
  durStack.addSpacer();

  // 4. Exit ou Delay (largeur fixe, centré)
  let statusStack = rowOuter.addStack();
  statusStack.size = new Size(28, 0);
  statusStack.layoutHorizontally();
  statusStack.addSpacer();
  
  if (isInTransitRow) {
    let exitSide = getExitSide(conn);
    if (exitSide) {
      let exitTxt = statusStack.addText(exitSide);
      exitTxt.font = Font.boldSystemFont(14);
      exitTxt.textColor = Color.yellow();
    }
  } else {
    const delay = conn.from.delay || 0;
    if (delay > 0) {
      let d = statusStack.addText("+" + delay + "'");
      d.textColor = DELAY_YELLOW;
      d.font = Font.boldSystemFont(10);
    }
  }
  statusStack.addSpacer();
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
