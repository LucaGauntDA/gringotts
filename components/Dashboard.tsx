import React, { useState, useEffect, useRef } from 'react';
import type { User, Transaction, Currency } from '../types';
import { House } from '../types';
import { SendIcon, HistoryIcon, CrownIcon, UsersIcon, TrashIcon, RestoreIcon, UserEditIcon, UserIcon, FilterIcon } from './icons';
import { currencyToKnuts, knutsToCanonical } from '../utils';

const houseTextColors: { [key: string]: string } = {
  [House.Gryffindor]: 'text-red-400',
  [House.Hufflepuff]: 'text-yellow-300',
  [House.Ravenclaw]: 'text-blue-400',
  [House.Slytherin]: 'text-green-400',
};

interface DashboardProps {
  currentUser: User;
  users: User[];
  transactions: Transaction[];
  onSendMoney: (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => Promise<void>;
  isKing?: boolean;
  globalTransactions?: Transaction[];
  onUpdateUser: (userId: string, updates: { name: string; house: House; balance: number }) => Promise<void>;
  onSoftDeleteUser: (userId: string) => Promise<void>;
  onRestoreUser: (userId: string) => Promise<void>;
}

const UserEditModal: React.FC<{
  user: User;
  onClose: () => void;
  onSave: (userId: string, updates: { name: string; house: House; balance: number }) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  isEditingSelf: boolean;
  isKing: boolean;
}> = ({ user, onClose, onSave, onDelete, isEditingSelf, isKing }) => {
  const [name, setName] = useState(user.name);
  const [house, setHouse] = useState(user.house);
  const [galleons, setGalleons] = useState('');
  const [sickles, setSickles] = useState('');
  const [knuts, setKnuts] = useState('');
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    const currency = knutsToCanonical(user.balance);
    setGalleons(String(currency.galleons));
    setSickles(String(currency.sickles));
    setKnuts(String(currency.knuts));
  }, [user]);

  const handleSave = async () => {
    setError('');
    if (!name.trim()) {
      setError('Name darf nicht leer sein.');
      return;
    }
    const balance = currencyToKnuts({
      galleons: parseInt(galleons) || 0,
      sickles: parseInt(sickles) || 0,
      knuts: parseInt(knuts) || 0,
    });
    // The King can set a negative balance for anyone, including themself.
    if (balance < 0 && !isKing) {
        setError('Der Kontostand darf nicht negativ sein.');
        return;
    }
    try {
      await onSave(user.id, { name: name.trim(), house, balance });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Speichern fehlgeschlagen.');
    }
  };
  
  const handleDelete = async () => {
      try {
          await onDelete(user.id);
          onClose();
      } catch (e: any) {
          setError(e.message || 'Löschen fehlgeschlagen.');
      }
  }

  const commonInputStyles = "w-full p-3 bg-black/20 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow text-base";
  const canEdit = !isEditingSelf || isKing;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
        <div className="bg-[#2a2a2a] rounded-3xl p-8 border border-[#FFFFFF59] max-w-md w-full" onClick={e => e.stopPropagation()}>
            {showConfirmDelete ? (
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-2">Nutzer wirklich löschen?</h3>
                    <p className="opacity-80 mb-6">Möchtest du {user.name} wirklich löschen? Der Nutzer kann wiederhergestellt werden.</p>
                    <div className="flex gap-4">
                        <button onClick={() => setShowConfirmDelete(false)} className="w-full text-white bg-white/10 hover:bg-white/20 font-bold rounded-full text-base px-5 text-center h-12 transition-colors">Abbrechen</button>
                        <button onClick={handleDelete} className="w-full text-white bg-red-600 hover:bg-red-700 font-bold rounded-full text-base px-5 text-center h-12 transition-colors">Löschen</button>
                    </div>
                </div>
            ) : (
                 <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-2xl font-bold text-center mb-2">Nutzer bearbeiten</h3>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="edit-name" className="block mb-2 text-sm font-medium opacity-80">Name</label>
                            <input id="edit-name" type="text" value={name} onChange={e => setName(e.target.value)} className={commonInputStyles} disabled={!canEdit} />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium opacity-80">Haus</label>
                            <select value={house} onChange={e => setHouse(e.target.value as House)} className={commonInputStyles + ' cursor-pointer'} disabled={!canEdit}>
                                {Object.values(House).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-medium opacity-80">Kontostand</label>
                            <div className="grid grid-cols-3 gap-2">
                                <input type="number" placeholder="Galleonen" value={galleons} onChange={e => setGalleons(e.target.value)} className={commonInputStyles} disabled={!canEdit} />
                                <input type="number" placeholder="Sickel" value={sickles} onChange={e => setSickles(e.target.value)} className={commonInputStyles} disabled={!canEdit} />
                                <input type="number" placeholder="Knut" value={knuts} onChange={e => setKnuts(e.target.value)} className={commonInputStyles} disabled={!canEdit} />
                            </div>
                        </div>
                         {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                             {!isEditingSelf && <button onClick={() => setShowConfirmDelete(true)} className="w-full sm:w-auto flex-1 text-white bg-red-600/80 hover:bg-red-600 font-bold rounded-full h-12 transition-colors order-2 sm:order-1">Löschen</button>}
                            <button onClick={handleSave} className="w-full sm:w-auto flex-1 text-black bg-white hover:bg-gray-200 font-bold rounded-full h-12 transition-colors order-1 sm:order-2" disabled={!canEdit}>Speichern</button>
                        </div>
                        {isEditingSelf && !isKing && <p className="text-xs text-center opacity-60 pt-2">Du kannst dein eigenes Profil nicht bearbeiten. Bitte den King um Hilfe.</p>}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

const notePlaceholders = [
    "für Butterbier",
    "Runde Feuerwhiskey",
    "Schulden bei den Weasleys",
    "Neuer Besen",
    "Zutaten für Vielsafttrank",
    "Wettgewinn vom Quidditch-Spiel",
    "Bestechungsgeld für Filch",
    "Eine Kiste Bertie Botts Bohnen",
    "Reisekosten für den Fahrenden Ritter",
    "Reparatur für den kaputten Zauberstab",
    "Eintritt für die Heulende Hütte",
    "Ein neues Exemplar von 'Phantastische Tierwesen'",
    "Kaution für Hagrid",
    "Spende für S.P.E.W.",
    "Ein paar Schokofrösche",
    "Beitrag zur nächsten DA-Sitzung",
    "Eine Federkiel-Lizenz",
    "Nachhilfe in Verwandlung",
    "Ein Heuler für Malfoy",
    "Karte des Rumtreibers",
    "Dein Anteil am Honigtopf-Raubzug",
    "Die neuesten Zauberscherze",
    "Ein Abo vom Tagespropheten",
    "Rückzahlung für die Butterbier-Runde",
    "Neuer Umhang von Madam Malkin's",
    "Kürbissaft für alle",
    "Ein Päckchen Zischende Wissbies",
    "Pflege für einen Hippogreif",
    "Eine Flasche Veritaserum (nicht fragen)",
    "Ein Denkarium zum Ausleihen",
    "Magische Tiernahrung",
    "Reparaturkosten für das fliegende Auto",
    "Schweineohren von den Drei Besen",
    "Gehalt für den Hauself",
    "Eine seltene Alraune",
    "Investition in einen portablen Sumpf",
    "Geld für den nächsten Hogsmeade-Ausflug",
    "Ein neues Paar Drachenleder-Handschuhe",
    "Spende an den Orden des Phönix",
    "Ein neuer Satz Zaubertrank-Fläschchen",
    "Ein magisches Schachspiel",
    "Erinnerungsmich-Ersatz",
    "Eine Kiste Knallbonbons",
    "Bestellung bei Eeylops Eulenkaufhaus",
    "Ein seltener Zaubertrank-Aufsatz",
    "Die Pflege von Krätze",
    "Ein Pfund Mondkalb-Dung",
    "Eine Schachtel Lakritz-Zauberstäbe",
    "Ersatz für den explodierenden Kessel",
    "Ein verfluchtes Halsband (Scherz!)",
    "Dein Geburtstagsgeschenk",
    "Eine Schachtel Würg Riegel",
    "Für ein paar Verlängerbare Ohren",
    "Investition in Kanarienvogel-Kekse",
    "Peruanisches Instant-Finsternispulver",
    "Ein Päckchen Nasch-und-Schwänz-Leckereien",
    "Garantierte 10-Sekunden-Pickel-Entferner",
    "Ein Liebestrank (für Forschungszwecke, natürlich)",
    "Wiederauffüllbarer Vorrat an Kotzbomben",
    "Ein Set essbarer Dunkler Male",
    "Für einen patentierten Tagtraumzauber",
    "Ein Kopf-ab-Hut, nur zum Spaß",
    "Ein Wunderhexen-Zauber-Set",
    "Geld für den Scherzartikelladen",
    "Eine Lieferung Fressanfall-Fudge",
    "Einkaufstour bei Honigtopf",
    "Ein paar Pints in den Drei Besen",
    "Neuer Kessel von Potage's",
    "Einkauf bei Flourish & Blotts",
    "Neue Feder von Scrivenshaft's",
    "Ein Besuch bei Zonko's Scherzartikelladen",
    "Geld für Madam Puddifoot's Teesalon",
    "Eulenleckerlis von Eeylops",
    "Die neueste Ausgabe des Tagespropheten",
    "Eine Kugel bei Florean Fortescue's Eissalon",
    "Neue Roben von Madam Malkin's",
    "Ein Besuch im Tropfenden Kessel",
    "Gringotts Bearbeitungsgebühr",
    "Besenpolitur-Set",
    "Tickets für das nächste Chudley Cannons Spiel",
    "Wetteinsatz für das Gryffindor vs. Slytherin Spiel",
    "Neuer Satz Quidditch-Handschuhe",
    "Reparatur des Klatschers",
    "Ein Poster von Viktor Krum",
    "Team-Beitrag für neue Umhänge",
    "Ein Quidditch-Almanach",
    "Heiltrank für nach dem Training",
    "Ein Ticket für die Quidditch-Weltmeisterschaft",
    "Futter für einen Kniesel",
    "Ein Halsband für Fang",
    "Drachenfutter (streng geheim)",
    "Eine neue Decke für Hedwig's Käfig",
    "Ein Buch über die Pflege von Hippogreifen",
    "Bezahlung für die De-Gnomisierung des Gartens",
    "Ein Sack voll Niffler-Futter",
    "Bowtruckle-Zweige",
    "Ein Terrarium für einen Schrumpffüßler",
    "Salamander-Futter",
    "Nachhilfe in Zaubertränke bei Slughorn",
    "Ein neuer Satz Phiolen",
    "Pergament und Tinte",
    "Eine Ausgabe von 'Verteidigung für Fortgeschrittene'",
    "Beitrag für den Duellierclub",
    "Gebühr für die Apparierprüfung",
    "Ein neues Teleskop für Astronomie",
    "Kräuterkunde-Handschuhe",
    "Ein Exemplar von 'Geschichte der Zauberei'",
    "Punkte für den Hauspokal kaufen (versuchen wir's mal)",
    "Schweigegeld für Peeves",
    "Passwort für die fette Dame vergessen",
    "Ein Beitrag zum 'Wir-hassen-Umbridge'-Fond",
    "Ein Portschlüssel nach Hause",
    "Ein neues Paar Socken für Dobby",
    "Gebühr für die Bibliothek (Buch war überfällig)",
    "Ein magisches Amulett gegen Nargel",
    "Eine Flasche Felix Felicis (sehr teuer)",
    "Ein neuer Zeitumkehrer (der alte ist kaputt)",
    "Ein Gobstone-Set",
    "Zauberer-Schach-Wetteinsatz",
    "Eine Ausgabe des Klitterers",
    "Finanzierung für die Suche nach dem Schrumpfhörnigen Schnarchkackler",
    "Ein Geschenk für Professor McGonagall",
    "Ein Heuler an meine Eltern (Porto)",
    "Bestechung für einen Slytherin, damit er schweigt",
    "Ein Beruhigungstrank für die ZAGs",
    "Bezahlung für die Entfernung eines Flederwicht-Fluchs",
    "Ein Zauber, um Socken zu sortieren",
    "Ein Abonnement für 'Hexenwoche'",
    "Ein Selbst-umrührender Kessel",
    "Ein Set Explodierender Snap",
    "Eine Spende für St. Mungo's",
    "Rückzahlung einer verlorenen Wette",
    "Geld für den nächsten Streich",
    "Ein neuer Tarnumhang (der alte hat ein Loch)",
    "Ein seltenes Autogramm von Gilderoy Lockhart",
    "Ein magischer Kalender, der Termine schreit",
    "Ein Muggel-Artefakt für Mr. Weasley",
    "Eine Kiste mit heulenden Süßigkeiten",
    "Ein Zauber, der die Hausaufgaben macht",
    "Eine Flasche Odgen's Old Firewhisky",
    "Ein Päckchen Droobles Bester Blaskaugummi",
    "Ein Geschenk für den Hausgeist",
    "Reparatur eines zerbrochenen Erinner-michs",
    "Einladung zum Weihnachtsball (plus eins)",
    "Geld für einen neuen Familiar",
    "Ein Zauberbuch mit leeren Seiten (Scherz!)",
    "Beitrag für die nächste Party im Gemeinschaftsraum",
    "Ein magisches Vorhängeschloss für mein Tagebuch",
    "Eine Schachtel Säure-Knaller",
    "Ein Zauber, der Gemüse wie Süßigkeiten schmecken lässt",
    "Eine Karte für das Konzert der Schwestern des Schicksals",
    "Ein Set selbststrickender Nadeln",
    "Eine verzauberte Schneekugel von Hogsmeade",
    "Geld für einen Ausflug in die Winkelgasse",
    "Ein Päckchen singender Lebkuchenmänner",
    "Ein Amulett zum Schutz vor Werwölfen (nur für den Fall)",
    "Ein verzauberter Kompass, der zum Kühlschrank führt",
    "Ein Kissen, das einem Schlaflieder vorsingt",
    "Ein magisches Pflaster, das Wunden sofort heilt",
    "Ein Zauber, der verlorene Gegenstände findet",
    "Ein Set unsichtbarer Tinte",
    "Ein verzaubertes Lesezeichen, das die Geschichte vorliest",
    "Ein magischer Federkiel, der nicht kleckst",
    "Ein Set schwebender Kerzen für mein Zimmer",
    "Ein Zauber, der die Schuhe selbst bindet",
    "Eine Flasche Elfenwein",
    "Ein verzauberter Regenschirm, der einen immer trocken hält",
    "Ein magischer Fön, der die Haare in Sekunden stylt",
    "Ein Set selbst-nachfüllender Tintenfässer",
    "Eine Packung Kaugummi, das nie seinen Geschmack verliert",
    "Ein verzauberter Spiegel, der Komplimente macht",
    "Ein magischer Notizblock, der Gedanken aufschreibt",
    "Ein Set magischer Würfel, die immer Glück bringen",
    "Ein Zauber, der die Wäsche selbst wäscht und faltet",
    "Eine verzauberte Teetasse, die nie kalt wird",
    "Ein magischer Wecker, der einen sanft weckt",
    "Ein Set selbst-schreibender Federn für Notizen",
    "Eine magische Gießkanne, die Pflanzen perfekt bewässert",
    "Ein verzauberter Pinsel, der von alleine malt",
    "Ein magischer Türklopfer, der Witze erzählt",
    "Ein Set schwebender Lichterketten",
    "Ein verzauberter Schal, der immer die perfekte Temperatur hat",
    "Eine magische Spieluhr mit beruhigenden Melodien",
    "Ein Zauber, der den Boden selbst schrubbt",
    "Ein verzauberter Stuhl, der sich dem Rücken anpasst",
    "Ein magischer Kalender, der an Geburtstage erinnert",
    "Ein Set selbst-aktualisierender Karten",
    "Eine magische Duftkerze, die den Lieblingsduft verströmt",
    "Ein verzauberter Teppich, der Flecken abweist",
    "Ein magischer Fotorahmen mit bewegten Bildern",
    "Ein Set selbst-mischender Spielkarten",
    "Eine verzauberte Kaffeemaschine, die den perfekten Kaffee kocht",
    "Ein magischer Toaster, der das Brot nie verbrennt",
    "Ein Set selbst-reinigender Fenster",
    "Ein verzauberter Kleiderschrank, der das Outfit des Tages vorschlägt",
    "Ein magischer Mülleimer, der sich selbst leert",
    "Ein Set schwebender Bücherregale",
    "Eine verzauberte Türklingel mit verschiedenen Melodien",
    "Ein magischer Schlüssel, der jedes Schloss öffnet (fast)",
    "Ein Set selbst-aufblasender Luftballons",
    "Eine verzauberte Hängematte für den Gemeinschaftsraum",
    "Ein magischer Radiergummi, der keine Spuren hinterlässt",
    "Ein Set selbst-kühlender Getränkehalter",
    "Eine verzauberte Blumenvase, die Blumen ewig frisch hält",
    "Ein magischer Notenständer, der die Seiten umblättert",
    "Ein Set selbst-leuchtender Sterne für die Decke",
    "Eine verzauberte Nähmaschine, die von alleine näht",
    "Ein magischer Fächer, der kühle Brisen erzeugt",
    "Ein Set selbst-organisierender Schubladen",
    "Eine verzauberte Leseleuchte, die die Augen schont",
    "Ein magischer Weinkühler",
    "Ein Set selbst-schärfender Messer für die Küche",
    "Eine verzauberte Picknickdecke, die Insekten fernhält",
    "Ein magischer Komposter, der Abfall sofort in Erde verwandelt",
    "Ein Set selbst-wachsender Kräuter für die Küche",
    "Eine verzauberte Bratpfanne, die das Essen nicht anbrennen lässt",
    "Ein magischer Salz- und Pfefferstreuer, der nie leer wird",
    "Ein Set selbst-reinigender Pinsel",
    "Eine verzauberte Staffelei, die das Bild festhält",
    "Ein magisches Skizzenbuch, das Ideen zum Leben erweckt",
    "Ein Set selbst-stimmender Musikinstrumente",
    "Eine verzauberte Harfe, die von alleine spielt",
    "Ein magisches Metronom, das den Takt hält",
    "Ein Set selbst-schreibender Notenblätter",
    "Eine verzauberte Flöte mit bezaubernden Klängen",
    "Ein magisches Schlagzeug, das im Takt bleibt",
    "Ein Set selbst-tanzender Schuhe",
    "Eine verzauberte Jukebox mit allen Lieblingsliedern",
    "Ein magischer Plattenspieler mit unendlicher Plattenauswahl",
    "Ein Set selbst-aufbauender Zelte für Campingausflüge",
    "Eine verzauberte Angelrute, die immer Fische fängt",
    "Ein magisches Lagerfeuer, das nie ausgeht",
    "Ein Set selbst-wärmender Socken für kalte Nächte",
    "Eine verzauberte Thermoskanne, die Getränke ewig heiß oder kalt hält",
    "Ein magischer Rucksack mit unendlich viel Platz",
    "Ein Set selbst-findender Wanderkarten",
    "Eine verzauberte Laterne, die den Weg erhellt",
    "Ein magischer Schlafsack, der immer bequem ist",
    "Ein Set selbst-aufstellender Hängematten",
    "Eine verzauberte Wasserflasche, die sich selbst reinigt und auffüllt",
    "Ein magischer Kompass, der zu Abenteuern führt",
    "Ein Set selbst-trocknender Handtücher",
    "Eine verzauberte Sonnencreme, die perfekten Schutz bietet",
    "Ein magischer Sonnenschirm, der Schatten spendet",
    "Ein Set selbst-aufblasender Schwimmtiere",
    "Eine verzauberte Strandtasche mit allem, was man braucht",
    "Ein magischer Sandkasten mit unendlich viel Sand",
    "Ein Set selbst-bauender Sandburgen",
    "Eine verzauberte Muschel, die das Meeresrauschen wiedergibt",
    "Ein magisches Fernglas, das in die Ferne blicken lässt",
    "Ein Set selbst-fahrender Koffer",
    "Eine verzauberte Reiseapotheke mit allen Heilmitteln",
    "Ein magischer Universalübersetzer",
    "Ein Set selbst-stempelnder Postkarten",
    "Eine verzauberte Kamera, die die besten Momente festhält",
    "Ein magisches Reisetagebuch, das Erlebnisse aufzeichnet",
    "Ein Set selbst-packender Kofferorganizer",
    "Eine verzauberte Nackenrolle für bequemes Reisen",
    "Ein magischer Stadtplan, der den Weg weist",
    "Ein Set selbst-findender Souvenirs",
    "Eine verzauberte Souvenirtasse, die das Lieblingsgetränk enthält",
    "Ein magischer Schlüsselanhänger, der verlorene Schlüssel findet",
    "Ein Set selbst-schließender Reißverschlüsse",
    "Eine verzauberte Geldbörse, die nie leer wird (Wunschdenken)",
    "Ein magischer Pass, der alle Grenzen öffnet",
    "Ein Set selbst-erneuernder Flugtickets",
    "Eine verzauberte Sonnenbrille, die die Welt bunter macht",
    "Ein magischer Hut, der vor Sonne und Regen schützt",
    "Ein Set selbst-kühlender Kleidung für heiße Tage",
    "Eine verzauberte Jacke, die sich dem Wetter anpasst",
    "Ein magischer Schal, der vor Kälte schützt",
    "Ein Set selbst-wärmender Handschuhe",
    "Eine verzauberte Mütze, die nie vom Kopf fällt",
    "Ein magischer Regenschirm, der sich selbst aufspannt und schließt",
    "Ein Set selbst-reinigender Schuhe",
    "Eine verzauberte Tasche mit unzähligen Fächern",
    "Ein magischer Gürtel, der sich der Taille anpasst",
    "Ein Set selbst-bügelnder Hemden",
    "Eine verzauberte Krawatte, die sich selbst bindet",
    "Ein magischer Anzug, der immer perfekt sitzt",
    "Ein Set selbst-polierender Schuhe",
    "Eine verzauberte Uhr, die die Zeit verlangsamen kann",
    "Ein magisches Armband, das Glück bringt",
    "Ein Set selbst-wechselnder Ohrringe",
    "Eine verzauberte Halskette, die im Dunkeln leuchtet",
    "Ein magischer Ring, der die Stimmung anzeigt",
    "Ein Set selbst-lackierender Fingernägel",
    "Ein verzauberter Lippenstift, der die Farbe wechselt",
    "Ein magischer Pinsel, der das perfekte Make-up zaubert",
    "Ein Set selbst-pflegender Hautcremes",
    "Eine verzauberte Haarbürste, die Knoten löst",
    "Ein magischer Spiegel, der die Zukunft zeigt (vielleicht)",
    "Ein Set selbst-schneidender Haarscheren",
    "Ein verzauberter Rasierer, der nie stumpf wird",
    "Ein magisches Parfüm, das unwiderstehlich macht",
    "Ein Set selbst-reinigender Zahnspangen",
    "Eine verzauberte Zahnbürste, die perfekt putzt",
    "Ein magischer Zahnstocher, der nie bricht",
    "Ein Set selbst-erneuerender Kontaktlinsen",
    "Eine verzauberte Brille, die nie beschlägt",
    "Ein magisches Hörgerät, das alles hört",
    "Ein Set selbst-schreibender Rezepte",
    "Eine verzauberte Kochschürze, die sauber bleibt",
    "Ein magisches Kochbuch mit unendlichen Rezepten",
    "Ein Set selbst-schälender Kartoffeln",
    "Eine verzauberte Küchenmaschine, die alles kann",
    "Ein magischer Ofen, der die perfekte Temperatur hält",
    "Ein Set selbst-spülender Töpfe und Pfannen",
    "Eine verzauberte Spülmaschine, die das Geschirr trocknet und einräumt",
    "Ein magischer Kühlschrank, der sich selbst auffüllt",
    "Ein Set selbst-sortierender Gewürze",
    "Eine verzauberte Kaffeetasse, die nie umfällt",
    "Ein magischer Teller, der das Essen warm hält",
    "Ein Set selbst-faltender Servietten",
    "Eine verzauberte Tischdecke, die sich selbst reinigt",
    "Ein magischer Stuhl, der immer bequem ist",
    "Ein Set selbst-dimmender Lichter",
    "Eine verzauberte Fernbedienung, die nie verloren geht",
    "Ein magischer Fernseher, der alle Wünsche erfüllt",
    "Ein Set selbst-ladender Batterien",
    "Eine verzauberte Steckdose, die immer funktioniert",
    "Ein magisches Ladekabel, das nie bricht",
    "Ein Set selbst-aktualisierender Software",
    "Eine verzauberte Maus, die perfekt in der Hand liegt",
    "Ein magischer Drucker, der nie Papierstau hat",
    "Ein Set selbst-schreibender Stifte",
    "Eine verzauberte Tastatur, die fehlerfrei tippt",
    "Ein magischer Bildschirm, der die Augen schont",
    "Ein Set selbst-organisierender Ordner",
    "Eine verzauberte Festplatte mit unendlich viel Speicherplatz",
    "Ein magischer USB-Stick, der nie verloren geht",
    "Ein Set selbst-löschender Spam-Mails",
    "Eine verzauberte Firewall, die alle Viren abwehrt",
    "Ein magisches Antivirenprogramm, das unbesiegbar ist",
    "Ein Set selbst-lernender Algorithmen",
    "Eine verzauberte Suchmaschine, die alle Antworten kennt",
    "Ein magisches soziales Netzwerk, das nur positive Nachrichten anzeigt",
    "Ein Set selbst-erstellender Playlists",
    "Eine verzauberte Musik-App, die den perfekten Song findet",
    "Ein magischer Kopfhörer mit perfektem Klang",
    "Ein Set selbst-synchronisierender Geräte",
    "Eine verzauberte Cloud, die unendlich viel Speicherplatz bietet",
    "Ein magisches Backup, das nie fehlschlägt",
    "Ein Set selbst-reparierender Geräte",
    "Eine verzauberte Garantie, die ewig gilt",
    "Ein magischer Kundenservice, der immer erreichbar ist",
    "Ein Set selbst-lösender Probleme",
    "Eine verzauberte Gebrauchsanweisung, die verständlich ist",
    "Ein magisches Werkzeug, das alles reparieren kann",
    "Ein Set selbst-bohrender Schrauben",
    "Eine verzauberte Leiter, die immer stabil ist",
    "Ein magischer Hammer, der nie daneben schlägt",
    "Ein Set selbst-findender Nägel",
    "Eine verzauberte Säge, die perfekt schneidet",
    "Ein magischer Schraubenzieher, der alle Schrauben passt",
    "Ein Set selbst-haltender Dübel",
    "Eine verzauberte Wasserwaage, die immer gerade ist",
    "Ein magischer Zollstock, der nie bricht",
    "Ein Set selbst-klebender Klebebänder",
    "Eine verzauberte Farbe, die nie tropft",
    "Ein magischer Pinsel, der keine Haare verliert",
    "Ein Set selbst-abdeckender Folien",
    "Eine verzauberte Tapete, die sich selbst anbringt",
    "Ein magischer Teppich, der fliegt (oder auch nicht)",
    "Ein Set selbst-verlegender Fliesen",
    "Eine verzauberte Fugenmasse, die nie schimmelt",
    "Ein magischer Rasenmäher, der von alleine mäht",
    "Ein Set selbst-wässernder Blumen",
    "Eine verzauberte Heckenschere, die perfekt schneidet",
];

const SendMoneyView: React.FC<{
    currentUser: User;
    users: User[];
    onSendMoney: (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => Promise<void>;
}> = ({ currentUser, users, onSendMoney }) => {
    const [receiverIds, setReceiverIds] = useState<string[]>([]);
    const [galleons, setGalleons] = useState('');
    const [sickles, setSickles] = useState('');
    const [knuts, setKnuts] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedHouses, setSelectedHouses] = useState<House[]>([]);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);
    const [notePlaceholder, setNotePlaceholder] = useState('z.B. für Butterbier');

    useEffect(() => {
        const randomPlaceholder = notePlaceholders[Math.floor(Math.random() * notePlaceholders.length)];
        setNotePlaceholder(`z.B. ${randomPlaceholder}`);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const otherUsers = users
        .filter(u => u.id !== currentUser.id && !u.is_deleted)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    const handleReceiverToggle = (userId: string) => {
        setReceiverIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleHouseFilterChange = (house: House) => {
        setSelectedHouses(prev =>
            prev.includes(house)
                ? prev.filter(h => h !== house)
                : [...prev, house]
        );
    };

    const filteredUsers = otherUsers.filter(user => {
        const nameMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase());
        const houseMatch = selectedHouses.length === 0 || selectedHouses.includes(user.house);
        return nameMatch && houseMatch;
    });

    const handleSend = async () => {
        setError('');
        setSuccess('');
        if (receiverIds.length === 0) {
            setError('Bitte wähle mindestens einen Empfänger aus.');
            return;
        }

        const amount = {
            g: parseInt(galleons) || 0,
            s: parseInt(sickles) || 0,
            k: parseInt(knuts) || 0
        };

        const amountPerRecipient = currencyToKnuts({
            galleons: amount.g,
            sickles: amount.s,
            knuts: amount.k,
        });

        if (amountPerRecipient <= 0) {
            setError('Bitte gib einen Betrag größer als 0 an.');
            return;
        }

        const totalAmount = amountPerRecipient * receiverIds.length;
        const canonicalBalance = knutsToCanonical(currentUser.balance);
        if (totalAmount > currentUser.balance) {
             setError(`Du hast nicht genügend Geld. Du benötigst ${totalAmount.toLocaleString('de-DE')} K, hast aber nur ${canonicalBalance.galleons} G, ${canonicalBalance.sickles} S, ${canonicalBalance.knuts} K (${currentUser.balance.toLocaleString('de-DE')} K).`);
            return;
        }
        try {
            await onSendMoney(receiverIds, amount, note.trim());
            const recipientNames = receiverIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
            const amountString = `${amount.g > 0 ? `${amount.g} G, ` : ''}${amount.s > 0 ? `${amount.s} S, ` : ''}${amount.k} K`;
            setSuccess(`Du hast ${amountString} an ${recipientNames.length > 1 ? `${recipientNames.length} Personen` : recipientNames[0]} gesendet.`);
            setReceiverIds([]);
            setGalleons('');
            setSickles('');
            setKnuts('');
            setNote('');
        } catch (e: any) {
            setError(e.message);
        }
    };

    const commonInputStyles = "w-full p-4 bg-[#FFFFFF21] border border-[#FFFFFF59] rounded-2xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow";

    return (
        <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">Geld senden</h2>
            <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 border border-[#FFFFFF59]">
                <div className="space-y-6">
                    <div>
                        <label className="block mb-2 text-sm font-medium opacity-80">An</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Nutzer suchen..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`${commonInputStyles} p-3 h-12 flex-grow`}
                            />
                            <div className="relative" ref={filterMenuRef}>
                                <button
                                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                                    className={`h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-2xl border transition-colors ${selectedHouses.length > 0 ? 'bg-white/10 border-white' : 'bg-[#FFFFFF21] border-[#FFFFFF59] hover:bg-white/10'}`}
                                    aria-label="Nach Haus filtern"
                                >
                                    <FilterIcon className="w-5 h-5" />
                                </button>
                                {showFilterMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#2a2a2a] border border-[#FFFFFF59] rounded-2xl p-2 z-10 animate-fadeIn">
                                        <p className="px-2 py-1 text-xs font-bold uppercase opacity-70">Nach Haus filtern</p>
                                        {Object.values(House).map(house => (
                                            <label key={house} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedHouses.includes(house)}
                                                    onChange={() => handleHouseFilterChange(house)}
                                                    className="w-4 h-4 rounded bg-black/30 border-white/50 text-green-500 focus:ring-green-500/50"
                                                />
                                                <span className={`font-medium ${houseTextColors[house]}`}>{house}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                         <div className="bg-[#FFFFFF21] border border-[#FFFFFF59] rounded-2xl p-2 max-h-48 overflow-y-auto">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(user => (
                                    <label key={user.id} className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors ${receiverIds.includes(user.id) ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                        <input
                                            type="checkbox"
                                            checked={receiverIds.includes(user.id)}
                                            onChange={() => handleReceiverToggle(user.id)}
                                            className="w-5 h-5 rounded-md bg-black/30 border-white/50 text-green-500 focus:ring-green-500/50"
                                        />
                                        <span className="ml-3 font-medium">{user.name}</span>
                                        <span className={`ml-auto text-sm font-semibold ${houseTextColors[user.house]}`}>{user.house}</span>
                                    </label>
                                ))
                            ) : (
                                <p className="p-3 text-center opacity-70">Keine passenden Nutzer gefunden.</p>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block mb-2 text-sm font-medium opacity-80">Betrag (pro Person)</label>
                        <div className="grid grid-cols-3 gap-4">
                             <input type="number" placeholder="Galleonen" value={galleons} onChange={e => setGalleons(e.target.value)} className={commonInputStyles} />
                            <input type="number" placeholder="Sickel" value={sickles} onChange={e => setSickles(e.target.value)} className={commonInputStyles} />
                            <input type="number" placeholder="Knut" value={knuts} onChange={e => setKnuts(e.target.value)} className={commonInputStyles} />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="note" className="block mb-2 text-sm font-medium opacity-80">Notiz (optional)</label>
                        <input
                            type="text"
                            id="note"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className={commonInputStyles}
                            placeholder={notePlaceholder}
                            maxLength={100}
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    {success && <p className="text-green-400 text-sm text-center">{success}</p>}
                    <button onClick={handleSend} className="w-full text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base h-[3.75rem] transition-colors">
                        Senden
                    </button>
                </div>
            </div>
        </div>
    );
};

const HistoryView: React.FC<{ transactions: Transaction[], currentUserId: string }> = ({ transactions, currentUserId }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'sent' | 'received' | 'admin'>('all');

    const filteredTransactions = transactions.filter(tx => {
        const isAdminChange = tx.note?.startsWith('ADMIN_BALANCE_CHANGE::');
        const isSent = tx.sender_id === currentUserId && !isAdminChange;
        const isReceived = tx.receiver_id === currentUserId && !isAdminChange;

        if (filter === 'sent' && !isSent) return false;
        if (filter === 'received' && !isReceived) return false;
        if (filter === 'admin' && !isAdminChange) return false;

        if (searchTerm.trim() === '') return true;

        const lowerCaseSearch = searchTerm.toLowerCase();
        const senderName = tx.sender?.name?.toLowerCase() || '';
        const receiverName = tx.receiver?.name?.toLowerCase() || '';
        
        let note = tx.note || '';
        if (note.includes('|~|')) {
            note = note.split('|~|')[0];
        }
        note = note.toLowerCase();
        
        const otherPartyName = isSent ? receiverName : senderName;

        if (isAdminChange) {
            return otherPartyName.includes(lowerCaseSearch);
        }

        return (
            otherPartyName.includes(lowerCaseSearch) ||
            note.includes(lowerCaseSearch)
        );
    });

    if (transactions.length === 0) {
        return <div className="text-center opacity-70">Keine Transaktionen gefunden.</div>;
    }

    const FilterButton: React.FC<{ value: typeof filter, label: string }> = ({ value, label }) => (
        <button
            onClick={() => setFilter(value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${filter === value ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}
        >
            {label}
        </button>
    );

    const AmountDisplay: React.FC<{ tx: Transaction }> = ({ tx }) => {
        let sentAs: { g: number; s: number; k: number } | null = null;
        if (tx.note?.includes('|~|')) {
            const parts = tx.note.split('|~|');
            if (parts.length === 2) {
                try {
                    const parsed = JSON.parse(parts[1]);
                    if (typeof parsed.g === 'number' && typeof parsed.s === 'number' && typeof parsed.k === 'number') {
                        sentAs = parsed;
                    }
                } catch (e) { /* ignore */ }
            }
        }

        if (sentAs) {
            return (
                <>
                    {`${sentAs.g.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">G</span>
                    {`, ${sentAs.s.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">S</span>
                    {`, ${sentAs.k.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">K</span>
                </>
            );
        }

        const canonical = knutsToCanonical(tx.amount);
        return (
            <>
                {`${canonical.galleons.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">G</span>
                {`, ${canonical.sickles.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">S</span>
                {`, ${canonical.knuts.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">K</span>
            </>
        );
    };


    return (
        <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">Transaktionsverlauf</h2>
            
            <div className="bg-[#FFFFFF21] rounded-3xl p-4 sm:p-6 border border-[#FFFFFF59] space-y-4">
                <input
                    type="text"
                    placeholder="Nach Name oder Notiz suchen..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-black/20 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow text-base"
                />
                <div className="flex flex-wrap gap-2">
                    <FilterButton value="all" label="Alle" />
                    <FilterButton value="sent" label="Gesendet" />
                    <FilterButton value="received" label="Erhalten" />
                    <FilterButton value="admin" label="Admin-Änderungen" />
                </div>
            </div>

            <div className="space-y-4">
                {filteredTransactions.length > 0 ? (
                    filteredTransactions.map(tx => {
                        const isAdminChange = tx.note?.startsWith('ADMIN_BALANCE_CHANGE::');

                        if (isAdminChange) {
                            const parts = tx.note.split('::');
                            const adminName = tx.sender?.name || 'Der King';

                            if (parts.length >= 5) {
                                const oldBalanceInKnuts = parseInt(parts[3], 10);
                                const newBalanceInKnuts = parseInt(parts[4], 10);
                                const changeAmount = newBalanceInKnuts - oldBalanceInKnuts;

                                return (
                                    <div key={tx.id} className="bg-yellow-500/10 rounded-3xl p-4 sm:p-6 border border-yellow-500/50">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-yellow-300">Administrative Korrektur</p>
                                                <p className="text-sm opacity-70">{new Date(tx.created_at).toLocaleString('de-DE')}</p>
                                            </div>
                                            <p className={`font-bold text-lg ${changeAmount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {changeAmount >= 0 ? '+' : ''} {Math.abs(changeAmount).toLocaleString('de-DE')} K
                                            </p>
                                        </div>
                                        <p className="text-sm opacity-90 mt-2 pt-2 border-t border-white/10">
                                            {adminName} hat deinen Kontostand angepasst.
                                        </p>
                                    </div>
                                );
                            } else {
                                // Fallback for old admin change format
                                const newBalanceInKnuts = parseInt(parts[2], 10);
                                return (
                                    <div key={tx.id} className="bg-yellow-500/10 rounded-3xl p-4 sm:p-6 border border-yellow-500/50">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-yellow-300">Administrative Änderung</p>
                                                <p className="text-sm opacity-70">{new Date(tx.created_at).toLocaleString('de-DE')}</p>
                                            </div>
                                            <UserEditIcon className="w-6 h-6 text-yellow-300" />
                                        </div>
                                        <p className="text-sm opacity-90 mt-2 pt-2 border-t border-white/10">
                                            {adminName} hat den Kontostand von dir geändert. Dein neuer Kontostand beträgt jetzt: <strong className="font-bold">{newBalanceInKnuts.toLocaleString('de-DE')} K</strong>.
                                        </p>
                                    </div>
                                );
                            }
                        }
                        
                        const isSent = tx.sender_id === currentUserId;
                        const otherParty = isSent ? tx.receiver : tx.sender;
                        const houseColorClass = otherParty ? houseTextColors[otherParty.house] : 'opacity-70';
                        
                        let userNote = tx.note || '';
                        if (userNote.includes('|~|')) {
                            userNote = userNote.split('|~|')[0];
                        }

                        return (
                            <div key={tx.id} className="bg-[#FFFFFF21] rounded-3xl p-4 sm:p-6 border border-[#FFFFFF59]">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-bold">
                                            {isSent ? 'An ' : 'Von '}
                                            <span className={houseColorClass}>{otherParty?.name || 'Unbekannt'}</span>
                                        </p>
                                        <p className="text-sm opacity-70">{new Date(tx.created_at).toLocaleString('de-DE')}</p>
                                    </div>
                                    <p className={`font-bold text-lg ${isSent ? 'text-red-400' : 'text-green-400'}`}>
                                        {isSent ? '-' : '+'} <AmountDisplay tx={tx} />
                                    </p>
                                </div>
                                {userNote && (
                                    <p className="text-sm opacity-80 mt-2 pt-2 border-t border-white/10">
                                        {userNote}
                                    </p>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center opacity-70 bg-[#FFFFFF21] rounded-3xl p-8 border border-[#FFFFFF59]">
                        <p className="font-bold text-lg">Keine passenden Transaktionen gefunden.</p>
                        <p className="text-sm">Versuche, deine Suche oder Filter anzupassen.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AdminView: React.FC<{
    users: User[];
    transactions: Transaction[];
    onUpdateUser: DashboardProps['onUpdateUser'];
    onSoftDeleteUser: DashboardProps['onSoftDeleteUser'];
    onRestoreUser: DashboardProps['onRestoreUser'];
    currentUser: User;
    isKing: boolean;
}> = ({ users, transactions, onUpdateUser, onSoftDeleteUser, onRestoreUser, currentUser, isKing }) => {
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [transactionSearchTerm, setTransactionSearchTerm] = useState('');
    const [transactionFilter, setTransactionFilter] = useState<'all' | 'transfer' | 'admin'>('all');

    const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));
    const visibleUsers = sortedUsers
        .filter(u => showDeleted || !u.is_deleted)
        .filter(u => u.name.toLowerCase().includes(userSearchTerm.toLowerCase()));

    const filteredTransactions = transactions.filter(tx => {
        const isAdminChange = tx.note?.startsWith('ADMIN_BALANCE_CHANGE::');
        
        if (transactionFilter === 'transfer' && isAdminChange) return false;
        if (transactionFilter === 'admin' && !isAdminChange) return false;
        
        if (transactionSearchTerm.trim() === '') return true;

        const lowerCaseSearch = transactionSearchTerm.toLowerCase();
        const senderName = tx.sender?.name?.toLowerCase() || '';
        const receiverName = tx.receiver?.name?.toLowerCase() || '';
        
        let note = tx.note || '';
        if (note.includes('|~|')) {
            note = note.split('|~|')[0];
        }
        note = !isAdminChange ? (note.toLowerCase() || '') : '';
        
        return (
            senderName.includes(lowerCaseSearch) ||
            receiverName.includes(lowerCaseSearch) ||
            note.includes(lowerCaseSearch)
        );
    });

    const TransactionFilterButton: React.FC<{ value: typeof transactionFilter, label: string }> = ({ value, label }) => (
        <button
            onClick={() => setTransactionFilter(value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${transactionFilter === value ? 'bg-white text-black' : 'bg-black/30 hover:bg-black/50'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6">
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={onUpdateUser}
                    onDelete={onSoftDeleteUser}
                    isEditingSelf={editingUser.id === currentUser.id}
                    isKing={isKing}
                />
            )}
            <h2 className="text-3xl sm:text-4xl font-bold">Admin Panel</h2>
            <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 border border-[#FFFFFF59]">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">Nutzer verwalten</h3>
                    <label className="flex items-center cursor-pointer">
                        <span className="mr-2 text-sm">Gelöschte anzeigen</span>
                        <div className="relative">
                            <input type="checkbox" checked={showDeleted} onChange={() => setShowDeleted(!showDeleted)} className="sr-only" />
                            <div className={`block w-10 h-6 rounded-full ${showDeleted ? 'bg-white' : 'bg-black/30'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-black/50 w-4 h-4 rounded-full transition-transform ${showDeleted ? 'transform translate-x-full bg-green-500' : ''}`}></div>
                        </div>
                    </label>
                </div>
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="Nutzer suchen..."
                        value={userSearchTerm}
                        onChange={e => setUserSearchTerm(e.target.value)}
                        className="w-full p-3 bg-black/20 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow text-base"
                    />
                </div>
                <div className="space-y-3">
                    {visibleUsers.length > 0 ? (
                        visibleUsers.map(user => (
                            <div key={user.id} className={`flex items-center justify-between p-3 rounded-2xl ${user.is_deleted ? 'bg-red-500/10' : 'bg-black/20'}`}>
                                <div>
                                    <p className="font-semibold">{user.name} {user.id === currentUser.id && '(Du)'}</p>
                                    <p className="text-sm opacity-70">
                                        {user.balance.toLocaleString('de-DE')} K - <span className={`font-semibold ${houseTextColors[user.house]}`}>{user.house}</span>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                   {user.is_deleted ? (
                                        <button onClick={() => onRestoreUser(user.id)} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Nutzer wiederherstellen">
                                            <RestoreIcon />
                                        </button>
                                   ) : (
                                    <>
                                        <button onClick={() => setEditingUser(user)} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Nutzer bearbeiten">
                                            <UserEditIcon className="w-5 h-5" />
                                        </button>
                                         {user.id !== currentUser.id && (
                                            <button onClick={() => onSoftDeleteUser(user.id)} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Nutzer löschen">
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                         )}
                                    </>
                                   )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-center opacity-70 p-4">Keine passenden Nutzer gefunden.</p>
                    )}
                </div>
            </div>
            
             <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 border border-[#FFFFFF59]">
                <h3 className="text-2xl font-bold mb-4">Alle Transaktionen</h3>
                <div className="space-y-3 mb-4">
                    <input
                        type="text"
                        placeholder="Transaktionen nach Name oder Notiz suchen..."
                        value={transactionSearchTerm}
                        onChange={e => setTransactionSearchTerm(e.target.value)}
                        className="w-full p-3 bg-black/20 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow text-base"
                    />
                    <div className="flex flex-wrap gap-2">
                        <TransactionFilterButton value="all" label="Alle" />
                        <TransactionFilterButton value="transfer" label="Überweisungen" />
                        <TransactionFilterButton value="admin" label="Admin-Änderungen" />
                    </div>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {filteredTransactions.length > 0 ? filteredTransactions.map(tx => {
                        const isAdminChange = tx.note?.startsWith('ADMIN_BALANCE_CHANGE::');

                        if (isAdminChange) {
                            const parts = tx.note.split('::');
                            const adminName = tx.sender?.name || 'Unbekannt';
                            const targetUserName = tx.receiver?.name || 'Unbekannt';

                            // New format: ADMIN_BALANCE_CHANGE::king_id::user_id::old_balance::new_balance
                            if (parts.length >= 5) {
                                const oldBalanceInKnuts = parseInt(parts[3], 10);
                                const newBalanceInKnuts = parseInt(parts[4], 10);
                                const changeAmount = newBalanceInKnuts - oldBalanceInKnuts;
                                const canonicalOld = knutsToCanonical(oldBalanceInKnuts);
                                const canonicalNew = knutsToCanonical(newBalanceInKnuts);
                                return (
                                    <div key={tx.id} className="bg-yellow-500/10 p-3 rounded-xl text-sm border border-yellow-500/20 space-y-1">
                                        <p>
                                            <strong className={tx.sender ? houseTextColors[tx.sender.house] : ''}>{adminName}</strong>
                                            {' änderte Kontostand von '}
                                            <strong className={tx.receiver ? houseTextColors[tx.receiver.house] : ''}>{targetUserName}</strong>.
                                        </p>
                                        <div className="flex justify-between items-center text-xs opacity-80">
                                            <span>Alter Stand:</span>
                                            <span>{`${canonicalOld.galleons} G, ${canonicalOld.sickles} S, ${canonicalOld.knuts} K`}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span>Neuer Stand:</span>
                                            <span className="font-bold">{`${canonicalNew.galleons} G, ${canonicalNew.sickles} S, ${canonicalNew.knuts} K`}</span>
                                        </div>
                                        <div className="flex justify-between items-center font-semibold pt-1 mt-1 border-t border-yellow-500/20">
                                            <span>Änderung:</span>
                                            <span className={changeAmount >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                {changeAmount >= 0 ? '+' : ''}{Math.abs(changeAmount).toLocaleString('de-DE')} K
                                            </span>
                                        </div>
                                        <p className="opacity-60 text-xs text-right">{new Date(tx.created_at).toLocaleString()}</p>
                                    </div>
                                );
                            } else {
                                // Fallback for old format
                                const newBalanceInKnuts = parseInt(parts[2], 10);
                                const canonicalNew = knutsToCanonical(newBalanceInKnuts);

                                return (
                                    <div key={tx.id} className="bg-yellow-500/10 p-3 rounded-xl text-sm border border-yellow-500/20 space-y-1">
                                        <p>
                                            <strong className={tx.sender ? houseTextColors[tx.sender.house] : ''}>{adminName}</strong>
                                            {' änderte Kontostand von '}
                                            <strong className={tx.receiver ? houseTextColors[tx.receiver.house] : ''}>{targetUserName}</strong>.
                                        </p>
                                        <div className="flex justify-between items-center">
                                            <span>Neuer Stand:</span>
                                            <span className="font-bold">{`${canonicalNew.galleons} G, ${canonicalNew.sickles} S, ${canonicalNew.knuts} K`}</span>
                                        </div>
                                        <p className="text-xs opacity-70 text-center pt-1">(Ältere Transaktion, alter Kontostand nicht verfügbar)</p>
                                        <p className="opacity-60 text-xs text-right pt-1">{new Date(tx.created_at).toLocaleString()}</p>
                                    </div>
                                );
                            }
                        }
                        
                        let userNote = tx.note || '';
                        if (userNote.includes('|~|')) {
                            userNote = userNote.split('|~|')[0];
                        }
                        
                        const canonicalAmount = knutsToCanonical(tx.amount);

                        return (
                            <div key={tx.id} className="bg-black/20 p-3 rounded-xl text-sm">
                                <p>
                                    <strong className={tx.sender ? houseTextColors[tx.sender.house] : ''}>{tx.sender?.name || 'Unbekannt'}</strong>
                                    {' -> '}
                                    <strong className={tx.receiver ? houseTextColors[tx.receiver.house] : ''}>{tx.receiver?.name || 'Unbekannt'}</strong>
                                    : {`${canonicalAmount.galleons} G, ${canonicalAmount.sickles} S, ${canonicalAmount.knuts} K`}
                                </p>
                                <p className="opacity-60 text-xs mt-1">{new Date(tx.created_at).toLocaleString()}</p>
                                {userNote && (
                                    <p className="text-sm opacity-80 mt-1 pt-1 border-t border-white/10">
                                        {userNote}
                                    </p>
                                )}
                            </div>
                        );
                    }) : <p className="opacity-70 text-center p-4">Keine passenden Transaktionen gefunden.</p>}
                </div>
            </div>
        </div>
    );
};


const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-24 h-16 rounded-2xl transition-all duration-300 ${
      isActive ? 'bg-white/10' : 'hover:bg-white/5'
    }`}
    aria-selected={isActive}
  >
    <div className={`transition-transform duration-300 ${isActive ? 'transform -translate-y-1' : ''}`}>
        {icon}
    </div>
    <span className={`text-xs mt-1 ${isActive ? 'font-bold' : ''}`}>
      {label}
    </span>
  </button>
);

const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  users,
  transactions,
  onSendMoney,
  isKing,
  globalTransactions,
  onUpdateUser,
  onSoftDeleteUser,
  onRestoreUser
}) => {
  const [currentView, setCurrentView] = useState<'send' | 'history' | 'admin'>('send');
  const [displayBalance, setDisplayBalance] = useState<Currency>(() => knutsToCanonical(currentUser.balance));
  const prevTransactionsRef = useRef(transactions);
  const prevBalanceRef = useRef(currentUser.balance);

  useEffect(() => {
    const oldTxIds = new Set(prevTransactionsRef.current.map(t => t.id));
    const newTransactions = transactions.filter(tx => !oldTxIds.has(tx.id));
    const newIncomingTx = newTransactions.find(tx => tx.receiver_id === currentUser.id);

    if (newIncomingTx && newIncomingTx.note?.includes('|~|')) {
        const parts = newIncomingTx.note.split('|~|');
        if (parts.length === 2) {
            try {
                const sentAs = JSON.parse(parts[1]);
                if (typeof sentAs.g === 'number' && typeof sentAs.s === 'number' && typeof sentAs.k === 'number') {
                    setDisplayBalance(prev => ({
                        galleons: prev.galleons + sentAs.g,
                        sickles: prev.sickles + sentAs.s,
                        knuts: prev.knuts + sentAs.k,
                    }));
                }
            } catch (e) {
                 setDisplayBalance(knutsToCanonical(currentUser.balance));
            }
        }
    } else if (currentUser.balance !== prevBalanceRef.current) {
        // Resync if balance changed for other reasons (e.g., sending money)
        setDisplayBalance(knutsToCanonical(currentUser.balance));
    }

    prevTransactionsRef.current = transactions;
    prevBalanceRef.current = currentUser.balance;
  }, [transactions, currentUser.balance, currentUser.id]);

  useEffect(() => {
    // Reset display balance if user logs out and a new user logs in
    setDisplayBalance(knutsToCanonical(currentUser.balance));
  }, [currentUser.id]);


  const needsConversion = displayBalance.sickles >= 17 || displayBalance.knuts >= 29;

  const handleConvert = () => {
    setDisplayBalance(knutsToCanonical(currentUser.balance));
  };

  return (
    <div className="pt-28 pb-28 md:pt-32 md:pb-32 animate-fadeIn">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
            <div className="relative inline-block group">
                <p className="text-xl opacity-80">Dein Kontostand</p>
                <div className="flex items-center justify-center gap-2 sm:gap-4">
                    <p className="text-4xl sm:text-5xl font-bold tracking-tighter">
                        {displayBalance.galleons.toLocaleString('de-DE')} <span className="text-3xl opacity-70">G</span>, {displayBalance.sickles} <span className="text-3xl opacity-70">S</span>, {displayBalance.knuts} <span className="text-3xl opacity-70">K</span>
                    </p>
                    {needsConversion && (
                        <button onClick={handleConvert} className="bg-white text-black rounded-full px-4 py-1 text-sm font-bold transition-transform hover:scale-105 active:scale-95">
                            Umwandeln
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="max-w-2xl mx-auto">
            {currentView === 'send' && (
                <SendMoneyView
                    currentUser={currentUser}
                    users={users}
                    onSendMoney={onSendMoney}
                />
            )}
            {currentView === 'history' && <HistoryView transactions={transactions} currentUserId={currentUser.id} />}
            {currentView === 'admin' && isKing && globalTransactions && (
                <AdminView
                    users={users}
                    transactions={globalTransactions}
                    onUpdateUser={onUpdateUser}
                    onSoftDeleteUser={onSoftDeleteUser}
                    onRestoreUser={onRestoreUser}
                    currentUser={currentUser}
                    isKing={isKing}
                />
            )}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#1e1e1e] border-t border-[#FFFFFF59] p-2">
        <div className="container mx-auto flex justify-around">
          <NavButton
            label="Senden"
            icon={<SendIcon />}
            isActive={currentView === 'send'}
            onClick={() => setCurrentView('send')}
          />
          <NavButton
            label="Verlauf"
            icon={<HistoryIcon />}
            isActive={currentView === 'history'}
            onClick={() => setCurrentView('history')}
          />
          {isKing && (
            <NavButton
              label="Admin"
              icon={<CrownIcon />}
              isActive={currentView === 'admin'}
              onClick={() => setCurrentView('admin')}
            />
          )}
        </div>
      </nav>
    </div>
  );
};

export default Dashboard;
