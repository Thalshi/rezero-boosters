"""Importe un lot d'illustrations : rogne les bords (restes de la planche), réduit, compresse,
range dans assets/illus/ et génère src/illus.js (images intégrées, pour le site et la version claude.ai).
Usage : python3 tools/illus/import.py <dossier_du_lot>
Une planche (une seule image) se découpe d'abord avec tools/illus/planche.py."""
import base64, io, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else None
OUT = ROOT / "assets/illus"
# les 25 cartes ; un fichier du lot porte le nom de sa carte (tools/illus/planche.py les nomme ainsi)
CARTES = ["frappe", "parade", "riposte", "elixir", "festin", "lien", "larcin", "dissipation", "inspiration",
          "revelation", "etal", "defi", "pluie", "onde", "lames", "lance", "baton", "arc",
          "canon", "voile", "cape", "oeil", "kanji", "sceau", "orbe"]
BRANCHES = ["assaut", "defense", "stratege", "voleur", "precision", "resistance", "survie", "chance"]
SKINS = ["chroma", "arcade", "neon", "lune", "astral", "prestige"]

def prep(path, size, crop=0.0, fmt="JPEG", q=78):
    """size = (largeur, hauteur) imposées, ou un nombre : la hauteur, en gardant les proportions."""
    im = Image.open(path).convert("RGB" if fmt == "JPEG" else "RGBA")
    w, h = im.size; dx, dy = int(w * crop), int(h * crop)
    im = im.crop((dx, dy, w - dx, h - dy)); w, h = im.size
    im = im.resize(size if isinstance(size, tuple) else (round(w * size / h), size), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, fmt, quality=q, optimize=True) if fmt == "JPEG" else im.save(buf, "WEBP", quality=80)
    return buf.getvalue()

if SRC:
    OUT.mkdir(parents=True, exist_ok=True)
    for f in OUT.glob("*"): f.unlink()  # un lot remplace entièrement le précédent
    for card in CARTES:
        if (SRC / f"{card}.png").exists(): (OUT / f"carte-{card}.jpg").write_bytes(prep(SRC / f"{card}.png", 220))
    for b in BRANCHES: (OUT / f"branche-{b}.webp").write_bytes(prep(SRC / f"branche-{b}.png", (112, 112), fmt="WEBP"))
    for s in SKINS: (OUT / f"skin-{s}.jpg").write_bytes(prep(SRC / f"skin-{s}.png", 400, q=72))
    if (SRC / "table.png").exists(): (OUT / "decor-table.jpg").write_bytes(prep(SRC / "table.png", 420, q=72))

# src/illus.js : toujours régénéré depuis assets/illus (sans le lot d'origine)
def uri(p): return f"data:image/{'webp' if p.suffix == '.webp' else 'jpeg'};base64," + base64.b64encode(p.read_bytes()).decode()
group = lambda prefix: {p.stem[len(prefix):]: uri(p) for p in sorted(OUT.glob(prefix + "*"))}
lines = ["// ===== Illustrations (générées par tools/illus/import.py depuis assets/illus : ne pas modifier à la main) ====="]
for name, prefix in [("ILLUS_CARTE", "carte-"), ("ILLUS_BRANCHE", "branche-"), ("ILLUS_SKIN", "skin-"), ("ILLUS_DECOR", "decor-")]:
    g = group(prefix)
    lines.append(f"const {name} = {{")
    lines += [f'  "{k}": "{v}",' for k, v in g.items()]
    lines.append("};")
(ROOT / "src/illus.js").write_text("\n".join(lines) + "\n", encoding="utf8")
size = sum(p.stat().st_size for p in OUT.iterdir())
print(f"{len(list(OUT.iterdir()))} images, {size // 1024} Ko dans assets/illus ; src/illus.js {(ROOT / 'src/illus.js').stat().st_size // 1024} Ko")
