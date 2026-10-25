/**
 * Server-Guide: die Texte von Hand - Ueberblick, Regelwerk, je Addon eine Anleitung.
 *
 * Die Daten (Items, Rezepte, Erze, Kreaturen ...) erzeugt tools/gen-guide.mjs aus den Packs der
 * Server-Welt; hier steht, was man dazu wissen muss. Schluessel der Addons = Kurzname (slug) aus
 * gen-guide.mjs. **fett** und `code` werden auf der Seite umgesetzt, sonst ist alles reiner Text.
 *
 * Quellen: die Dateien der Packs selbst (Skripte, Sprachdateien, eingebaute Handbuecher), die
 * Seiten der Autoren (CurseForge, Core-Craft-Wiki). Was sich nicht pruefen liess, steht als solches da.
 */

export const SERVER = {
  title: "Worum geht es auf diesem Server?",
  intro: [
    "Ein **Survival-Server unter Freunden** – Minecraft, wie du es kennst, aber deutlich größer: neue Erze und Werkzeuge, über 170 neue Lebensmittel, Dörfer mit Quests und Händlern, Rituale mit legendären Waffen, eine eigene Dimension und rund hundert neue Bauwerke. Dazu Komfort, der lange Abende angenehmer macht: Rucksäcke, Gräber für deine Items, Sofort-Farmen, tragbares Licht und Zoom.",
    "Zusammengehalten wird alles von **Bedrock Essentials**: Clans, Handel, Kopfgelder, Statistiken – und **Das Vermächtnis**, ein Gemeinschaftsprojekt über Wochen mit geheimen Rollen und einem Verräter. Über diese Webseite siehst du die Karte, handelst, schreibst Nachrichten und verwaltest deinen Clan, auch wenn du gerade nicht im Spiel bist.",
    "**PvP ist erlaubt, Griefing nicht.** Kämpfe gehören dazu – fremde Bauten, Kisten und Farmen sind tabu. Die Einzelheiten stehen unter *Regeln*.",
  ],
  pillars: [
    { icon: "map", title: "Entdecken", text: "Neue Biome und Dörfer (Core Craft), ~100 Bauwerke (Adventures Structures), die schwebenden Inseln von The Sift und ein überarbeitetes End mit Endboss.", addons: ["core-craft", "adventures-structures", "the-sift"] },
    { icon: "settings", title: "Ausrüsten", text: "Rund 30 neue Erze in allen Dimensionen, Hämmer, Kampfäxte, Rüstungen mit Set-Effekten (More Tools), 23 neue Verzauberungen und legendäre Ritualwaffen.", addons: ["more-tools", "more-enchantments", "core-craft"] },
    { icon: "gift", title: "Leben & Kochen", text: "Über 170 Gerichte mit Schneidbrett, Herd und Wildpflanzen (Lebensmittelerweiterung), Quests, Marktstände und Meerjungfrauen-Handel (Core Craft).", addons: ["food-expansion", "core-craft"] },
    { icon: "clans", title: "Gemeinsam", text: "Clans, Handel, Kopfgeld, Nachrichten, Wegpunkte und Das Vermächtnis – im Spiel und auf dieser Webseite.", addons: ["essentials"] },
  ],
  start: [
    "**Beim ersten Betreten** bekommst du das **Essentials-Buch** – dort steht alles zu Menü, Clans, Handel und Vermächtnis. Das Menü öffnest du jederzeit mit `/menu`.",
    "**Rucksack zuerst:** Leder, Eisen und eine Truhe ergeben den OTG-Rucksack (Rezept unter *OTG Backpack*). Er wächst mit dir bis zur Netherit-Stufe.",
    "**Stirbst du**, liegen deine Items in einem **Grab** am Todesort – nur du kannst es öffnen. Nach dem Respawn zeigt dir der **Grave Finder** (ein Kompass im Inventar) Koordinaten und Dimension; auf der Karte dieser Webseite steht der Todespunkt als ✝.",
    "**Für die Webseite** gibst du im Spiel `/link` ein und tippst den Code unter *Anmelden* ein – danach legst du ein Passwort fest.",
    "**Rezepte nachschlagen** geht im Spiel über *Menü → Just Enough Items* oder hier unter *Items & Rezepte*.",
  ],
  path: [
    { stage: "Der Anfang", text: "Holz, Stein, Rucksack. Ein **Messer und ein Schneidbrett** öffnen die Küche der Lebensmittelerweiterung; Wildpflanzen (Erdbeeren, Zwiebeln …) wachsen schon in der Welt. Hohle Baumstämme kann man schleichend durchkriechen." },
    { stage: "Erze & erste Ausrüstung", text: "Neben Eisen und Diamant gibt es in der Oberwelt u. a. **Rubin, Saphir, Bernstein, Topas, Titan, Wolfram und Uran** (More Tools) sowie **Rubin** von Core Craft. Daraus: Werkzeuge, **Hämmer** (3×3×3 Stein per Rechtsklick), Rüstungen mit Set-Effekten." },
    { stage: "Dörfer, Quests, Markt", text: "Core Craft baut die Dörfer aus. Quest-NPCs geben Aufträge; erledigte Quests gibst du beim **Quest-Meister** in seinem Questturm ab und bekommst **Rubine**. Damit kaufst du die erste **Markt-Verzierung** für deinen eigenen Marktstand – Händler besuchen ihn und handeln immer bessere Waren." },
    { stage: "Nether & Rituale", text: "Im Nether liegen Kobalt, Jade, Onyx, Rotgold, Schwefel und mehr. Elementar-Monster lassen manchmal einen **Geist** fallen – in der Flasche aktiviert er den passenden **Ritualkern** (Feuer, Seele, Eis, Blitz, Gift, End). Wer alle Wellen übersteht, bekommt eine **legendäre Waffe**." },
    { stage: "The Sift", text: "Tief unten in einer **Antiken Stadt** steht ein Rahmen aus verstärktem Tiefenschiefer. Frei räumen, unten Feuer entzünden – das Portal führt nach **The Sift**: schwebende Inseln, eigene Wälder, eigene Kreaturen und **Siftium** für Werkzeug und Rüstung." },
    { stage: "Das End", text: "Core Craft macht das End größer: drei neue Biome, vierzehn Kreaturen (darunter der fliegende **Reaver**), die **End-Burg** und der Endboss, der **Infizierte Wächter**. More Tools versteckt hier **Enderit, Aetherium, Enderium, Lithium, Lonsdaleit und Visinium**; Adventures Structures die **Phantom-Zitadelle**." },
  ],
  keys: [
    ["Doppelt schleichen", "Lichtquelle zwischen Haupt- und Zweithand tauschen (Dynamic Lights); mit Rucksack im Tragplatz + Springen: Rucksack öffnen (OTG Backpack); auf Wunsch zoomen (Just Zoom)"],
    ["Schleichen + Axt an einem Stamm", "ganzen Baum fällen (Essentials-Baumfäller)"],
    ["Schleichen neben einem Liegenden", "ihn wiederbeleben (Essentials)"],
    ["Schleichen + leere Hand an liegendem hohlen Stamm", "hindurchkriechen (Core Craft)"],
    ["Rechtsklick mit Hammer", "3×3×3 Stein, Tiefenschiefer, Tuff, Netherrack oder Schwarzstein abbauen (More Tools) – kostet 25 Haltbarkeit"],
    ["Stock halten / benutzen", "zoomen (Just Zoom, Auslöser mit `/setting` änderbar)"],
    ["`/menu`", "das Essentials-Menü – auch über den Essentials-Kompass"],
  ],
};

/** Das Regelwerk - abgestimmt auf die Addons dieses Servers. PvP erlaubt, Griefing nicht. */
export const RULES = [
  {
    title: "1. Miteinander",
    items: [
      "Respekt im Chat, auf der Webseite und im Sprachkanal – keine Beleidigungen, keine Hetze, kein Spam.",
      "Streit klärt ihr untereinander oder mit einem Operator, nicht durch Rache im Spiel.",
      "Wer neu ist, bekommt Hilfe. Fragen sind willkommen.",
    ],
  },
  {
    title: "2. PvP – erlaubt, aber fair",
    items: [
      "**Kämpfen ist überall erlaubt.** Jeder kann angegriffen werden und sich wehren.",
      "**Kein Spawn- und Bettcamping:** Wer gerade wiederbelebt wurde oder respawnt, bekommt Ruhe, bis er sich ausrüsten konnte (Richtwert: 2 Minuten).",
      "**Wer am Boden liegt** (Essentials-Wiederbeleben), wird nicht belagert und nicht am Wiederbeleben gehindert.",
      "**Keine Beute durch PvP:** Items eines Getöteten landen in seinem Grab, das nur er öffnen kann. Belohnung für einen Kill gibt es nur über ein ausgesetztes **Kopfgeld**.",
      "**Kein Töten von AFK-Spielern** – wer sich nicht bewegt und nicht reagiert, ist nicht im Spiel.",
      "Clans dürfen sich gegenseitig herausfordern; Clan-Kriege sprecht ihr vorher ab.",
    ],
  },
  {
    title: "3. Kein Griefing",
    items: [
      "**Fremde Bauten, Kisten, Farmen, Felder und Tiere** sind tabu – nichts abbauen, öffnen, verändern, umfüllen oder ernten ohne Erlaubnis. Das gilt auch für **abgestellte Rucksäcke** (OTG) und **Marktstände** (Core Craft).",
      "**Gräber anderer** (Actual Gravestones) werden nicht abgebaut oder zugebaut.",
      "**Waffen mit Flächenwirkung** nicht an oder in fremden Bauten einsetzen: die **Blitz-, Feuer-, Eis- und Ender-Kampfäxte**, **Hämmer** (bauen 3×3×3 ab), **verstärkte Feuerzeuge** (3×3 Feuer) von More Tools. Im offenen Gelände und im PvP sind sie erlaubt.",
      "Lava, Feuer und TNT nicht in der Nähe fremder Bauten.",
      "**Abstand:** Neue Basen mindestens 100 Blöcke von bestehenden, es sei denn, die Nachbarn sind einverstanden.",
      "Verlassene Basen gehören weiter ihrem Besitzer. Erst nach 30 Tagen ohne Login und mit Zustimmung eines Operators darf jemand übernehmen.",
    ],
  },
  {
    title: "4. Gemeinsame Orte",
    items: [
      "**Portale nach The Sift** (Antike Städte) bleiben offen und heil – andere wollen auch hinein und wieder heraus.",
      "**Ritualbauwerke, Questtürme, Dörfer und Bauwerke** aus Core Craft und Adventures Structures werden nicht abgerissen oder abgesperrt. Truhen darin plündert, wer zuerst kommt.",
      "Der **Spawn** ist kampffreie Zone und bleibt frei von Farmen und Fallen.",
      "Dorfbewohner, Quest-NPCs, Meerjungfrauen und Händler nicht absichtlich töten oder einsperren.",
    ],
  },
  {
    title: "5. Farmen & Leistung",
    items: [
      "**Insta-Farmen nur auf eigenem Gelände** und mit Abstand zu anderen Basen. Höchstens **zwei Mob-, Raid- oder Eisenfarmen je Spieler**.",
      "Keine Lag-Maschinen: keine Redstone-Uhren ohne Abschaltung, keine Massen an Tieren (Richtwert: höchstens 30 Tiere je Gehege), Item-Berge nicht liegen lassen.",
      "Wenn der Server ruckelt und ein Operator darum bittet, schaltest du deine Farmen ab.",
    ],
  },
  {
    title: "6. Handel & Wirtschaft",
    items: [
      "Handel läuft am besten über das **Essentials-Handelssystem** (Menü oder Webseite) – dort ist er sicher.",
      "Absprachen außerhalb davon gelten trotzdem: Wer betrügt, bekommt es mit den Operatoren zu tun.",
      "Kopfgelder dürfen nicht abgesprochen eingelöst werden (sich selbst töten lassen und teilen).",
    ],
  },
  {
    title: "7. Das Vermächtnis",
    items: [
      "**Rollen bleiben geheim.** Keine Screenshots, keine Nachrichten außerhalb des Spiels, die deine Rolle verraten – im Spiel darfst du behaupten, was du willst.",
      "**Der Verräter darf lügen und sabotieren – mit den Mitteln des Spiels** (Sabotagen, Bestechung, Abstimmungen). Echtes Griefing bleibt auch für ihn verboten.",
      "Wer im Vermächtnis ausgeschieden oder in der Auszeit ist, versucht nicht, das über Zweitkonten oder andere Wege zu umgehen.",
      "Das **Rast-Lagerfeuer** (OTG) verstellt die Zeit über eine Abstimmung – nicht ständig auslösen.",
    ],
  },
  {
    title: "8. Fair Play",
    items: [
      "Keine Hacks, Cheat-Clients, X-Ray-Texturen oder Minikarten mit Höhlenansicht.",
      "Bugs und Duplizier-Fehler meldest du einem Operator, statt sie auszunutzen.",
      "Ein Konto pro Person. Dein Passwort für die Webseite gibst du niemandem.",
    ],
  },
  {
    title: "9. Folgen",
    items: [
      "Bei Verstößen: Verwarnung, dann Auszeit, im Wiederholungsfall Sperre. Schaden wird – wenn möglich – von dem ersetzt, der ihn angerichtet hat.",
      "Die Operatoren entscheiden im Einzelfall. Wer anderer Meinung ist, spricht sie in Ruhe an.",
    ],
  },
];

/**
 * Je Addon: kind (inhalt, komfort, gemeinschaft, technik), short (eine Zeile), about (Absaetze),
 * start (die ersten Schritte), features ([Titel, Text]), tips, warn, source (Link zum Autor).
 */
export const ADDONS = {
  essentials: {
    title: "Bedrock Essentials",
    by: "für diesen Server",
    kind: "gemeinschaft",
    short: "Clans, Handel, Kopfgeld, Vermächtnis, Statistiken, Wiederbeleben und diese Webseite.",
    about: [
      "Das Herz des Servers: ein Addon mit vielen Mini-Addons, die der Operator einzeln ein- und ausschaltet. Alles öffnet sich über `/menu` oder den Essentials-Kompass. Beim ersten Betreten bekommst du das **Essentials-Buch** mit allen Einzelheiten.",
    ],
    features: [
      ["Clans", "Gründen, einladen, Rollen, Clan-Chat, Clan-Bank, Clan-Home, Level und Rangliste – auch über die Webseite."],
      ["Handel & Kopfgeld", "Angebote auf dem Marktplatz oder privat, Postfach für Ware und Zahlung; Kopfgelder auf Spieler aussetzen."],
      ["Das Vermächtnis", "Zyklen über Wochen: 13 geheime Rollen, ein Verräter, 20 globale Aufgaben, ein gemeinsames Lager, Contribution Points, Abstimmungen und Sabotagen."],
      ["Wiederbeleben", "Bei wenig Leben gehst du zu Boden statt zu sterben; ein Mitspieler schleicht neben dir und stellt dich wieder auf. Läuft die Zeit ab, stirbst du wirklich – dann greift das Grab."],
      ["Just Enough Items", "Alle Items und Rezepte im Spiel nachschlagen – auch die der anderen Addons."],
      ["Artefakte, Totems, Module", "Schmuckstücke von Monstern, geprägte Totems und Werkzeuge aus Modulen wie in der Java-Mod Tetra."],
      ["Alltag", "Baumfäller (Schleichen + Axt), Sitzen auf Treppen, Inventar sortieren, „Was schaue ich an?“, Statistiken und Ranglisten."],
      ["Webseite", "Karte, Handel, Clans, Nachrichten (`/post`), Wegpunkte (`/waypoint`) – Anmeldung mit `/link`."],
    ],
    tips: ["Welche Mini-Addons gerade an sind, bestimmt der Operator – im Menü siehst du nur, was läuft."],
  },
  gravestones: {
    title: "Actual Gravestones",
    by: "Addon „Actual Gravestones“ (V0.13)",
    kind: "komfort",
    short: "Wer stirbt, hinterlässt ein Grab mit seinen Items – nur er selbst kann es öffnen.",
    about: [
      "Statt deine Items über den Boden zu verstreuen, setzt der Tod ein **Grab** (einer von elf Grabsteinen, zufällig) an die Stelle, an der du gestorben bist. Alles, was in sechs Blöcken Umkreis herausgefallen ist, liegt darin, dazu **die Hälfte deiner Erfahrungslevel**.",
    ],
    start: [
      "Nach dem Respawn liegt ein **Grave Finder** in deinem Inventar – ein Kompass mit Koordinaten und Dimension deines Grabs. Die Position steht außerdem im Chat und auf der Karte der Webseite (✝).",
      "Am Grab **benutzt** (Rechtsklick/Antippen) du den Grabstein: Items fallen heraus, die Level bekommst du zurück, Grab und Kompass verschwinden.",
    ],
    features: [
      ["Nur für dich", "Fremde Spieler können dein Grab nicht öffnen – „This grave belongs to …“. Darum bringt PvP keine Beute."],
      ["Schutz im End", "Fällst du im End in die Leere, wirst du kurz vorher auf festen Boden in der Nähe gesetzt und stirbst dort – dein Grab ist so erreichbar."],
    ],
    tips: ["Gehst du offline, bevor du respawnst, gibt es keinen Grave Finder – merk dir die Koordinaten aus dem Chat oder schau auf die Webseiten-Karte.", "Mit dem Essentials-Wiederbeleben stirbst du seltener; erst ein echter Tod setzt ein Grab."],
  },
  "hikers-friend": {
    title: "Hiker's Friend",
    by: "Marketplace-Add-On (kostenlos)",
    kind: "komfort",
    short: "Camping-Ausrüstung: Klappstühle, Schlafsäcke, Handlaternen, Kletterpickel und Wanderstock.",
    about: [
      "Eines der ersten offiziellen Marketplace-Add-Ons: Campingstühle und benutzbare **Schlafsäcke**, **Handlaternen**, ein **Kletterpickel** für steile Wände und ein **Wanderstock** für bessere Beweglichkeit.",
    ],
    warn: ["Marketplace-Inhalte sind verschlüsselt und laufen auf einem eigenen Server (Nitrado) in der Regel **nicht**. Wenn du die Items im Spiel nicht findest, ist das der Grund."],
  },
  "dynamic-lights": {
    title: "ZenXveda's Dynamic Lights (Lite)",
    by: "ZenXveda",
    kind: "komfort",
    short: "Fackeln und andere Lichtquellen leuchten, während du sie in der Hand hältst.",
    about: ["Halte eine Lichtquelle in der Haupt- oder Zweithand, und die Umgebung wird in Echtzeit hell – ideal für Höhlen, ohne ständig Fackeln zu setzen."],
    start: [
      "Lichtquelle in die Hand nehmen – fertig.",
      "**Doppelt schleichen** tauscht die Lichtquelle zwischen Haupt- und Zweithand (nur bei Lichtquellen). So hast du links Licht und rechts das Schwert.",
    ],
    features: [
      ["Hell", "Laterne (15), Seelenlaterne (14), Fackel, Leuchtstein, Seelaterne, Pilzlicht, Kürbislaterne (12), Seelenfackel (11), Lagerfeuer, Endstab, Froschlichter (10) …"],
      ["Auch unter Wasser", "Leuchtstein, Seelaterne, Laternen, Pilzlicht, Endstab und Froschlichter leuchten auch beim Tauchen – Fackeln nicht."],
    ],
    tips: ["Die „Zweithand-Fackel“ wird an der Werkbank wieder zu einer normalen Fackel."],
    source: "https://www.curseforge.com/minecraft-bedrock/addons/zenxvedas-dynamic-lights",
  },
  "more-tools": {
    title: "More Tools",
    by: "SorYPMod (Balanced-Version)",
    kind: "inhalt",
    short: "Rund 30 neue Erze in allen Dimensionen, Hämmer, Kampfäxte, Dolche, Rüstungen mit Set-Effekten und besondere Äpfel.",
    about: [
      "Das große Ausrüstungs-Addon: Jedes neue Material bringt Werkzeuge (Schwert, Spitzhacke, Axt, Schaufel, Hacke), oft einen **Hammer**, eine **Rüstung** und manchmal einen **Apfel** mit Effekten. Die Werte (Haltbarkeit, Schaden, Abbaugeschwindigkeit, Rüstung) stehen unten bei jedem Item.",
    ],
    start: [
      "Achte beim Bergbau auf neue Erze – die Tabelle **Erzvorkommen** unten zeigt Dimension und Höhe.",
      "Erz im Ofen oder Schmelzofen zu Barren schmelzen, an der Werkbank Werkzeuge bauen.",
      "Diamant-Varianten werden am **Schmiedetisch** mit Netherit-Schablone zu Netherit (Kampfaxt, Feuerzeug, Äpfel).",
    ],
    features: [
      ["Hämmer", "Rechtsklick auf Stein, Tiefenschiefer, Tuff, Netherrack oder Schwarzstein räumt einen 3×3×3-Würfel frei – kostet 25 Haltbarkeit (Haltbarkeit-Verzauberung hilft)."],
      ["Elementar-Kampfäxte", "**Blitz** (beschwört Blitze auf alles in 35 Blöcken, Schleichen verstärkt), **Feuer** (Feuer-Iglus um Gegner), **Eis** (Eis-Iglus, verlangsamt in 45 Blöcken), **Ender** (schleudert Wesen in 15 Blöcken hoch), **Echo** (Schallwelle, Stärke). Mächtig – und im Regelwerk nur fern fremder Bauten erlaubt."],
      ["Rüstungs-Sets (komplett tragen)", "**Warden**: Resistenz IV. **Magma**: Lava unter dir erstarrt, Magma-Werkzeuge geben Feuerresistenz. **Frost**: Wasser unter dir gefriert. **Seele**: Schwäche für Wesen in 6 Blöcken. **Uran**: Effekt auf Wesen in der Nähe. **Enderit**: Portalpartikel."],
      ["Äpfel", "Eisen-, Diamant-, Smaragd-, Rubin-, Saphir-, Netherit-Äpfel und mehr, auch verzaubert – je nach Material mit Effekten wie Eile, Stärke, Resistenz, Nachtsicht oder Wasseratmung."],
      ["Weitere", "Dolche, Sensen, Leviathan-Axt, Glas-Werkzeuge, Bronze, Messing und Stahl als Legierungen, Coelestin-Geoden mit wachsenden Kristallen, Käse und Pizza."],
    ],
    warn: ["Hämmer, Kampfäxte und verstärkte Feuerzeuge verändern die Welt – nicht an fremden Bauten benutzen (Regel 3)."],
  },
  "the-sift": {
    title: "The Sift",
    by: "The Sift Add-On (WE 0.6)",
    kind: "inhalt",
    short: "Eine neue Dimension aus schwebenden Inseln – erreichbar über das Portal in der Antiken Stadt.",
    about: [
      "Eine Nachbildung der neuen Dimension aus Minecraft Live: riesige **schwebende Inseln** über der Leere, Ebenen, Klippen und Berge, eigene Wälder mit dicken Stämmen, eigener Nebel. Die Welt entsteht, während du sie erkundest – beim ersten Besuch einer Gegend kann es kurz dauern.",
    ],
    start: [
      "Finde eine **Antike Stadt** im Tiefen Dunkel.",
      "In der Mitte steht ein großer Rahmen aus **verstärktem Tiefenschiefer**. Räume Sculk und alle Blöcke aus dem Inneren.",
      "Entzünde mit **Feuerzeug** ein Feuer auf dem verstärkten Tiefenschiefer am Boden der Öffnung – das Innere füllt sich mit dem Sift-Portal.",
      "Hindurchgehen. Zurück geht es durch das Portal, das neben deinem Ankunftsort steht.",
    ],
    features: [
      ["Biome", "**Wiese** mit Kalkstein und Türmen, **Sänger-Wiese** mit Tafelbergen und großen Ichor-Seen, **Panzer** (Wüste mit Dinosaurier-Rippen aus Knochenblöcken), **Rosa Wiesen** (Wald)."],
      ["Kreaturen", "Blups in mehreren Arten, Dartback, Echo-Golem, Lootkin, Nuzzle, Pollinator, Prickle, Seedling, Sänger, Tuner – und Sift-Hasen (mit Karotten züchtbar)."],
      ["Siftium", "Rohes Siftium schmelzen, daraus Werkzeuge und eine Rüstung."],
      ["Bauen", "Sift-Stein, Sift-Holz mit allen Formen, Kalkstein und Wiesenstein-Ziegel."],
    ],
    tips: ["Rahmengröße: innen 2–21 Blöcke breit und 3–21 hoch, liegend in beide Richtungen.", "`/locate biome` sieht die Sift-Biome nicht – das Addon hat dafür `/the_sift:locate_biome` (Operatoren).", "Die Webseiten-Karte zeigt nur Oberwelt, Nether und End – The Sift nicht."],
    warn: ["Die Portale in Antiken Städten sind gemeinsamer Zugang – nicht zerstören (Regel 4)."],
  },
  "core-craft": {
    title: "Core Craft",
    by: "Cubed Creations",
    kind: "inhalt",
    short: "Vanilla+ in groß: neue Biome, Tiere und Monster, Quests, Märkte, Rituale mit legendären Waffen und ein neues End mit Endboss.",
    about: [
      "Core Craft erweitert fast alles, ohne das Minecraft-Gefühl zu verlieren: überarbeitete Weltgenerierung mit neuen Biomen und **ausgebauten Dörfern**, neue Tiere (viele lassen sich **lebend ernten**, ohne sie zu töten), gefährliche Monster und Minibosse, **Meerjungfrauen und Sirenen**, Möbel, Pflanzen und Blocksets. Das **Wiki-Buch** im Spiel erklärt alles – die wichtigsten Einträge stehen unten.",
    ],
    start: [
      "Such dir ein Dorf. Quest-NPCs bieten Aufträge an (Ernte, Bergbau, Fischen, Abenteuer – von gewöhnlich bis legendär); dein **Questbuch** sammelt sie.",
      "Erledigte Quests gibst du beim **Quest-Meister** ab – er wohnt in seinem eigenen **Questturm** – und bekommst **Rubine**.",
      "Mit Rubinen kaufst du beim Quest-Meister die **Markt-Verzierung Stufe I**. Auf ein **Marktstand-Schild** gesetzt, lockt sie Händler an; mit ihnen handelst du dich bis Stufe V hoch.",
    ],
    features: [
      ["Rituale", "Elementar-Monster lassen manchmal einen **Geist** fallen. In einer Flasche gefangen, aktiviert er den passenden **Ritualkern** im Ritualbauwerk – Feuer, Seele, Eis, Blitz, Gift oder End. Wellen von Elementar-Monstern, am Ende ein **Astral** – die Belohnung ist eine **legendäre Waffe** mit besonderer Kraft."],
      ["Meer", "**Meerjungfrauen** nahe Ozeanmonumenten und Ruinen tauschen gegen **Perlen**. **Sirenen** greifen mit dem Sirenenstab an – den kann man ihnen abnehmen (nur unter Wasser nutzbar)."],
      ["Das End", "Drei neue Biome, vierzehn Kreaturen, die **End-Burg** und End-Verliese. Der **Reaver** gleitet durch den Himmel – mit der *Chorusfrucht an der Angel* lenkst du ihn. Endboss ist der **Infizierte Wächter**: Laut der Schriftrolle öffnet sich ein Portal, wenn die drei Säulen in der Mitte der End-Burg gleichzeitig von den Energieblitzen eines **legendären Schilds** getroffen werden – heraus kommt er, hinein kommt niemand."],
      ["Natur & Bauen", "Hohle und dünne Stämme in allen Holzarten (liegende hohle Stämme kann man schleichend mit leerer Hand durchkriechen), Holzstapel, Theken, Markisen, Kissen, Vasen und neue Blocksets."],
      ["Waffen", "Kampfäxte, Speere, Steinschleuder, seltene und legendäre Waffen."],
    ],
    tips: ["Neue Pflanzen und Ernte: Sensen ernten ein größeres Feld, je besser das Material, desto größer.", "Das Wiki-Buch steht auch als Block zum Hinstellen zur Verfügung (Möbel-, Mob- und Koch-Wiki)."],
    source: "https://wiki.corecraft.gg",
  },
  "just-zoom": {
    title: "Just Zoom",
    by: "Dimzcraft",
    kind: "komfort",
    short: "Zoomen ohne Fernrohr – mit Stock, Schleichen oder Doppel-Schleichen.",
    about: ["Ein schneller Zoom, wie man ihn aus Mods kennt."],
    start: ["Standard: **Stock in die Hand nehmen und benutzen** (gedrückt halten) – oder ein Item, das „zoom“ heißt.", "Mit `/setting` stellst du den Auslöser um: Stock, Schleichen oder Doppel-Schleichen; dort lassen sich auch Ton und Kino-Effekt abschalten.", "`/zoom` geht per Makro in den Steuerungs-Einstellungen."],
    tips: ["Doppel-Schleichen benutzen auch Dynamic Lights und der OTG-Rucksack – wähl lieber den Stock."],
    source: "https://www.curseforge.com/minecraft-bedrock/addons/just-zoom",
  },
  "food-expansion": {
    title: "Lebensmittelerweiterung (Food Expansion)",
    by: "Loyallay",
    kind: "inhalt",
    short: "Über 170 neue Lebensmittel: Sushi, Kuchen, Säfte, Eis, Burger – mit Messern, Schneidbrettern, Herd, Wildpflanzen und Obstbäumen.",
    about: [
      "Kochen wird zum eigenen Spielzweig: neue **Wildpflanzen** wachsen in der Welt (Erdbeeren, Zwiebeln, Tomaten, Beeren …), **Obstbäume** tragen Äpfel, Kirschen und Pflaumen, neue Tiere wie **Truthahn**, **Waschbär** und **Makrele** liefern Zutaten. Das **Handbuch** (auf Deutsch!) erklärt jede Zutat mit Bezugsquelle und Nährwerten.",
    ],
    start: [
      "**Messer** (aus Feuerstein, Stein … bis Netherit) und **Schneidbrett** (2 Bretter + 2 Stöcke) bauen.",
      "Zutat aufs Schneidbrett legen, dann mit dem Messer daraufklicken – z. B. Kürbis → 4 Kürbisscheiben, Brot → Scheiben, Beeren → Farbstoff.",
      "Mit der **Sichel** ernten und automatisch neu pflanzen.",
    ],
    features: [
      ["Kategorien", "Grundzutaten, asiatische Speisen und Sushi, Kuchen und Torten, Backwaren, Marmeladen, Säfte, Eiscreme, Tees, Hotdogs, gebratenes Fleisch, Wildpflanzen, Erntekisten und Beerentaschen."],
      ["Küche", "Herd, Kochtopf, Kessel, Krug, Teller und Schubladen zum Aufstellen; Tassen für Tee."],
      ["Effekte", "Viele Gerichte heilen über die Sättigung oder geben Effekte; Chorus-Gerichte teleportieren."],
      ["Mode", "Strohhut und Blumenkränze zum Aufsetzen."],
    ],
    tips: ["Die Schneidbrett-Rezepte stehen nicht an der Werkbank – das Handbuch im Spiel zeigt sie."],
  },
  "otg-backpack": {
    title: "OTG Backpack",
    by: "dinorawrski",
    kind: "komfort",
    short: "Ein Rucksack, der mitwächst: sechs Stufen, Module, Flüssigkeitstanks, tragbare Werkbank, Ofen, Amboss und Rast-Lagerfeuer.",
    about: ["Vom einfachen Rucksack zum kompletten Feldlager: Lagerplatz, Stufen-Upgrades, Module für Automatik, Tanks, Werkstationen und Optik."],
    start: [
      "**Rezept:** oben Leder – Eisennugget – Leder, Mitte Eisenbarren – Truhe – Eisenbarren, unten Leder – Eisenbarren – Leder.",
      "Trag ihn in einem **Vorrangplatz**: Hotbar-Platz 9, Inventarplatz 27, Zweithand oder Haupthand.",
      "**Schnell öffnen** aus dem Tragplatz: zweimal schleichen, dann springen.",
      "**Stufen:** Basis → Kupfer → Eisen → Gold → Diamant → Netherit – immer nur eine Stufe weiter, mit dem passenden Stufen-Token im Upgrade-Platz.",
    ],
    features: [
      ["Module", "**Ausstrahlung** (Licht-Begleiter für Höhlen), **Versorgung** (füttert automatisch), **Totem+** (legt bei 3 Herzen ein Totem in die Zweithand), **Seelenbund** (Rucksack nach dem Tod zurückholen), **Herzen**, **Magnet** (sammelt Items ein), **Leere** (löscht gefilterte Items – Vorsicht!), **Verdichter**, **Ofen**, **Überpack** (zweite Seite, nur Netherit)."],
      ["Werkstationen", "Werkbank, virtueller Ofen (läuft mit **Lava** aus dem Tank oder Lavaeimern), Steinsäge und Amboss – je nach Stufe."],
      ["Tanks", "Ab Kupfer: 20 Eimer, Eisen 40, Gold 60, Diamant 80, Netherit 100."],
      ["Rast-Lagerfeuer", "Aufstellen und auf Morgen, Mittag, Nacht oder Mitternacht vorspulen – im Mehrspieler per Abstimmung."],
      ["Aussehen", "Creeper, Enderman, Schneefuchs, Ghast, Enderdrache – ändert nur die Optik."],
      ["Abstellen", "Im Platzierungsmodus stellst du den Rucksack in die Welt und nutzt Behälter in der Nähe."],
    ],
    tips: ["Empfohlen: klassische Oberfläche mit GUI-Skalierung −2 – große Rucksäcke passen dann ohne Scrollen."],
    warn: ["Das Leere-Modul löscht Items endgültig.", "Abgestellte Rucksäcke anderer sind tabu (Regel 3)."],
  },
  "more-enchantments": {
    title: "More Enchantments",
    by: "Raiyon",
    kind: "inhalt",
    short: "23 neue Verzauberungen – aus Struktur-Truhen oder vom verstärkten Zaubertisch.",
    about: ["Neue Verzauberungen für fast alle Werkzeuge, Waffen und Rüstungsteile. Die Bücher findest du in den Truhen von Minen, Antiken Städten, Bastionen, Wüstentempeln, End-Städten, Dschungeltempeln, Verliesen, Netherfestungen, Außenposten, Schiffswracks, Schmieden und Prüfungskammern."],
    start: [
      "**Verstärkter Zaubertisch:** oben ein Buch, Mitte Amethystsplitter – Tiefenschiefer – Amethystsplitter, unten dreimal Tiefenschiefer.",
      "Ein **Buch** am Tisch benutzen: Er bietet zufällige Verzauberungen gegen **Erfahrungslevel** an.",
      "Verzauberte Bücher wendest du am Tisch auf den passenden Gegenstand an; dort lässt sich auch entzaubern. Auf jedem Buch steht, wofür es gilt.",
    ],
    features: [
      ["Waffen", "**Seelenfeuer** (Schwert, Speer), **Schwungkante** bis III (Schwert), **Blutsauger** (Nahkampfwaffen), **Wutanfall** (Speer), **Giftwolke** (Dreizack, Speer), **Meteor-Schlag** (Streitkolben)."],
      ["Fernkampf", "**Explosivschuss**, **Mehrfachpfeil** (Bogen), **Feuerladung**, **Schallladung** (Armbrust)."],
      ["Rüstung", "**Vitalität** bis V (mehr Leben), **Leichtsinn** bis III (mehr Schaden, weniger Leben), **Eiserne Flügel** und **Windimpuls** (Elytra), **Doppelsprung** und **Lavaläufer** (Stiefel), **Feigheit** (Hose), **Leuchtende Aura** (Helm), **Brennende Dornen** (alle Teile)."],
      ["Werkzeug & Schild", "**Schmelzen** (Spitzhacke, Schaufel), **Tiefenbrecher** (Spitzhacke), **Stacheln** und **Rückprall** (Schild)."],
    ],
    tips: ["Manche schließen Vanilla-Verzauberungen aus: Seelenfeuer ↔ Verbrennung, Lavaläufer ↔ Eisläufer, Brennende Dornen ↔ Dornen."],
  },
  "insta-farm": {
    title: "Insta Farm",
    by: "EndXenoc",
    kind: "komfort",
    short: "Farm-Block bauen, hinstellen – die komplette Farm steht sofort.",
    about: ["44 Farmen als Block: Weizen, Karotten, Kartoffeln, Kürbisse, Melonen, Zuckerrohr, Bambus, Kakteen, Seetang, Bäume, Kühe, Schweine, Schafe/Wolle, Honig, Schnee, Eis, Lava, Bruchstein, Basalt, Knochenmehl, Schleim, Hexen, Creeper, Enderman, Eisen, Gold, Tauschhandel, Raid, Dreizack, Shulkerschalen, Froschlichter und mehr – dazu Auto-Ofen und Redstone-Tisch."],
    start: [
      "Zuerst den **Redstone-Tisch** an der Werkbank bauen: oben Redstone – Redstone-Fackel – Redstone, Mitte drei entrindete Eichenstämme, unten Stock – leer – Stock. Nur an ihm entstehen alle Farm-Blöcke und Items des Addons.",
      "Farm-Block bauen und an einem freien Ort hinstellen.",
      "Mit dem Farm-Block interagieren: Er zeigt die **Materialliste**. Fehlendes legst du aus dem Inventar ein; sind alle da, erscheint **Bauen** – die Farm wächst mit Staub und Animation empor. Wie viel Material nötig ist, stellt der Operator in Prozent ein.",
      "Schilder in der Farm sagen, was zu tun ist (z. B. „Kiste mit Knochenmehl füllen“, „Hier AFK stehen“).",
      "Manche Farmen haben mehrere Stufen: Mit dem **Farm Booster** (Eisen- und Goldnuggets, Bruchstein) baust du sie aus – aber nicht, während sie läuft.",
    ],
    features: [
      ["Standort zählt", "Manche Farmen gehen nur in bestimmten Biomen oder Dimensionen: Tauschhandel nur im Nether, manche nur im End, Eis/Schnee nur in schneebedeckten Biomen, Dreizack nur im Ozean, andere nicht in warmen Biomen; nicht zu nah an Dörfern."],
      ["Abbauen", "Baust du den Farm-Block ab, bekommst du die Materialien zurück – bei großen Mengen in **Kartons** (gibt es nur so, nicht zum Craften)."],
    ],
    warn: ["Höchstens zwei Mob-, Raid- oder Eisenfarmen je Spieler und nur auf eigenem Gelände (Regel 5)."],
  },
  "feather-fps": {
    title: "Feather FPS Boost",
    by: "Feather",
    kind: "technik",
    short: "Mehr Bilder pro Sekunde: sauberere Grafik ohne Nebel und weniger gleichzeitige Tiere und Monster.",
    about: ["Läuft im Hintergrund. Das Ressourcenpaket vereinfacht Partikel, Schatten und Nebel (auf dem Server: „klarer Nebel“); das Verhaltenspaket begrenzt, wie dicht 35 Vanilla-Tiere und -Monster spawnen."],
    tips: ["Etwas weniger Monster in der Nacht ist Absicht – nicht kaputt."],
  },
  "essentials-cosmetics": {
    title: "Essentials Kosmetik",
    by: "für diesen Server",
    kind: "gemeinschaft",
    short: "Macht die Artefakte von Bedrock Essentials am Spieler sichtbar.",
    about: ["Ergänzung zu Bedrock Essentials: Hüte, Ketten, Gürtel und Schuhe aus dem Artefakte-Modul siehst du am Spielermodell."],
  },
  "adventures-structures": {
    title: "Adventures Structures",
    by: "Mrs Trader",
    kind: "inhalt",
    short: "Rund hundert neue Bauwerke in allen Biomen, im Himmel, im Nether und im End – viele mit Beute.",
    about: ["Leuchttürme und Fischerhütten am Strand, Wüstentempel und Bibliotheken, Illager-Festungen, Zauberertürme, Windmühlen, Tavernen und Marktplätze, Dschungeltempel und das Pandahaus, Bauwerke im Sumpf, in der Savanne, im Schnee – und im End u. a. die **Ender-Burg**, Monolithen und die **Phantom-Zitadelle**."],
    tips: ["Illager-Lager und -Festungen sind bewohnt – vorbereitet hingehen.", "Bauwerke sind gemeinsame Orte (Regel 4): plündern ja, abreißen nein."],
  },
};

/**
 * Das Vermaechtnis: was jede Rolle ausmacht und wie das Spiel laeuft. Namen, Kurztexte, Kosten
 * und Abklingzeiten der Faehigkeiten kommen aus guide/legacy.json (tools/web.mjs, aus dem Addon);
 * {name} steht fuer eine Zahl aus den Weltregeln (Vorgabe) und wird auf der Seite eingesetzt.
 */
export const LEGACY = {
  intro: [
    "Ein Gemeinschaftsprojekt über Wochen: Die Gruppe arbeitet in **Zyklen** an globalen Aufgaben, jeder bekommt heimlich eine **Rolle** – und einer von euch ist der **Verräter**.",
    "Deine Rolle siehst du im Menü unter *Das Vermächtnis → Meine Rolle*, mit Sicherheitsfrage, falls dir jemand über die Schulter schaut. Fähigkeiten kosten **Contribution Points (CP)**, die du mit Beiträgen zu den Aufgaben und mit Spielzeit verdienst.",
  ],
  roles: {
    traitor: [
      "Muss sich ein **Ziel** festlegen. Nur dieses Ziel scheidet durch seine Hand endgültig aus – jeder andere Tod durch ihn ist eine gewöhnliche Auszeit. Wechseln geht jederzeit, aber der Bodyguard erfährt jedes neue Ziel.",
      "**Todesstoß:** Sein erster Treffer gegen das Ziel ist tödlich – **{doomSeconds} Sekunden** später stirbt es in jedem Fall. Kein Totem und keine Phönixfeder retten, Weglaufen und Ausloggen auch nicht.",
      "Bestimmt gleich nach der Enthüllung seinen **Nachfolger** – einmal, nicht änderbar. Der weiß von nichts und wacht erst im nächsten Zyklus als Verräter auf.",
      "**Bestechung:** bietet {bribeDiamonds} Diamanten, die er nicht besitzen muss. Wer annimmt, kann nicht mehr gegen ihn stimmen. Nimmt der Bürgermeister an, übersteht der Verräter die nächste Abstimmung gegen ihn.",
      "**Phantomwandeln:** unsichtbar und unter fremdem Namen. Stirbt in dieser Zeit jemand durch ihn, steht im Totenbuch der falsche Name.",
      "**Sabotage:** Stromausfall, Störung im System oder Dunkle Nacht – siehe *So läuft es*.",
      "Fällt er, endet der Zyklus sofort: *Das Vermächtnis erstrahlt*, und die Schwarze Nacht beginnt.",
      "**Abtauchen gilt nicht:** Ist er **{revealDays} Tage** am Stück nicht im Spiel, erfahren alle, wer er ist – er spielt dann offen weiter. Einen Tag vorher bekommt er eine private Warnung; Zeit, in der der Server aus war oder er gesperrt war, zählt nicht.",
    ],
    mayor: ["Seine Stimme zählt **doppelt**.", "Lässt er sich bestechen, bekommt der Verräter eine **Wahl-Immunität** – die nächste Abstimmung gegen ihn verläuft im Sande."],
    treasurer: ["Findet heraus, wer eine Bestechung des Verräters angenommen hat – und damit, wer gegen ihn nicht stimmen kann."],
    fool: ["Will selbst **herausgewählt** werden. Gelingt es, scheidet er **nicht** aus, sondern bekommt einmal je Zyklus **{foolDiamonds} Diamanten**."],
    seer: ["Erkennt die Rolle eines Spielers. Aber Vorsicht: Der Doppelagent kann sich tarnen, und mit seiner *Rückendeckung* zeigt die nächste Prüfung am Verräter „Bürger“."],
    hacker: ["Beendet jede laufende Sabotage sofort – auch die Störung im System, die alle anderen Fähigkeiten sperrt. Seine eigene sperrt sie nicht."],
    recorder: ["Weiß, wer gerade online ist und seit wann, wer wann zuletzt da war und wie lange – gut, um Alibis zu prüfen."],
    detective: ["Liest im **Totenbuch** die letzten zehn Tode mit Zeitpunkt und Täter. Steht dort ein Name, kann es trotzdem der falsche sein – im Phantomwandeln trägt der Verräter einen fremden."],
    victim: ["Keine Fähigkeit. Wird das Opfer vom Verräter **endgültig** eliminiert, wird der Verräter **öffentlich enthüllt**."],
    guardian_angel: [
      "Fällt er als erklärtes Ziel durch den Verräter, bleibt er **{angelMinutes} Minuten als Zuschauer** und wählt **zwei Spieler**, die er schützt. Danach scheidet er aus.",
      "Der Schutz wirkt einmal: Wird ein Schützling als erklärtes Ziel vom Verräter getötet, überlebt er – auch wenn der Engel längst fort ist.",
    ],
    bodyguard: [
      "Bekommt eine Meldung, sobald der Verräter ein **Ziel** festlegt oder wechselt – auch offline, beim nächsten Betreten.",
      "*Beobachten* meldet, wenn sein Schützling vom Verräter getroffen wird, und nennt, wen der Verräter gerade im Visier hat.",
    ],
    sheriff: [
      "Klagt einen Spieler an und hat dann **{sheriffMinutes} Minuten**, ihn **selbst zu töten**.",
      "Ist es der Verräter, scheidet der endgültig aus – keine Immunität hilft. Ist er es nicht, bekommt der Getötete seine gewöhnliche Auszeit, der Sheriff aber die **dreifache**.",
      "**Todesstoß:** Sein erster Treffer gegen den Angeklagten ist tödlich – **{doomSeconds} Sekunden** später stirbt der in jedem Fall, an jedem Totem vorbei. Das Urteil gilt dann auch, wenn die Anklage bis dahin abgelaufen ist.",
    ],
    double_agent: [
      "Beginnt jeden Zyklus **unentschieden** und bekommt Aufträge von beiden Seiten – zur halben Belohnung.",
      "Wählt dann eine Seite: die Stadt – oder er bietet dem Verräter seine Dienste an. Nimmt der an, erfährt der Agent seinen Namen und kann nicht mehr gegen ihn stimmen. Einmal je Zyklus darf er zur Stadt überlaufen; dann erfährt der Verräter **seinen** Namen.",
      "Schreibt dem Verräter anonym, bestimmt, welche Rolle der Seher bei ihm sieht, und kann die Maske des Verräters im Phantomwandeln durchschauen.",
      "Erfüllte Aufträge bringen CP (Grundwert {missionReward}), dazu **{loyaltyCp} CP** für jeden Spieltag, den der Verräter mit ihm als Agent übersteht.",
    ],
    citizen: ["Keine Sonderfähigkeit – aber jede Stimme und jeder Beitrag zählt. Bürger wird, wer übrig bleibt, wenn alle Sonderrollen vergeben sind."],
  },
  mechanics: [
    {
      title: "Ein Zyklus",
      items: [
        "Zu Beginn werden die Rollen geheim verteilt: **ein Verräter**, die Sonderrollen, die der Operator in den Topf gelegt hat, und der Rest wird **Bürger**. Wer später dazukommt, bekommt eine freie Rolle – nie den Verräter.",
        "Die Gruppe arbeitet an den **globalen Aufgaben**, stimmt ab und sucht den Verräter. Der arbeitet dagegen – mit Sabotagen, Bestechung und seinem Ziel.",
        "Der Zyklus endet, wenn der Verräter fällt. Dann kommt die **Schwarze Nacht** und danach der nächste Zyklus mit neuen Rollen.",
      ],
    },
    {
      title: "Contribution Points (CP)",
      items: [
        "Jeder Beitrag zu einer Aufgabe bringt **sofort anteilig** Punkte: Wer ein Viertel beiträgt, bekommt ein Viertel ihrer CP – auch wenn die Aufgabe nie fertig wird.",
        "Dazu **{passiveCp} CP je Minute** im Spiel, höchstens **{passiveCap} am Tag**. Wer fünf Minuten lang weder geht noch sich umsieht, bekommt dafür nichts.",
        "Fähigkeiten kosten CP und haben eine Abklingzeit. Was eine Fähigkeit herausfindet, erfährt nur, wer sie benutzt – im Chat landet nichts davon.",
      ],
    },
    {
      title: "Abstimmungen",
      items: [
        "Eine **normale Abstimmung** eröffnet der Operator, eine **Notfall-Abstimmung** jeder Spieler – davon gibt es **{emergencyTotal} je Zyklus**, und jeder darf höchstens eine auslösen. Eine Abstimmung dauert **{voteMinutes} Minuten**.",
        "Der Operator kann die nächste Abstimmung **planen**, auch regelmäßig. Den Termin siehst du im Menü des Vermächtnisses und auf der Webseite; eine Stunde und zehn Minuten vorher erinnert der Chat, und zum Termin geht sie von selbst auf.",
        "Der Zwischenstand bleibt verborgen. Umentscheiden geht, solange die Zeit läuft; *Überspringen* ist eine Stimme für niemanden.",
        "Bei **Gleichstand** – oder wenn *Überspringen* vorne liegt – scheidet niemand aus. Sonst scheidet der Gewählte aus. Ausnahme: der Narr.",
        "Gewählt werden kann auch, wer gerade eine Auszeit hat – aus der Auszeit heraus abstimmen kann man aber nicht.",
      ],
    },
    {
      title: "Combat-Log, Tod und Auszeit",
      items: [
        "Jeder gefährliche Treffer startet den **Combat-Log** ({combatSeconds} Sekunden, jeder weitere Treffer setzt ihn zurück). **Rot** heißt: ein Spieler hat zugeschlagen – daran hängen die Folgen. **Orange**: nur Monster oder TNT.",
        "Gewöhnliche Tode (Monster, Sturz, Lava): die ersten {strikesFree} an einem Tag sind folgenlos, erst der **{deathStrikes}.** kostet **{timeoutHours} Stunden** Auszeit.",
        "Tod im **roten** Combat-Log: **{playerTimeoutHours} Stunden** Auszeit – auch wenn am Ende ein Monster den letzten Schlag setzt.",
        "Tod als **erklärtes Ziel** des Verräters: **ausgeschieden**.",
        "**Todesstoß:** Trifft dich der Verräter als sein Ziel – oder der Sheriff, der dich angeklagt hat –, stirbst du **{doomSeconds} Sekunden** nach dem ersten Treffer. Totems helfen dagegen nicht.",
        "Auszeit heißt: Du kommst so lange nicht auf den Server. Ausloggen hilft nicht – der Combat-Log läuft weiter, während du weg bist.",
      ],
    },
    {
      title: "Ausgeschieden",
      items: [
        "Wer herausgewählt, vom Verräter als erklärtes Ziel getötet oder vom Sheriff erwischt wird, ist **{outHours} Stunden** gesperrt.",
        "Danach kommt er wieder auf den Server, hat aber mit dem Vermächtnis nichts mehr zu tun – keine Rolle, keine Aufgaben, keine Abstimmungen – **für das ganze Spiel**. Nur der Operator kann ihn zurückholen.",
      ],
    },
    {
      title: "Sabotagen",
      items: [
        "Es läuft immer nur eine. Der **Hacker** beendet sie, der Operator auch.",
        "Stromausfall und Störung dauern **{sabotageMinutes} Minuten**, die Dunkle Nacht **{darkNightMinutes} Minuten**. Die Dunkle Nacht kommt auch von selbst – alle {darkNightMinDays} bis {darkNightMaxDays} Tage, zu einem zufälligen Zeitpunkt, sobald jemand im Spiel ist.",
        "Schlafen beendet die Dunkle Nacht nicht: Die Uhr wird auf Nacht festgehalten.",
      ],
      sabotages: true,
    },
    {
      title: "Zyklusende und die Schwarze Nacht",
      items: [
        "Fällt der Verräter, **erstrahlt das Vermächtnis**. Der letzte Spieler, der dann noch steht, wird **Wächter des Vermächtnisses** – und direkt danach beginnt die Schwarze Nacht.",
        "**{blackNightMinutes} Minuten**, die niemand überleben soll: Die Uhr steht auf Nacht, um jeden Spieler tauchen ständig neue, starke Monster auf, und alle sind geschwächt. Schlafen hilft nicht.",
        "Am Ende stirbt, wer noch steht. Wer in ihr stirbt, ist **{cycleBanHours} Stunden** draußen – wer offline war, bekommt nichts.",
        "Danach beginnt der nächste Zyklus mit neuen Rollen, und der Nachfolger des alten Verräters wacht als neuer Verräter auf.",
      ],
    },
    {
      title: "Nether und End",
      items: ["Beide sind zu Beginn verschlossen und öffnen sich nach der **gemeinsamen Spielzeit** aller Spieler: der Nether nach **{netherHours} Stunden**, das End nach **{endHours}**. Wie lange es noch dauert, steht im Menü des Vermächtnisses."],
    },
  ],
};
