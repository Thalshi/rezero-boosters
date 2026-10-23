"""Portrait de carte à partir d'un visuel : recadrage au format carte (344:480), effacement du texte,
super-résolution si la source est petite, puis rangement dans assets/persos/<id>.jpg et src/app.js (PHOTO).

  python3 tools/illus/persos.py IMAGE ID [--box x0,y0,x1,y1] [--erase x0,y0,x1,y1 ...] [--apercu]

--box     : la zone à garder (coordonnées dans l'image source) ; sans --box, toute l'image recadrée au centre.
--erase   : zones de texte à effacer (sur fond uni, l'effacement est invisible).
--apercu  : n'écrit que le résultat dans /tmp pour vérifier, sans toucher au jeu.
Ensuite : python3 build.py (le site sert le portrait en fichier à part, la version claude.ai l'intègre)."""
import argparse, base64, pathlib, re, sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[2]
W, H = 516, 720


def boxarg(s):
    v = [int(float(x)) for x in s.split(",")]
    if len(v) != 4: raise argparse.ArgumentTypeError("x0,y0,x1,y1")
    return v


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image"); ap.add_argument("id")
    ap.add_argument("--box", type=boxarg); ap.add_argument("--erase", type=boxarg, action="append", default=[])
    ap.add_argument("--apercu", action="store_true")
    a = ap.parse_args()
    if not re.fullmatch(r"[a-z][a-z0-9]*", a.id): sys.exit("id : lettres minuscules et chiffres seulement (ex. kenzo, ogre5)")
    im = np.array(Image.open(a.image).convert("RGB"))
    if a.erase:
        import cv2
        m = np.zeros(im.shape[:2], np.uint8)
        for x0, y0, x1, y1 in a.erase: m[max(0, y0):y1, max(0, x0):x1] = 255
        im = cv2.inpaint(im, m, 9, cv2.INPAINT_TELEA)
    x0, y0, x1, y1 = a.box or (0, 0, im.shape[1], im.shape[0])
    # garder exactement le format des cartes, centré sur la zone demandée
    w, h = x1 - x0, y1 - y0
    if w / h > 344 / 480: c, w = (x0 + x1) / 2, h * 344 / 480; x0, x1 = int(c - w / 2), int(c + w / 2)
    else: c, h = (y0 + y1) / 2, w * 480 / 344; y0, y1 = int(max(0, c - h / 2)), int(c + h / 2)
    crop = Image.fromarray(im[max(0, y0):y1, max(0, x0):x1])
    if crop.width < W:
        sys.path.insert(0, str(pathlib.Path(__file__).parent)); import esr
        out = esr.up4(crop).resize((W, H), Image.LANCZOS)
    else:
        out = crop.resize((W, H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    dest = pathlib.Path("/tmp") / f"apercu-{a.id}.jpg" if a.apercu else ROOT / "assets/persos" / f"{a.id}.jpg"
    out.save(dest, quality=88, optimize=True, progressive=True)
    print("portrait :", dest, f"(source {crop.width} px de large)")
    if a.apercu: return
    # src/app.js : remplace l'entrée PHOTO.<id> ou l'ajoute en tête
    p = ROOT / "src/app.js"; s = p.read_text(encoding="utf8")
    data = "data:image/jpeg;base64," + base64.b64encode(dest.read_bytes()).decode()
    s2, n = re.subn(r'(\n\s*"?%s"?\s*:\s*")data:image/\w+;base64,[^"]+(")' % re.escape(a.id), lambda m: m.group(1) + data + m.group(2), s, count=1)
    if not n: s2 = s.replace("const PHOTO = {\n", f'const PHOTO = {{\n  {a.id}: "{data}",\n', 1)
    p.write_text(s2, encoding="utf8")
    print("src/app.js :", "remplacé" if n else "ajouté", f"PHOTO.{a.id}")


if __name__ == "__main__":
    main()
