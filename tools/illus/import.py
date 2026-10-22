"""Importe un lot d'illustrations : rogne les bords (restes de la planche), réduit, compresse,
range dans assets/illus/ et génère src/illus.js (images intégrées, pour le site et la version claude.ai).
Usage : python3 tools/illus/import.py <dossier_du_lot>
La table CARTES dit quelle image du lot va sur quelle carte : le lot provisoire avait des noms mélangés."""
import base64, io, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else None
OUT = ROOT / "assets/illus"
# carte officielle → fichier du lot qui la représente (premier lot : réattribué d'après ce que montre l'image)
CARTES = {
    "frappe": "frappe",          # coup d'énergie rouge
    "parade": "parade",          # bouclier doré
    "elixir": "riposte",         # fiole verte
    "lames": "elixir",           # deux épées croisées
    "sceau": "festin",           # silhouette enchaînée
    "arc": "lien",               # archer
    "canon": "larcin",           # canon à main
    "larcin": "revelation",      # main qui vole des pièces
    "inspiration": "inspiration",# livre lumineux
    "dissipation": "onde",       # main dans un tourbillon violet
    "revelation": "baton",       # étoile de lumière
    "oeil": "arc",               # œil rouge
    "lien": "sceau",             # deux personnes qui se passent une lumière
    "cape": "etal",              # silhouette encapuchonnée
    "onde": "defi",              # explosion d'éclats rouges
    "voile": "oeil",             # silhouette dans le vent bleu
    "riposte": "kanji",          # main qui renvoie un éclair
    "orbe": "orbe",              # fleur d'énergie violette
    "defi": "voile",             # combattants dans une fumée rouge
    "pluie": "lance",            # pluie d'éclats de cristal
    # sans image correspondante dans ce lot (gardent l'icône) : lance, baton, festin, etal, kanji
}
BRANCHES = ["assaut", "defense", "stratege", "voleur", "precision", "resistance", "survie", "chance"]
SKINS = ["chroma", "arcade", "neon", "lune", "astral", "prestige"]

def prep(path, size, crop=0.035, fmt="JPEG", q=74):
    im = Image.open(path).convert("RGB" if fmt == "JPEG" else "RGBA")
    w, h = im.size; dx, dy = int(w * crop), int(h * crop)
    im = im.crop((dx, dy, w - dx, h - dy)).resize(size, Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, fmt, quality=q, optimize=True) if fmt == "JPEG" else im.save(buf, "WEBP", quality=80)
    return buf.getvalue()

if SRC:
    OUT.mkdir(parents=True, exist_ok=True)
    for card, f in CARTES.items(): (OUT / f"carte-{card}.jpg").write_bytes(prep(SRC / f"{f}.png", (240, 336)))
    for b in BRANCHES: (OUT / f"branche-{b}.webp").write_bytes(prep(SRC / f"branche-{b}.png", (112, 112), crop=0.02, fmt="WEBP"))
    for s in SKINS: (OUT / f"skin-{s}.jpg").write_bytes(prep(SRC / f"skin-{s}.png", (300, 400), q=70))

# src/illus.js : toujours régénéré depuis assets/illus (sans le lot d'origine)
def uri(p): return f"data:image/{'webp' if p.suffix == '.webp' else 'jpeg'};base64," + base64.b64encode(p.read_bytes()).decode()
group = lambda prefix: {p.stem[len(prefix):]: uri(p) for p in sorted(OUT.glob(prefix + "*"))}
lines = ["// ===== Illustrations (générées par tools/illus/import.py depuis assets/illus : ne pas modifier à la main) ====="]
for name, prefix in [("ILLUS_CARTE", "carte-"), ("ILLUS_BRANCHE", "branche-"), ("ILLUS_SKIN", "skin-")]:
    g = group(prefix)
    lines.append(f"const {name} = {{")
    lines += [f'  "{k}": "{v}",' for k, v in g.items()]
    lines.append("};")
(ROOT / "src/illus.js").write_text("\n".join(lines) + "\n", encoding="utf8")
size = sum(p.stat().st_size for p in OUT.iterdir())
print(f"{len(list(OUT.iterdir()))} images, {size // 1024} Ko dans assets/illus ; src/illus.js {(ROOT / 'src/illus.js').stat().st_size // 1024} Ko")
