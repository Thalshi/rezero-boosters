"""Assemble index.html (un seul fichier, images incluses) à partir de src/ et art/."""
import base64, pathlib, re

ROOT = pathlib.Path(__file__).parent
SKELETON = ('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n')


def uri(name):
    return "data:image/jpeg;base64," + base64.b64encode((ROOT / "art" / f"{name}.jpg").read_bytes()).decode()


def main():
    head = (ROOT / "src/head.css.html").read_text(encoding="utf8").rstrip()
    # la page : structure (shell.html) puis un seul script = règles + images + logique + pages + démarrage
    shell = (ROOT / "src/shell.html").read_text(encoding="utf8")
    js = "\n".join((ROOT / f"src/{n}.js").read_text(encoding="utf8") for n in ("app", "views", "views2", "views3", "coffre", "boot"))
    body = "</style>\n" + shell + "\n<script>\n/*ART*/\n" + js + "\n</script>\n"
    head = head[: -len("</style>")]
    art = (ROOT / "src/art.js").read_text(encoding="utf8").replace(
        "};\n", f'  rayzoS: "{uri("rayzoS")}",\n  rayzoH: "{uri("rayzoH")}",\n  billyFA: "{uri("billyFA")}",\n  reichiFA: "{uri("reichiFA")}",\n}};\n', 1)
    game = (ROOT / "src/game.js").read_text(encoding="utf8")
    # le serveur importe les mêmes règles que le navigateur
    names = re.findall(r"^(?:const|function|let) (\w+)", game, re.M)
    (ROOT / "worker/game.js").write_text("// Généré par build.py à partir de src/game.js : ne pas modifier ici.\n" + game + "\nexport { " + ", ".join(names) + " };\n", encoding="utf8")
    body = body.replace("<script>\n/*ART*/", "<script>\n" + game + "\n/*ART*/", 1)
    page = (head + body).replace("/*ART*/", art)
    # claude.ai : la page telle quelle (le site l'enveloppe lui-même)
    (ROOT / "artifact.html").write_text(page, encoding="utf8")
    # Cloudflare : page complète + connexion Discord, servie depuis public/
    discord = (ROOT / "src/discord.js").read_text(encoding="utf8")
    site = page.replace("<script>", "<script>\n" + discord + "\n</script>\n<script>", 1)
    (ROOT / "public").mkdir(exist_ok=True)
    (ROOT / "public/index.html").write_text(SKELETON + site + "\n</body>\n</html>\n", encoding="utf8")
    print("public/index.html", len(site), "· artifact.html", len(page))


if __name__ == "__main__":
    main()
