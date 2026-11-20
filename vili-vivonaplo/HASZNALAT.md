# Vili vívónaplója – használat

Az éles oldal: https://zrfsro.github.io/gsm-api-go-client-sourcey-docs/vili-vivonaplo/

## Fejlődés: csoportkörök után és a verseny végén

A **Fejlődés** fül minden versenynél két külön értéket mutat:
- **Csoportkörök utáni összesített helyezés** a hivatalos kiemelési rangsorból (például: 8. / 29).
- **Végső helyezés** a verseny eredménylistájából (például: 17. / 29).

Mindkét eredmény külön vonalként szerepel a grafikonon (arany = csoportkörök után, kék = végső). A százalék a megelőzött versenyzők aránya a saját, forrás szerinti mezőnyben. Vegyes versenyeken a csoportkör utáni teljes mezőny és a külön fiú végeredmény nevezője eltérhet, ezt a felület megőrzi és külön magyarázza.

Ahol még nincs ellenőrzött csoportkör utáni helyezés, ott „—” és „Még nincs ellenőrzött adat” látható. A részleteknél az egyes csoportokban elért helyezések is megmaradnak.

## Versenyek és fotók

A versenykártyán a végeredmény, a győzelmek és vereségek, valamint minden importált csoportkör helyezése látható. A csoporton belüli helyezés külön szerepel a teljes mezőny csoportkör utáni rangsorától. Az „Asszóeredmények” részben minden asszó alapból látható, körönként és ellenfelenként; mindig Vili pontja van elöl.

A kártya „Fotók” gombja kizárólag az adott verseny albumát nyitja meg. Szülőként innen tölthetők fel a képek. A Fotók fül az albumokat versenyenként mutatja.

## Helyszíni élő követés

1. Szülői belépés után válaszd az Élő követés fület és a versenyt.
2. Nyomd meg a „+ Helyszíni hír beírása” gombot.
3. Írd le röviden, mi történik most és mi következik. Például: „Vili a második csoportban vív.” / „Még egy asszó, utána várjuk a tábla beosztását.”
4. Ha ismert, add meg az ellenfelet, a pástot és az állást. Ezek nem kötelezők.
5. Mentsd el. A család ugyanitt látja az új hírt; versenynapon a megnyitott, online oldal 45 másodpercenként frissül. Más napokon a „↻ Frissítés” gombbal kérhetők le az aktuális adatok.

A helyszíni hírek külön eseménynaplóba kerülnek. Nem írják át a hivatalos helyezést vagy asszóeredményeket. Pontosításkor új hírt kell írni; a korábbi hírek megmaradnak időponttal. A rendszer nem talál ki ellenfelet, kezdési időt vagy következő kört, ha az még nincs megerősítve.

## Következő verseny és fejlődés

A főoldal kiemeli a következő U11-es versenyt, dátummal, ellenőrzött programmal és helyszínnel. Ez nem jelent automatikus nevezési visszaigazolást.

A Fejlődés fül a mezőnyarányos helyezést mutatja: (indulók száma − helyezés) / (indulók száma − 1) × 100%. Ez a megelőzött ellenfelek aránya; az eltérő korosztályok nem közvetlenül összehasonlíthatók.

A telefonról feltöltött fotók a jobb minőség érdekében kb. 1650 képpontos méretig és legfeljebb 850 KB-ig tömörülnek. Ha több fotóból néhány sikerül, a hibás feltöltés nem rejti el a korábban mentett képeket.

## Telefonra telepítés

Az oldal tetején a „Telefonra telepítés” gomb nyitja a telepítést vagy a készülékhez tartozó útmutatót.

- iPhone: Safari → Megosztás → Főképernyőhöz adás → Hozzáadás.
- Android: Chrome → ⋮ menü → Alkalmazás telepítése / Hozzáadás a kezdőképernyőhöz.

Ezután saját ikonnal, külön ablakban indul. Az aktuális adatokhoz és a helyszíni hírek mentéséhez internet szükséges. A családi belépés megmarad feltételnek; az alkalmazás újranyitásakor ismét kérheti.

## Automatikus eredmények

A NAS a saját, tartós Fencing Time Live-belépését használja. A folyamatban lévő versenyek hivatalos eredményeit körülbelül percenként ellenőrzi, a befejezetteket óránként. Az új magyarországi és szlovákiai versenyeket óránként keresi, és Vili teljes nevének pontos egyezése alapján kapcsolja a naplóhoz. A keresés a FTL közzétett versenyeire és névsoraira támaszkodik; a még nem közzétett nevezést nem tudja előre látni.


## Opavský listopad 2026 – élő követés

A november 21-i U11 fiú tőrversenyhez az Opavský listopad 2026 Fencing Time Live menetrendje került be:
https://www.fencingtimelive.com/tournaments/eventSchedule/AB4F797396B5483DA011976CC6B4ED36#today

A cseh szövetség versenylapja:
https://www.czechfencing.cz/portal/tournaments/detail/2c42469b-58e9-4bc0-9486-ce4900cae2b8

A Geostab 2026 őszi eredményarchívuma:
https://www.geostab.cz/serm/rok26_2pol/podzim26.htm

A hivatalos cseh eredmények és a Geostab U11 fiú tőr PDF megjelenését külön Supabase Cron figyeli november 21-én, ötpercenként 08:00–19:55 CET között, november 22–24-én ritkábban. Ha az eredmény közzé van téve, azt külön státuszként jelzi és a PDF-linket megjeleníti. Ez az ellenőrzés NEM jelenti a Fencing Time Live asszóeredmények automatikus beimportálását: ahhoz hitelesített, a konkrét U11-es versenyszámra kapcsolt adatgyűjtő kell.

## Nagyszülők és nagynénik első belépése

A családi szerepkör a jelszavas belépés után egyszeri útmutató ablakot kap, amelyben le van írva: hogyan kell megnyitni a versenyt, a sárga Fencing Time Live élő eredménylinket, a családi helyszíni híreket, a csoportkörök utáni helyezést és a fotókat. Az ablak bezárható; utána a fejléc Súgó gombjával bármikor újranyitható. A külső Fencing Time Live oldalon külön bejelentkezés szükséges lehet.

A november 21-i opavai esemény külső eredményközlését 2026.11.21-én 08:00–19:45 CET között 15 percenként vizsgálja a Supabase időzítő. Ez az ellenőrzés a hivatalos eredménylink és az esetleges Geostab PDF közzétételét figyeli, nem jelent automatikus asszóimportot.
