# Deutsches Glossar und Regeln — Leonidakit (v7.62)

Quellsprache: Französisch (Duzen, « tu »). Zielsprache: **Deutsch (Deutschland)**, **duzen** („du“, „dein“), kurze klare Sätze,
Wörter, die ein Gamer benutzt. Die französische Seite vermeidet bewusst Fachjargon (kein „ROI“, kein „Kapital“, keine
„Amortisation“ in der Oberfläche): diesen Geist beibehalten. Die englische Übersetzung (outils/langues/en/) dient als Hilfe zum
Verständnis, übersetzt wird aber **aus dem Französischen**.

## Harte Regeln (Generator und Tests hängen davon ab)

1. **Platzhalter** `<1>…</1>`, `<2/>` sind HTML-Tags des Originals: jeden genau einmal behalten, gleiche Nummern. Sie dürfen
   verschoben werden, damit die deutsche Wortstellung passt. Nie neue hinzufügen. `{1}`, `{name}`, `{region}` ebenso.
2. **Code in einem Text** (`" aria-label="`, `">`, `data-x="`, `{`, `=`, Backslashes) bleibt Byte für Byte erhalten; nur die
   menschlichen Wörter übersetzen.
3. **Bruchstücke.** Viele Skript-Einträge sind Teile eines Satzes, den der Code zusammensetzt (`'Il manque ' + money(x) + ' pour '
   + name`). Bei kurzen Bruchstücken im französischen Code nachsehen (`grep -rn "Il manque" /home/claude/work/Leonidadex-main/*.js`),
   wie sie zusammengesetzt werden, und so übersetzen, dass der zusammengesetzte deutsche Satz natürlich klingt. Keine Leerzeichen
   am Anfang oder Ende hinzufügen oder entfernen: getrimmt schreiben, der Generator stellt die Abstände wieder her. Kleine
   Bindewörter (`et`, `de`, `pour`, `avec`, `sur`, `ou`, `dans`) → das passende deutsche Bindewort (`und`, `von`, `für`, `mit`,
   `auf`, `oder`, `in`).
4. **Plural-Endung, die der Code anhängt** (`n + ' achat' + (n > 1 ? 's' : '')`): das ist im Deutschen meist falsch („Kaufs“).
   Den Singular übersetzen und in `"_notes"` (Liste von Texten) den Schlüssel nennen: der Code wird angepasst.
5. **Geld**: deutsches Format, Dollarzeichen **nach** der Zahl mit Leerzeichen: französisch `200 000 $` → `200.000 $`;
   `1,5 million` → `1,5 Millionen`; `0 $` → `0 $`. Nie `$200,000`. Wenn das französische Bruchstück nur das Zeichen um eine vom
   Code gebaute Zahl enthält, setzt der Code es schon: nur die Wörter übersetzen. Prozent: `100 %` → `100 %`. Zeiten wie im Rechner
   mit den Einheitenzeichen: `1 h 30`, `45 min` (auch im Fließtext bei Zahlen: „2 h pro Tag“; ausgeschrieben „zwei Stunden“).
6. **Zahlen**: `1 250` → `1.250`; `2,5` → `2,5`; Jahreszahlen und Zähler ohne Trennzeichen (`2026`, `2547`) bleiben so.
   Jede Zahl des französischen Textes behalten, wenn möglich in derselben Reihenfolge (Zähler ändern sich von Version zu
   Version und werden automatisch abgeglichen).
7. **Datum**: `19 novembre 2026` → `19. November 2026`; `1er octobre` → `1. Oktober`; `27/09/2026` → `27.09.2026`.
8. **Zeichensetzung**: kein Leerzeichen vor `: ; ? !`. Französische Anführungszeichen « » → **„ “** (unten–oben). Apostroph ’.
   Ein Text, der mit « endet oder mit » beginnt (Bruchstück um einen Namen), wird zu „ bzw. “.
9. **Unverändert lassen** (`"="` als Übersetzung, wenn der ganze Text ein Name ist): Leonidakit, Leonida, Léo, GTA VI, Grand
   Theft Auto, Rockstar Games, Take-Two Interactive, Vice City, Port Gellhorn, Grassrivers, Mount Kalaga, Ambrosia, Leonida Keys,
   Jason, Lucia, Brian Heder, Boobie, Marken- und Fahrzeug-/Waffennamen (Albany Emperor, Girardi ES9…), Läden (Rideout Customs,
   Ammu-Nation…), englische Titel von Quellen (Artikelüberschriften), Vercel, Brevo, OVH. Gesetze: LCEN, RGPD → DSGVO, CNIL.
   Ein gewöhnliches englisches Wort, das im Englischen mit „=“ stand (z. B. „BMX bike“, „Beach cruiser“), wird übersetzt
   („BMX-Rad“, „Beach-Cruiser“).
10. **Suchbegriffe** (lange Folgen kleingeschriebener Wörter ohne Akzente, nur zum Abgleich, z. B. « lexington (michael) coupe
    classique de michael : 40 $ en salon courant », Dateien recherche-*, Schlüssel `search-index.js::…`): in deutsche
    Kleinbuchstaben-Suchwörter übersetzen, **ohne Umlaute und ohne ß** (ä→a, ö→o, ü→u, ß→ss), alle Namen behalten, normale
    Leerzeichen, Preise als „40 $“.

## Wörter, die der Code sucht — genau so verwenden, wenn das Französische diese Idee hat

- « de côté », « argent mis de côté », « réserve » → **Rücklage** / **zurückgelegt** („l’argent que je garde de côté“ → „Geld,
  das ich zurücklege“).
- « argent que tu as » → **Geld, das du hast**; « argent disponible » → **verfügbares Geld**; « J’ai déjà » → **Ich habe schon**;
  « pas assez d’argent » → **nicht genug Geld**; « insuffisant » → **reicht nicht**.
- « en plus » → **zusätzlich**; « par heure » → **pro Stunde**; « horaire » → **stündlich**; « tu gagnes » / « Je gagne » am
  Anfang eines Feldes → **du verdienst** / **Ich verdiene**.
- « objectif » → **Ziel**; « somme visée » → **Zielbetrag**; « Je veux avoir » → **Ich will haben**.
- « prix » → **Preis**; « coûte » → **kostet**; « par jour » → **pro Tag**; « quotidien » → **täglich**;
  « jours par semaine » → **Tage pro Woche**; « temps de jeu par jour » → **Spielzeit pro Tag**.
- « durée de session » → **Sessiondauer**; « temps disponible » → **verfügbare Zeit**; « prochaine partie » → **nächste Session**.
- « joueurs » → **Spieler**; « durée en heures » → **Dauer in Stunden**; « tu t’en sers » → **du es nutzt**.
- « dépenses par partie » → **Ausgaben pro Session**; « il faut atteindre » → **musst du erreichen**.
- « frais » → **Kosten**; « coûts » → **Kosten**.
- Fehlermeldungen, die mit « Écris… / Dis… / Choisis… / Ajoute… / Note… » beginnen, beginnen mit **Gib… / Sag… / Wähle… /
  Füge… / Notiere…** (z. B. „Écris le prix“ → „Gib den Preis ein“).
- « Parcours à compléter » → **Weg vervollständigen**.
- « TES CHIFFRES » → **DEINE ZAHLEN**; « MA RÉPONSE » → **MEINE ANTWORT**.
- « Achat « » (Ereignis `'Achat « ' + name + ' »'`) → **Kauf „** und « » » → **“**.
- « non enregistré(e)(s) » → enthält **nicht gespeichert**; « mémoire seulement » → enthält **nur im Speicher**.
- « Terminé » (Schrittstatus) → **Fertig**.

## Feste Begriffe

| Französisch | Deutsch |
|---|---|
| Calculateur | Rechner |
| Mon objectif | Mein Ziel |
| Mes achats | Meine Käufe |
| Est-ce que je peux l’acheter ? | Kann ich es kaufen? |
| Mon temps de jeu | Meine Spielzeit |
| Mon budget | Mein Budget |
| Quoi acheter d’abord ? | Was zuerst kaufen? |
| Ça vaut le coup ? | Lohnt es sich? |
| Mes activités | Meine Aktivitäten |
| Quel achat choisir ? | Welchen Kauf wählen? |
| Mon business plan | Mein Businessplan |
| Mes calculs / Mes plans | Meine Berechnungen / Meine Pläne |
| les huit calculs | die acht Berechnungen |
| Simple / Pas à pas / Expert | Einfach / Schritt für Schritt / Experte |
| partie (Spielrunde) | Session |
| heure de jeu / temps de jeu | Spielstunde / Spielzeit |
| mission, activité, braquage | Mission, Aktivität, Raubüberfall |
| récompense, frais, préparation, attente | Belohnung, Kosten, Vorbereitung, Wartezeit |
| ta part | dein Anteil |
| gain, gain net, gagné en plus | Einnahmen, Nettogewinn, zusätzlich verdient |
| achat, achat libre, Mon achat libre | Kauf, eigener Kauf, Mein eigener Kauf |
| le prix que tu imagines | der Preis, den du dir vorstellst |
| remboursé | wieder eingespielt |
| coût d’usage | laufende Kosten |
| carburant, entretien, réparations, assurance, revente | Sprit, Wartung, Reparaturen, Versicherung, Wiederverkauf |
| Mon envie, de 1 à 5 / Envie | Wie sehr ich es will (1 bis 5) / Wunsch |
| fiche (Seite eines Objekts) | Seite („Retour à la fiche“ → „Zurück zur Seite“, „Voir la fiche“ → „Seite öffnen“, „fiche véhicule“ → „Fahrzeugseite“) |
| fiche de calcul / fiche du plan | Berechnungsblatt / Planblatt |
| carnet(s), Mes carnets | Tracker, Meine Tracker |
| Mon garage, Mon arsenal, Ma garde-robe | Meine Garage, Mein Arsenal, Meine Garderobe |
| Mes consommables, Mes personnalisations, Mes propriétés, Mes lieux, Mes collectibles | Meine Verbrauchsgüter, Meine Anpassungen, Meine Immobilien, Meine Orte, Meine Sammelobjekte |
| Enregistrer ce calcul / le plan | Diese Berechnung speichern / Plan speichern |
| Exporter, Importer, Partager | Exportieren, Importieren, Teilen |
| Afficher plus de détails | Mehr Details anzeigen |
| catalogue | Katalog |
| Tuto | Tutorial |
| Carte, Véhicules, Armurerie, Achats, Progression | Karte, Fahrzeuge, Waffenkammer, Shop, Fortschritt |
| Explorer (Menü) | Entdecken |
| Le monde, Lieux, Personnages, Demeures, Planques, Entreprises, Collectibles | Die Welt, Orte, Charaktere, Wohnsitze, Unterschlüpfe, Unternehmen, Sammelobjekte |
| S’équiper | Ausrüsten |
| Le site, À propos, Contact, Médias et crédits, Mentions et confidentialité | Die Seite, Über die Seite, Kontakt, Medien und Credits, Impressum und Datenschutz |
| Tout ce qui s’achète | Alles, was man kaufen kann |
| Consommables, Vêtements et style, Personnalisations | Verbrauchsgüter, Kleidung und Style, Anpassung |
| Munitions et équipement, Logements et appartements, Bateaux | Munition und Ausrüstung, Unterkünfte und Apartments, Boote |
| Comprendre les statuts | Die Status verstehen |
| Changer la langue | Sprache ändern |

## Status

Officiel → Offiziell · Vu dans un média → In Medien gesehen · Identification communautaire → Community-Identifizierung ·
Repère de la série → Referenz aus der Reihe · À confirmer → Noch zu bestätigen · Pas encore connu → Noch nicht bekannt ·
Estimation → Schätzung · Estimé → Geschätzt · Valeur personnelle → Eigener Wert · Non confirmé → Unbestätigt · Mesuré et vérifié →
Gemessen und geprüft · Mesuré → Gemessen · Ton chiffre → Deine Zahl · À toi → Deins · Exemple → Beispiel · Simulation →
Simulation · Sans objet → Entfällt · Pas encore écrit / À écrire → Noch nicht geschrieben / Einzutragen · Prix à venir → Preis
folgt · Achat à confirmer → Kauf noch unbestätigt · Mécanique non confirmée → Mechanik unbestätigt · Autre jeu → Anderes Spiel.
Karte (Zuverlässigkeit): Officiel / Aperçu / Supposé → Offiziell / Gesichtet / Vermutet; « nom supposé » → **vermuteter Name**;
« nom réel » → **echter Name**.

## Impressum und Datenschutz (Mentions et confidentialité)

éditeur → Herausgeber · hébergeur → Hoster · responsable du traitement → Verantwortlicher · délégué à la protection des données →
Datenschutzbeauftragter · base légale → Rechtsgrundlage · intérêt légitime → berechtigtes Interesse · consentement → Einwilligung ·
loi Informatique et Libertés → französisches Datenschutzgesetz (loi Informatique et Libertés) · LCEN und CNIL beibehalten ·
RGPD → DSGVO. Jedes Datum, jede Adresse und jede Zahl beibehalten. „La version française fait foi“ → „Maßgeblich ist die
französische Fassung“.

## Ganze Seite

| Französisch | Deutsch |
|---|---|
| hub / page de section | Bereichsseite |
| liste dépliable | aufklappbare Liste |
| possédé / à obtenir / envie | besessen / zu holen / Wunschliste („Je l’ai“ → „Hab ich“, „J’en ai envie“ → „Will ich haben“) |
| repéré (lieu, véhicule) | entdeckt |
| rapprochement (inspiration réelle) | Zuordnung („rapprochement communautaire“ → „Zuordnung der Community“) |
| modèle réel, inspiration réelle | reales Vorbild, reale Inspiration |
| Équivalent réel | Reales Gegenstück |
| Nom en jeu inconnu à ce jour | Name im Spiel noch unbekannt |
| bâtiment, comté, ville, quartier | Gebäude, County, Stadt, Viertel |
| Comtés / Villes / Quartiers / Bâtiments / Transports / Nature / Lieu / Planques (Kartenkategorien) | Countys / Städte / Viertel / Gebäude / Verkehr / Natur / Ort / Unterschlüpfe |
| Comté de Leonard (usw.) | Leonard County (wie auf den offiziellen Schildern: „Kelly County“) |
| Voir sur la carte | Auf der Karte ansehen |
| Régions | Regionen |
| Armurerie, Armes, Munitions, Équipement | Waffenkammer, Waffen, Munition, Ausrüstung |
| Véhicules : Berlines, Voitures de sport, Supercars, Muscle cars, SUV et 4x4, Pickups et tout-terrain, Vans et cargos, Deux-roues et quads, Hélicoptères, Avions, Bateaux et jet-skis, Service et urgence, Divers | Limousinen, Sportwagen, Supersportwagen, Muscle-Cars, SUVs und Geländewagen, Pick-ups und Offroader, Vans und Transporter, Zweiräder und Quads, Hubschrauber, Flugzeuge, Boote und Jetskis, Dienst- und Einsatzfahrzeuge, Sonstiges |
| Armes : Pistolets, Fusils à pompe, Pistolets-mitrailleurs, Fusils d’assaut, Précision, Mitrailleuses, Mêlée, Projectiles, Spéciales | Pistolen, Schrotflinten, Maschinenpistolen, Sturmgewehre, Präzisionsgewehre, Maschinengewehre, Nahkampf, Wurfwaffen, Spezialwaffen |
| Coiffures, Tatouages, Tenues, Accessoires, Logements, Garages | Frisuren, Tattoos, Outfits, Accessoires, Unterkünfte, Garagen |
| Édition Standard / Édition Ultimate / précommande | Standard Edition / Ultimate Edition / Vorbestellung |
| bande-annonce, trailer, capture officielle, visuel officiel | Trailer, Trailer, offizieller Screenshot, offizielles Bild |
| marque inconnue | unbekannte Marke |
| Ajouter à mon garage | Zu meiner Garage hinzufügen |
| Comparer, Personnaliser, Comparateur | Vergleichen, Anpassen, Vergleich |
| Classement | Rangliste |
| Page introuvable | Seite nicht gefunden |
