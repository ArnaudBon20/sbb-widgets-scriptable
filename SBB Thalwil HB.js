// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: train;

/**
 * SBB Thalwil HB - Auto-Update Loader
 * Ce script télécharge et exécute automatiquement la dernière version depuis GitHub.
 */

const GITHUB_RAW_URL = "https://raw.githubusercontent.com/ArnaudBon20/sbb-widgets-scriptable/main/Widget%20SBB%20Thalwil%20HB.js";
const SCRIPT_NAME = "_SBB_Thalwil_HB_Cache";

async function loadWidget() {
  const fm = FileManager.iCloud();
  const dir = fm.documentsDirectory();
  const path = fm.joinPath(dir, SCRIPT_NAME + ".js");
  
  try {
    // Télécharger la dernière version
    const req = new Request(GITHUB_RAW_URL);
    const code = await req.loadString();
    
    if (code && code.length > 100 && !code.includes("404")) {
      // Sauvegarder dans un fichier cache
      fm.writeString(path, code);
    }
  } catch (e) {
    // Ignorer l'erreur de téléchargement, on utilisera le cache
  }
  
  // Vérifier si le fichier cache existe
  if (fm.fileExists(path)) {
    // Attendre le téléchargement iCloud si nécessaire
    if (!fm.isFileDownloaded(path)) {
      await fm.downloadFileFromiCloud(path);
    }
    // Importer et exécuter le module
    const module = importModule(SCRIPT_NAME);
  } else {
    // Pas de cache, afficher erreur
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
