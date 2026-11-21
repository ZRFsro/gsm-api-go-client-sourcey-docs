# Vili Fencing Time Live adatgyűjtője

A meglévő `vili-vivonaplo` Supabase Edge Function `collector-schedule`,
`collector-discover` és `collector-update` műveleteit használja. Nem igényel
Supabase service-role kulcsot. A `VILI_TOKEN` SHA-256 lenyomatának aktív
bejegyzéssel kell rendelkeznie az `ftl_collector_keys` táblában.

## Működés

- A NAS-on külön Chromium-profil őrzi a Fencing Time Live-belépést.
- A gyűjtő a böngésző külön lapján dolgozik; a belépési lapot nem kezeli.
- A folyamatban lévő, ütemezett versenyeket körülbelül percenként ellenőrzi.
- Ha a naplóban csak a teljes Fencing Time Live-program szerepel, a gyűjtő a programból keresi ki a versenyszámot, ellenőrzi Vili nevét a névsorban, és a megtalált versenyszámot a meglévő bejegyzéshez köti. A keresést a következő futáskor megismétli, amíg nincs egyértelmű találat.
- A már végleges eredményt óránként ellenőrzi újra. A fogadó jelenleg az
  elmúlt 3 nap és a következő 21 nap rögzített versenyeit adja vissza.
- Az új versenyeket a FTL utolsó 10 napos és következő 7 napos listáján keresi,
  alapértelmezésben Magyarországon, Szlovákiában és Csehországban (`HUN,SVK,CZE`).
  A keresés óránként indul újra, legfeljebb 20 versennyel és versenyenként
  30 versenyszámmal, rövid részletekben, hogy az élő követést ne tartsa fel.
- Csak a teljes `STERMENSZKY Vilmos` név pontos egyezése után hoz létre
  versenyt vagy ír be eredményt. A program helyezést, létszámot, csoportasszókat
  és a megjelenített kieséses táblát olvassa. Összetettebb, több külön táblás
  lebonyolítások további ellenőrzést igényelhetnek.
- Bejelentkezési vagy oldalletöltési hiba esetén nem talál ki pontszámokat.
  A már tárolt eredmény megmarad, az import állapota jelzi a hibát.

## Telepítés és karbantartás

A `compose.example.yaml` a forrásból történő telepítés mintája. Tartsd a
`collector.mjs` fájlt a Compose-fájl mellett, és töltsd ki a szükséges
környezeti változókat a helyi `.env` fájlban vagy a projekt beállításaiban.
A NAS-on
létrehozott projekt ugyanezt a programot beágyazva is tartalmazhatja, ezért
önmagában feltölthető. A valódi jelszavakat és gyűjtőkulcsot tartalmazó
telepítési fájl nem való nyilvános GitHub-tárolóba.

Beállítások: `NAS_IP`, `BROWSER_PASSWORD`, `VILI_API`, `VILI_TOKEN`.
A böngésző címe `https://<NAS_IP>:7901/`, felhasználóneve `vili`.
A böngésző saját HTTPS-tanúsítványt használhat. A belépést a tulajdonos
a NAS-böngészőben végzi el. A Google-jelszót és a sütiket a gyűjtő nem exportálja.

A 9222-es böngészővezérlő port nincs közzétéve: csak a két konténer közös
hálózati környezetében érhető el. A böngésző felületét ne irányítsd ki az
internetre. A NAS felületén a két konténer naplójában követhető a működés.
A gyűjtő aktuális állapota a saját kötetén a `/state/status.json` fájlba kerül.
A `browser-profile` kötetet meg kell őrizni újratelepítéskor.

Referencia: [LinuxServer Chromium dokumentáció](https://docs.linuxserver.io/images/docker-chromium/).

## Ellenőrzött mintaverseny

2026. november 15-én a program eredménykinyerőjét a bejelentkezett FTL-oldalak
látható táblázatain ellenőriztük:

- Jövő Bajnokai Törekvés 2026, U10 Férfi Tőr, november 14.
- Helyezés: 17 / 29.
- Első csoport: 4 asszó; második csoport: 5 asszó.
- Tábla 32: MOYS Lőrinc, 6–10.
- Összesen: 10 asszó, 7 győzelem, 3 vereség.
- Az U12 Férfi Tőr névsorán a program nem igazolta Vili részvételét.

A NAS–Supabase import, a gyűjtő újraindítása, majd a böngésző és gyűjtő
közös újraindítása után is sikeres volt: 17/29 helyezés, 10 asszó,
7 győzelem, 3 vereség. A belépés megmaradt, az azonos eredmények ismétlése
nem készített másolatot.

A csoporthelyezések NAS-importja is ellenőrzött:
- 1. kör: csoporton belül 3/5, összesített csoporteredmény 15/29.
- 2. kör: csoporton belül 1/6, összesített csoporteredmény 3/29.

## Független keresési próba

A `node /tmp/collector.mjs --self-test` ugyanazt a keresést és eredményolvasást
használja, de üres, memóriában tárolt tesztnaplóval indul. Nem kér előre
versenylinket, és nem ír a valódi naplóba. Külön böngészőlapját a végén bezárja.
Az eredmény a `/state/discovery-test.json`, az állapot a
`/state/discovery-test-status.json` fájlba kerül. A sikeres futás önmagában
nem jelent találatot: az `events` listát és a beolvasott eredményeket is
ellenőrizni kell.

A keresés kezeli a FTL késve betöltődő listáját, a menetrend `#today`
címkiegészítését és a keskeny nézetben vizuálisan elrejtett versenydátumot.
Egy jövőbeli, még nem közzétett nevezést a program nem tud előre megtalálni.

2026. november 15., 15:36 UTC: a teljes NAS-önellenőrzés sikeres.
Üres tesztnaplóból, előre megadott versenylink nélkül 6 magyar/szlovák
versenyt vizsgált meg. Pontos névegyezéssel egy versenyszámot talált:
U10 Férfi Tőr – Jövő Bajnokai Törekvés 2026. Beolvasta a 17/29-es
helyezést és mind a 10 asszót. A próba a valódi naplóba nem írt.
Az U12-es névsor nem adott téves találatot.

