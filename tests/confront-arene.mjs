// Arène 3D de Confrontation : une vraie partie (un joueur et 3 bots) affichée dans l'arène,
// la main, les cibles, la fin du tour, l'historique, le salon, la fiche d'un champion et la vue classique.
import { startServer, player, reporter, IDS, playwright, ROOT, sleep } from "./lib.mjs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports");
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ port: +(process.env.PORT || 8874) });
const t = reporter("Confrontation · arène 3D");
let browser;
// une table à 4 (mode Classique, rôles secrets) : moi et 3 bots, persos prêtés
async function table(A) {
  const c = await A.api("confront/create", { nom: "Arène test", public: false }), gid = c.gid;
  for (let i = 0; i < 3; i++) await A.api("confront/bot", { gid });
  await A.api("confront/act", { gid, action: { type: "lancer" } });
  await A.api("confront/act", { gid, action: { type: "contribuer", cartes: [] } });
  const v = (await A.api("confront/state", { gid })).vue;
  await A.api("confront/act", { gid, action: { type: "choisir", instanceId: v.propositions[0].instanceId } });
  return gid;
}
// toucher une carte de la main par son coin visible (elles se chevauchent)
const idle = (page) => page.waitForFunction(() => !Arena.st?.running && !document.querySelector("#ar-react.on"), null, { timeout: 15000 }).catch(() => null);
async function tap(page, uid) {
  await idle(page);
  const l = page.locator(`.ar-hc[data-cu="${uid}"]`); if (!(await l.waitFor({ timeout: 6000 }).then(() => true).catch(() => false))) return;
  const pt = await pointOn(page, uid);
  if (pt) await page.mouse.click(pt[0], pt[1]);
}
// un point de la carte qui n'est pas recouvert par une voisine
function pointOn(page, uid) {
  return page.evaluate((u) => { const el = document.querySelector(`.ar-hc[data-cu="${u}"]`), r = el.getBoundingClientRect(); for (let y = r.top + 12; y < Math.min(r.bottom, innerHeight - 2); y += 10) for (let x = r.left + 8; x < r.right; x += 10) if (document.elementFromPoint(x, y)?.closest(".ar-hc") === el) return [x, y]; return null; }, uid);
}
try {
  const A = await player(srv.base, IDS.p1, "Aiko");
  await A.api("state");
  const { chromium } = await playwright();
  browser = await chromium.launch();
  for (const [label, vp] of [["ordi", { width: 1366, height: 860 }], ["mobile", { width: 390, height: 844 }]]) {
    t.section(label);
    const gid = await table(A);
    const ctx = await browser.newContext({ viewport: vp, hasTouch: label === "mobile" }), page = await ctx.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await ctx.addInitScript(() => localStorage.setItem("cf-vue", "arene"));
    await page.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Aiko`); await page.waitForTimeout(2000);
    await page.evaluate(() => { window.__arSpeed = 4; });
    await page.goto(`${srv.base}/#/confront/${gid}`);
    const shown = await page.waitForSelector("#ar-root:not([hidden])", { timeout: 30000 }).then(() => true).catch(() => false);
    t.check("l'arène s'ouvre pour une partie en cours", shown);
    if (!shown) { t.check("aucune erreur JavaScript", errors.length === 0, errors); await ctx.close(); continue; }
    await page.evaluate(() => { window.__arSpeed = 4; });
    await page.waitForTimeout(2500);
    t.check("4 champions avec leur étiquette", (await page.locator(".ar-tag").count()) === 4);
    const v0 = (await A.api("confront/state", { gid })).vue;
    t.check("ma main : les cartes du serveur", (await page.locator(".ar-hc").count()) === v0.main.length, { dom: await page.locator(".ar-hc").count(), main: v0.main.length });
    t.check("mon rôle secret est affiché", (await page.locator("#ar-chip").innerText()).includes({ gardien: "Gardien", sentinelle: "Sentinelle", briseur: "Briseur", errant: "Errant" }[v0.monRole]));
    // la fiche du rôle s'ouvre au début : on la ferme
    if (await page.locator("#ar-roleOk").isVisible().catch(() => false)) await page.click("#ar-roleOk");
    await page.screenshot({ path: join(OUT, `arene-${label}-1.png`) });

    // jouer jusqu'à mon tour (les bots jouent), puis une carte et la fin du tour
    let mine = false;
    for (let i = 0; i < 40 && !mine; i++) {
      const v = (await A.api("confront/state", { gid })).vue;
      if (v.phase === "fin") break;
      mine = v.attente?.pid === v.moi && v.attente.kind === "tour";
      if (!mine && v.attente?.pid === v.moi) { // réaction : on encaisse depuis l'arène
        await page.waitForSelector("#ar-react.on", { timeout: 8000 }).catch(() => null);
        const b = page.locator("#ar-reactBtns button").last(); if (await b.count()) await b.click().catch(() => null);
      }
      await sleep(900);
    }
    t.check("mon tour arrive", mine);
    if (mine) {
      await page.waitForTimeout(2500);
      const v = (await A.api("confront/state", { gid })).vue, seq0 = Math.max(...v.journal.map((e) => e.seq));
      const play = v.actions.find((a) => a.type === "jouer"); await idle(page);
      if (play) {
        const def = v.main.find((c) => c.uid === play.carte).def, card = page.locator(`.ar-hc[data-cu="${play.carte}"]`); await card.waitFor({ timeout: 8000 }).catch(() => null); await idle(page);
        if (play.cible) { // glisser la carte sur l'étiquette du champion visé
          const a = await card.boundingBox(), b = await page.locator(`.ar-tag[data-pid="${play.cible}"] .ar-nm`).boundingBox();
          const [ax, ay] = (await pointOn(page, play.carte)) || [a.x + a.width * .5, a.y + 24]; await page.mouse.move(ax, ay); await page.mouse.down();
          for (let k = 1; k <= 12; k++) await page.mouse.move(ax + (b.x + b.width / 2 - ax) * k / 12, ay + (b.y + b.height / 2 - ay) * k / 12);
          await page.screenshot({ path: join(OUT, `arene-${label}-2-viser.png`) });
          await page.mouse.up();
          if (await page.locator(".ar-choices").isVisible().catch(() => false)) await page.click(".ar-choices button >> nth=0");
        } else { await tap(page, play.carte); await page.waitForTimeout(400); await tap(page, play.carte); }
        await page.waitForTimeout(1500);
        const after = (await A.api("confront/state", { gid })).vue;
        t.check(`carte jouée depuis la main (${def})`, after.journal.some((e) => e.seq > seq0 && e.type === "joue" && e.pid === after.moi), { def, cible: play.cible, hint: await page.locator("#ar-hint").textContent(), toast: await page.locator("#toast").textContent().catch(() => ""), sel: await page.evaluate(() => Arena.st.sel), last: after.journal.slice(-5).map((e) => e.seq + e.type), seq0 });
        await page.screenshot({ path: join(OUT, `arene-${label}-3-joue.png`) });
      }
      // fin du tour (en défaussant si besoin)
      await page.waitForTimeout(2500);
      for (let k = 0; k < 6; k++) {
        const v2 = (await A.api("confront/state", { gid })).vue, fin = v2.actions.find((a) => a.type === "finir");
        if (!fin) break;
        if (fin.aDefausser) { await page.click("#ar-end", { force: true }); for (const c of v2.main.slice(0, fin.aDefausser)) { await tap(page, c.uid); await page.waitForTimeout(250); } await page.screenshot({ path: join(OUT, `arene-${label}-3b-defausse.png`) }); }
        await page.click("#ar-end", { force: true }); await page.waitForTimeout(1500);
      }
      const v3 = (await A.api("confront/state", { gid })).vue;
      t.check("fin du tour depuis l'arène", !(v3.attente?.pid === v3.moi && v3.attente.kind === "tour") || v3.phase === "fin");
    }
    // historique
    if (label === "mobile") await page.click("#ar-logArr"); else await page.click("#ar-tabLog");
    if (label !== "mobile") await page.click("#ar-tabLog");
    t.check("historique : des lignes de partie", (await page.locator(".ar-le").count()) > 3);
    // salon : une émote et un message
    if (label === "mobile") await page.click("#ar-logArr");
    await page.click("#ar-emoBtn"); await page.screenshot({ path: join(OUT, `arene-${label}-4a-emotes.png`) }); await page.click('[data-emo="salut"]'); await page.waitForTimeout(800);
    await page.click("#ar-tabChat"); if (label === "mobile" && !(await page.locator("#ar-chatIn").isVisible())) await page.click("#ar-logArr"); await page.fill("#ar-chatIn", "Bonne partie !"); await page.click("#ar-chatForm button"); await page.waitForTimeout(800);
    const sal = (await A.api("confront/state", { gid })).salon;
    t.check("salon : émote puis message enregistrés par le serveur", sal.length >= 1 && sal.some((m) => m.kind === "emote"), sal);
    t.check("salon : affiché dans l'arène", (await page.locator(".ar-cm").count()) >= 1);
    await page.screenshot({ path: join(OUT, `arene-${label}-4-salon.png`) });
    // fiche d'un champion (moi compris)
    await page.click(`.ar-tag[data-pid="${A.id}"] .ar-nm`); await page.waitForTimeout(300);
    t.check("fiche de mon champion : style, arme et équipement en clair", (await page.locator("#ar-sheet").textContent()).includes("Arme") && (await page.locator("#ar-sheet").textContent()).includes("Style"));
    await page.screenshot({ path: join(OUT, `arene-${label}-5-fiche.png`) });
    await page.click("#ar-sheet .ar-x");
    // seulement l'arène : plus de bouton pour passer à la vue classique
    t.check("plus de bouton « Vue classique »", (await page.locator("#ar-classic").count()) === 0 && (await page.locator('[data-act="cf-arene"]').count()) === 0);
    t.check("« Quitter la partie » toujours visible en jeu", (await page.locator("#ar-quit").isVisible()) && (await page.locator("#ar-quit").innerText()).includes("Quitter la partie"));
    // deux touchers rapprochés (en rendu logiciel, attendre que le bouton soit « stable » dépasse les 4 s de la confirmation)
    await page.locator("#ar-quit").dispatchEvent("click"); await page.waitForTimeout(300);
    await page.locator("#ar-quit").dispatchEvent("click"); await page.waitForFunction(() => location.hash === "#/confront", null, { timeout: 10000 }).catch(() => {}); await page.waitForTimeout(800);
    const quitted = (await A.api("confront/state", { gid })).vue;
    t.check("quitter la partie : abandon confirmé, retour aux salons", (await page.locator("#ar-root").isHidden()) && page.url().endsWith("#/confront") && (quitted.phase === "fin" || quitted.joueurs.find((j) => j.id === A.id)?.vivant === false), quitted.phase);
    t.check("aucune erreur JavaScript", errors.length === 0, errors);
    await A.api("confront/act", { gid, action: { type: "abandon" } });
    await ctx.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
