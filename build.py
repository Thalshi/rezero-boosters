"""Assemble index.html (un seul fichier, images incluses) à partir de src/ et art/."""
import base64, pathlib

ROOT = pathlib.Path(__file__).parent
FONTS_OLD = "family=Unbounded:wght@500;700;900&family=Zen+Kaku+Gothic+New:wght@500;700&family=JetBrains+Mono:wght@500"
FONTS_NEW = "family=Cinzel:wght@600;700;900&family=Barlow:wght@500;600;700&family=Barlow+Condensed:wght@500;600;700"
SKELETON = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n')


def uri(name):
    return "data:image/jpeg;base64," + base64.b64encode((ROOT / "art" / f"{name}.jpg").read_bytes()).decode()


def main():
    head = (ROOT / "src/head.css.html").read_text(encoding="utf8").rstrip()
    head = head[: -len("</style>")].replace(FONTS_OLD, FONTS_NEW)
    body = (ROOT / "src/body.html").read_text(encoding="utf8")
    art = (ROOT / "src/art.js").read_text(encoding="utf8").replace(
        "};\n", f'  rayzoS: "{uri("rayzoS")}",\n  rayzoH: "{uri("rayzoH")}",\n}};\n', 1)
    page = (head + body).replace("/*ART*/", art)
    (ROOT / "index.html").write_text(SKELETON + page + "\n</body>\n</html>\n", encoding="utf8")
    print("index.html", len(page))


if __name__ == "__main__":
    main()
