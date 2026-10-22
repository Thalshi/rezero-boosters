"""Découpe une planche d'illustrations (une seule image avec toutes les cases) en un lot de fichiers
que tools/illus/import.py sait lire : <carte>.png, branche-<b>.png, skin-<s>.png, table.png.
Usage : python3 tools/illus/planche.py <planche.png> <dossier_du_lot>
Les cases sont trouvées automatiquement (fond sombre entre les cases) ; l'ordre de lecture donne leur nom."""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

# ordre des cases sur la planche finale (3 rangées : 9, 9, 7), lu de gauche à droite
CARTES = ["frappe", "parade", "riposte", "elixir", "festin", "lien", "larcin", "dissipation", "inspiration",
          "revelation", "etal", "defi", "pluie", "onde", "lames", "lance", "baton", "arc",
          "canon", "voile", "cape", "oeil", "kanji", "sceau", "orbe"]
BRANCHES = ["assaut", "defense", "stratege", "voleur", "precision", "resistance", "survie", "chance"]
SKINS = ["chroma", "arcade", "neon", "lune", "astral", "prestige"]

def segments(v, keep, minw):
    """Plages consécutives où keep(v[i]) est vrai, plus larges que minw."""
    out, s = [], None
    for i, x in enumerate(list(v) + [None]):
        ok = x is not None and keep(x)
        if ok and s is None: s = i
        if not ok and s is not None:
            if i - s > minw: out.append((s, i))
            s = None
    return out

def main(src, dst):
    im = Image.open(src).convert("RGB"); a = np.asarray(im).astype(int); lum = a.sum(2); W, H = im.size
    dst.mkdir(parents=True, exist_ok=True)
    # 1. les trois rangées de cartes (en haut), puis chaque case : colonnes presque toutes sombres = séparations
    rows = segments((lum[:, 8:W - 8] < 90).mean(1), lambda x: x < .9, 20)[:3]
    boxes = []
    for y0, y1 in rows:
        for x0, x1 in segments((lum[y0:y1] < 90).mean(0), lambda x: x < .85, 40): boxes.append((x0, y0, x1, y1))
    assert len(boxes) == len(CARTES), f"{len(boxes)} cases de cartes trouvées au lieu de {len(CARTES)}"
    for name, (x0, y0, x1, y1) in zip(CARTES, boxes):
        im.crop((x0 + 7, y0 + 7, x1 - 7, y1 - 7)).save(dst / f"{name}.png")  # sans le cadre de la case
    # 2. emblèmes (en bas à gauche) : détourés, le fond sombre devient transparent
    ey0, ey1 = int(H * .565), int(H * .70)
    cols = segments((lum[ey0:ey1, :W // 2 + 60] > 200).mean(0), lambda x: x > .05, 20)
    assert len(cols) == len(BRANCHES), f"{len(cols)} emblèmes trouvés"
    for name, (x0, x1) in zip(BRANCHES, cols):
        rr = segments((lum[ey0 - 10:ey1 + 20, x0:x1] > 200).mean(1), lambda x: x > .05, 5)
        y0, y1 = ey0 - 10 + rr[0][0], ey0 - 10 + rr[0][1]
        # seulement la colonne de l'emblème (pas les voisins), centrée dans un carré transparent
        e = im.crop((x0 - 3, y0 - 3, x1 + 3, y1 + 3)).convert("RGBA"); px = np.asarray(e).copy()
        px[..., 3] = np.clip((px[..., :3].astype(int).sum(2) - 45) * 4, 0, 255).astype("uint8")
        e = Image.fromarray(px, "RGBA"); side = max(e.size) + 8
        sq = Image.new("RGBA", (side, side), (0, 0, 0, 0)); sq.paste(e, ((side - e.width) // 2, (side - e.height) // 2))
        sq.save(dst / f"branche-{name}.png")
    # 3. fonds de skins (rangée du haut, à droite)
    sy = segments((lum[int(H * .55):int(H * .74), W * 9 // 16:W - 8] > 90).mean(1), lambda x: x > .6, 10)[0]
    sy0, sy1 = int(H * .55) + sy[0], int(H * .55) + sy[1]
    sc = segments((lum[sy0:sy1, W * 9 // 16 - 20:] < 60).mean(0), lambda x: x < .5, 30)
    assert len(sc) == len(SKINS), f"{len(sc)} fonds de skins trouvés"
    for name, (x0, x1) in zip(SKINS, sc):
        im.crop((W * 9 // 16 - 20 + x0 + 2, sy0 + 2, W * 9 // 16 - 20 + x1 - 2, sy1 - 2)).save(dst / f"skin-{name}.png")
    # 4. fond de table (en bas à gauche)
    ty = segments((lum[int(H * .73):, 10:W * 7 // 16] > 90).mean(1), lambda x: x > .6, 10)[0]
    ty0, ty1 = int(H * .73) + ty[0], int(H * .73) + ty[1]
    tx = segments((lum[ty0:ty1, :W // 2] > 90).mean(0), lambda x: x > .6, 10)[0]
    im.crop((tx[0] + 4, ty0 + 4, tx[1] - 4, ty1 - 4)).save(dst / "table.png")
    print(f"{len(boxes)} cartes, {len(cols)} emblèmes, {len(sc)} fonds de skins, 1 fond de table → {dst}")

if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
