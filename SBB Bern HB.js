// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: train;

/**
 * SBB Bern HB - Auto-Update Loader
 * Ce script télécharge et exécute automatiquement la dernière version depuis GitHub.
 */

const GITHUB_RAW_URL = "https://raw.githubusercontent.com/ArnaudBon20/sbb-widgets-scriptable/main/Widget%20SBB%20Bern%20HB.js";

async function loadWidget() {
  try {
    const req = new Request(GITHUB_RAW_URL);
    const code = await req.loadString();
    
    if (code && code.length > 100) {
      // Exécuter le code téléchargé
      await eval(code);
    } else {
      throw new Error("Code invalide");
    }
  } catch (e) {
    // En cas d'erreur, afficher un message
    let widget = new ListWidget();
    widget.backgroundColor = new Color("#8B0000");
    let text = widget.addText("⚠️ Erreur de chargement");
    text.textColor = Color.white();
    text.centerAlignText();
    
    if (config.runsInWidget) {
      Script.setWidget(widget);
    } else {
      widget.presentSmall();
    }
  }
}

await loadWidget();
Script.complete();
