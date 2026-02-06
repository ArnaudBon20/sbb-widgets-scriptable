# SBB Widgets for Scriptable

Widgets iOS pour afficher les horaires des trains SBB/CFF directement sur l'écran d'accueil.

## Widgets disponibles

### Widget SBB Thalwil HB
Affiche les prochains trains entre **Thalwil** et **Zürich HB** (et inversement selon l'heure).
- Matin (avant 12h) : Thalwil → Zürich HB
- Après-midi/Soir : Zürich HB → Thalwil

### Widget SBB Bern HB
Affiche les prochains trains directs entre **Zürich HB** et **Bern** (et inversement selon l'heure).
- Matin (avant 12h) : Zürich HB → Bern
- Après-midi/Soir : Bern → Zürich HB

## Fonctionnalités

- 🚂 **3 prochains trains** affichés
- 🎯 **Trains directs** mis en évidence (fond plus foncé)
- ⏱️ **Compte à rebours** avant le départ
- 🚉 **Numéro de quai** affiché
- ⬅️➡️ **Côté de sortie** à l'arrivée (gauche/droite)
- 🟢 **Train en cours** : quand tu es dans le train, la première ligne devient verte et affiche le quai d'arrivée + temps restant + côté de sortie
- ⚠️ **Retards** affichés en jaune
- 🔄 **Mise à jour automatique** toutes les 10 minutes
- 📱 **Tap** pour ouvrir l'app SBB Mobile

## Installation

### Méthode 1 : Installation manuelle
1. Installer [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) sur iOS
2. Copier le contenu du fichier `.js` souhaité
3. Créer un nouveau script dans Scriptable et coller le code
4. Ajouter un widget Scriptable sur l'écran d'accueil
5. Configurer le widget pour utiliser le script

### Méthode 2 : Import direct (recommandé)
1. Sur iPhone, ouvrir ce lien dans Safari :
   - [Widget SBB Thalwil HB](https://raw.githubusercontent.com/VOTRE_USERNAME/sbb-widgets-scriptable/main/Widget%20SBB%20Thalwil%20HB.js)
   - [Widget SBB Bern HB](https://raw.githubusercontent.com/VOTRE_USERNAME/sbb-widgets-scriptable/main/Widget%20SBB%20Bern%20HB.js)
2. Scriptable proposera d'importer le script automatiquement

## Personnalisation

Tu peux modifier les variables au début du script pour adapter les trajets :
```javascript
let FROM = "Thalwil";
let TO = "Zürich HB";
let DIRECTION_LABEL = "Thalwil ➔ HB";
```

### Règles de sortie (côté de sortie du train)

**Zürich HB (arrivée depuis Thalwil/Bern) :**
- Quais impairs (1, 3, 5...) → Sortie à droite
- Quais pairs (2, 4, 6...) → Sortie à gauche
- Exception : Quai 33 → gauche, Quai 34 → droite

**Thalwil (arrivée depuis ZRH HB) :**
- Quai 3 → Sortie à droite
- Quai 4 → Sortie à gauche

**Bern (arrivée depuis ZRH HB) :**
- Quais 1, 3, 5, 7, 9, 12 → Sortie à droite
- Quais 2, 4, 6, 8, 10, 13 → Sortie à gauche

## API

Les widgets utilisent l'API publique [transport.opendata.ch](https://transport.opendata.ch/) pour récupérer les horaires en temps réel.

## Licence

MIT License - Libre d'utilisation et de modification.
