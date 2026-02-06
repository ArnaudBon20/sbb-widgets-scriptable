// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: train;

/**
 * SBB Thalwil HB - Auto-Update Loader
 * Ce script télécharge et exécute automatiquement la dernière version depuis GitHub.
 */

const GITHUB_RAW_URL = "https://raw.githubusercontent.com/ArnaudBon20/sbb-widgets-scriptable/main/Widget%20SBB%20Thalwil%20HB.js";
const CACHE_FILE = "_SBB_Thalwil_HB_Cache.js";

const fm = FileManager.local();
const cachePath = fm.joinPath(fm.documentsDirectory(), CACHE_FILE);

let code = null;

// Essayer de télécharger la dernière version
try {
  const req = new Request(GITHUB_RAW_URL);
  req.timeoutInterval = 5;
  code = await req.loadString();
  
  if (code && code.length > 100 && !code.includes("404")) {
    fm.writeString(cachePath, code);
  } else {
    code = null;
  }
} catch (e) {
  // Erreur réseau, utiliser le cache
}

// Si pas de code téléchargé, utiliser le cache
if (!code && fm.fileExists(cachePath)) {
  code = fm.readString(cachePath);
}

if (code) {
  // Exécuter le code
  eval(code);
} else {
  // Erreur
  let widget = new ListWidget();
  widget.backgroundColor = new Color("#8B0000");
  let text = widget.addText("⚠️ Erreur");
  text.textColor = Color.white();
  text.centerAlignText();
  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    widget.presentSmall();
  }
}
Script.complete();
