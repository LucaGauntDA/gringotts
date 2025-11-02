import React, { useState, useEffect, useRef } from 'react';
import type { User, Transaction, Currency, MoneyRequest } from '../types';
import { House } from '../types';
import { SendIcon, HistoryIcon, AdminIcon, UsersIcon, TrashIcon, RestoreIcon, UserEditIcon, UserIcon, FilterIcon, BanknotesIcon, CheckIcon, XIcon } from './icons';
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
  moneyRequests: MoneyRequest[];
  onSendMoney: (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => Promise<void>;
  isKing?: boolean;
  globalTransactions?: Transaction[];
  onUpdateUser: (userId: string, updates: { name: string; house: House; balance: number }) => Promise<void>;
  onSoftDeleteUser: (userId: string) => Promise<void>;
  onRestoreUser: (userId: string) => Promise<void>;
  onCreateRequest: (requesteeIds: string[], amount: { g: number; s: number; k: number }, note?: string) => Promise<void>;
  onAcceptRequest: (request: MoneyRequest) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onUpdateProfile: (updates: { name?: string; house?: House; }) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<void>;
}

const UserEditModal: React.FC<{
  user: User;
  onClose: () => void;
  onSave: (userId: string, updates: { name: string; house: House; balance: number }) => Promise<void>;
  onDelete: (userId: string) => Promise<void>;
  currentUser: User;
}> = ({ user, onClose, onSave, onDelete, currentUser }) => {
  const [name, setName] = useState(user.name);
  const [house, setHouse] = useState(user.house);
  const [galleons, setGalleons] = useState('');
  const [sickles, setSickles] = useState('');
  const [knuts, setKnuts] = useState('');
  const [error, setError] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const ORIGINAL_KING_EMAIL = 'luca.lombino@icloud.com';
  const KINGSLEY_EMAIL = 'da-hauspokal-orga@outlook.com';
  const TEST_LUSA_EMAIL = 'lucagauntda7@gmail.com';

  const isCurrentUserOriginalKing = currentUser.email === ORIGINAL_KING_EMAIL;
  const isCurrentUserKingsley = currentUser.email === KINGSLEY_EMAIL;
  
  const isEditingOriginalKing = user.email === ORIGINAL_KING_EMAIL;
  const isEditingTestLusa = user.email === TEST_LUSA_EMAIL;
  const isEditingSelf = user.id === currentUser.id;

  const canEdit = isCurrentUserOriginalKing || (isCurrentUserKingsley && !isEditingSelf && !isEditingOriginalKing && !isEditingTestLusa);
  const canDelete = !isEditingSelf && !(isCurrentUserKingsley && (isEditingOriginalKing || isEditingTestLusa));
  const showCannotEditMessage = isEditingSelf && !isCurrentUserOriginalKing;


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
    // The Kings can set a negative balance for anyone.
    if (balance < 0 && !isCurrentUserOriginalKing && !isCurrentUserKingsley) {
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
                             {canDelete && <button onClick={() => setShowConfirmDelete(true)} className="w-full sm:w-auto flex-1 text-white bg-red-600/80 hover:bg-red-600 font-bold rounded-full h-12 transition-colors order-2 sm:order-1">Löschen</button>}
                            <button onClick={handleSave} className="w-full sm:w-auto flex-1 text-black bg-white hover:bg-gray-200 font-bold rounded-full h-12 transition-colors order-1 sm:order-2" disabled={!canEdit}>Speichern</button>
                        </div>
                        {showCannotEditMessage && <p className="text-xs text-center opacity-60 pt-2">Du kannst dein eigenes Profil nicht bearbeiten. Bitte Lusa-Luca um Hilfe.</p>}
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
    "Ein Set selbst-erneuerender Flugtickets",
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
    "Ein magischer Spiegel, die die Zukunft zeigt (vielleicht)",
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
    "Beitrag für die 'Wer kann am längsten als Teekanne sitzen bleiben'-Wette",
    "Anzahlung für einen unsichtbaren Goldfisch",
    "Gebühr für professionelles Spuken (Stufe 3 Geist)",
    "Rückerstattung für den Schrumpftrank, der meine Katze riesig gemacht hat",
    "Dein Anteil am 'Wir tun so, als wären wir Statuen im Park'-Geschäft",
    "Geld für das Patent eines selbstrührenden Kessels, der Witze erzählt",
    "Bestechungsgeld für den Hauself, damit er nicht verrät, wer die Kekse gegessen hat",
    "Miete für das Baumhaus (inklusive Eichhörnchen-Concierge)",
    "Eine Runde 'Find den Niffler' im Gemeinschaftsraum",
    "Lizenzgebühr für die Nutzung meines patentierten Fluchworts",
    "Kosten für die psychologische Betreuung meines verfluchten Gartenzwergs",
    "Sponsoring für das professionelle Gobstone-Team 'Die rollenden Steine'",
    "Abo für 'Zauberer-Woche', die Klatsch- und Tratschzeitschrift",
    "Rückzahlung für das Buch 'Wie man Freunde gewinnt und Leute verhext'",
    "Ein Pfund Drachenschuppenpolitur",
    "Beitrag zum Kauf eines gebrauchten fliegenden Teppichs (hat ein paar Löcher)",
    "Kursgebühr für 'Verteidigung gegen dunkle Künste... und nervige Nachbarn'",
    "Ein Dutzend selbstschreibender Federn, die nur Komplimente schreiben",
    "Reparatur des Zeitumkehrers, der in der Waschmaschine war",
    "Ein Fass Met für die nächste Hauselfen-Gewerkschaftssitzung",
    "Bußgeld für illegales Apparieren in einer Muggel-Telefonzelle",
    "Ein Set magischer Socken, die immer paarweise bleiben",
    "Kosten für die Entfluchung meines Toasters (er spuckt jetzt nur noch Waffeln)",
    "Ein Ticket für das Konzert der 'Schwestern des Schicksals' (Backstage-Pässe!)",
    "Anzahlung für eine maßgeschneiderte Heulende Hütte (weniger Heulen, mehr WLAN)",
    "Ein Glas eingelegte Schrumpfköpfe (rein dekorativ, versprochen)",
    "Futter für meinen Hippogreif (er mag nur Sushi)",
    "Ein Set 'Erweiterbare Ohren', um die Nachbarn zu belauschen",
    "Rückzahlung für die Wette, dass Lockhart einen ganzen Satz ohne 'Ich' sagen kann",
    "Ein magisches Erste-Hilfe-Set für explodierende Snap-Unfälle",
    "Gebühr für die Mitgliedschaft im 'Club der anonymen Werwölfe'",
    "Ein Päckchen 'Nasch-und-Schwänz-Leckereien' für den nächsten Montag",
    "Versicherung für meinen Besen (gegen Drachen und Blitze)",
    "Ein verzauberter Kompass, der immer zum nächsten Pub zeigt",
    "Geld für einen Sprachkurs in Mermish (Wassersprachen)",
    "Ein verfluchtes Schachspiel, bei dem die Figuren beleidigend werden",
    "Kosten für die Beseitigung eines portablen Sumpfes aus meinem Schlafzimmer",
    "Ein Set selbst-nachfüllender Tintenfässer (Geschmacksrichtung: Himbeere)",
    "Bestellung bei 'Weasleys Zauberhafte Zauberscherze' - die große Box",
    "Ein persönlicher Wetterzauber (Sonnenschein über meinem Schreibtisch)",
    "Anzahlung für einen Phönix (Warteliste: 300 Jahre)",
    "Ein Kurs in 'Kreatives Fluchen für Anfänger'",
    "Ein Dutzend Schokofrösche (nur die seltenen Karten, bitte)",
    "Bußgeld für das Parken meines Besens im Halteverbot",
    "Ein selbst-bügelndes Hemd für das nächste Ministeriums-Meeting",
    "Rückerstattung für den Liebestrank, der auf die Katze gewirkt hat",
    "Ein Set magischer Würfel, die immer eine 6 würfeln (nicht schummeln!)",
    "Ein Glas Einhornschweiß (für glänzendes Haar, sagt man)",
    "Beitrag für die 'Rettet die Hauselfen'-Stiftung (S.P.E.W.)",
    "Ein verzaubertes Notizbuch, das meine Gedanken stiehlt und Bestseller schreibt",
    "Gebühr für die Reinigung meines Umhangs nach einem Tintenfisch-Angriff im See",
    "Miete für den Besenschrank unter der Treppe",
    "Kosten für die Entlausung meines Basilisken",
    "Ein Abo für 'Der Tagesprophet', aber nur die Comics",
    "Rückzahlung für die Wette, dass ich einen ganzen Kürbissaft-Krug exen kann",
    "Ein neues Gehirn für den Irrwicht im Schrank",
    "Beitrag zur Party-Kasse des Gemeinschaftsraums",
    "Ein Päckchen Bertie Botts Bohnen (bitte keine Ohrenschmalz-Geschmack)",
    "Geld für die Reparatur des kaputten Verschwindekabinetts",
    "Ein Ticket für den Fahrenden Ritter (inklusive Reisekrankheits-Trank)",
    "Bestechung für den Ghul auf dem Dachboden, damit er leiser ist",
    "Ein neuer Satz Gobstones (die alten spucken nicht mehr)",
    "Kursgebühr für 'Wie man einen Drachen erzieht (oder es zumindest überlebt)'",
    "Ein magischer Türsteher für mein Zimmer (Passwort: 'Fidelius')",
    "Futter für meine fleischfressende Pflanze (sie mag Steak)",
    "Ein Set selbst-schreibender Notizen, die sich an alles erinnern",
    "Bußgeld für das Züchten von Tentacula ohne Lizenz",
    "Ein verzauberter Wecker, der einen mit Komplimenten weckt",
    "Ein Glas Drachen-Chili-Soße (extra scharf)",
    "Rückzahlung für den Scherz mit dem Stinksaft in der Großen Halle",
    "Ein magischer Stift, der Hausaufgaben in perfekter Handschrift schreibt",
    "Gebühr für die Mitgliedschaft im Duellierclub (inkl. Pflaster)",
    "Ein Päckchen Zischende Wissbies, um Snape abzulenken",
    "Versicherung gegen Irrwichte, Poltergeister und Peeves",
    "Ein verzauberter Regenschirm, der einen vor Regen und Flüchen schützt",
    "Geld für einen Ausflug nach Hogsmeade (mit extra Butterbier)",
    "Ein verfluchtes Buch, das zurückbeißt (schon wieder)",
    "Kosten für die Beseitigung von Feen aus meinem Garten",
    "Ein Set unsichtbarer Tinte (und der Enthüllungszauber)",
    "Bestellung bei 'Flourish & Blotts' - die schwere Abteilung",
    "Ein persönlicher Hauself für einen Tag (er putzt auch hinter den Ohren)",
    "Anzahlung für eine Harpyie (als Wachvogel)",
    "Ein Kurs in 'Magische Selbstverteidigung gegen aufdringliche Verkäufer'",
    "Ein Dutzend singender Valentinskarten für Filch",
    "Bußgeld für das Verwandeln meines Mitschülers in einen Frettchen",
    "Ein selbst-faltender Papierflieger, der Nachrichten überbringt",
    "Rückerstattung für den 'Glückstrank', der nur Pech gebracht hat",
    "Ein Set magischer Murmeln, die den Weg nach Hause finden",
    "Ein Glas Basiliskengift (für die Unkrautvernichtung)",
    "Beitrag für die 'Rettet die bedrohten magischen Geschöpfe'-Stiftung",
    "Ein verzaubertes Kissen, das einem süße Träume garantiert",
    "Gebühr für die Reinigung des Gemeinschaftsraum-Kamins (zu viel Flohpulver)",
    "Dein Anteil an der 'Kauf Dumbledore einen neuen Hut'-Sammlung",
    "Für die gestrige Runde 'Exploding Snap'",
    "Ein Pfund Drachenleber für den Zaubertrankunterricht",
    "Der Versuch, die Hauspunkte zurückzukaufen",
    "Bestechung der fetten Dame, damit sie uns nach der Sperrstunde reinlässt",
    "Wetteinsatz: Hufflepuff gewinnt den Hauspokal (man darf ja träumen)",
    "Neue Saiten für die Harfe im Mädchenschlafsaal",
    "Rückerstattung für den misslungenen Verwandlungszauber",
    "Ein Set Würg Riegel für die nächste langweilige Unterrichtsstunde",
    "Notfall-Schokofrosch-Lieferung für die Bibliothek",
    "Finanzierung unseres geheimen 'Mitternachts-Snack'-Clubs",
    "Eine Flasche Schrumpflösung, nur für den Fall",
    "Kaution, um Peeves aus der Ritterrüstung zu befreien",
    "Dein Beitrag für das nächste große Feuerwerk von den Weasley-Zwillingen",
    "Ein neues Exemplar von 'Monsterbuch der Monster', das alte hat meinen Finger gegessen",
    "Geld für die Reinigung der Eulerei (schon wieder)",
    "Ein Päckchen Gummischnecken, um Malfoy abzulenken",
    "Nachhilfe in Wahrsagen (bitte keine Todesomen mehr)",
    "Ein selbst-korrigierender Aufsatz für Professor Binns",
    "Die Gebühr für die Apparier-Prüfung (diesmal bestehe ich!)",
    "Eine Runde Butterbier für das gesamte Quidditch-Team",
    "Ein neuer Satz Phiolen, weil Snape meine zerbrochen hat",
    "Ein verzauberter Kompass, der zur Küche von Hogwarts führt",
    "Ein Päckchen 'Fever Fudge', um dem Unterricht zu entgehen",
    "Ein Ticket für den Hogwarts-Express (Sitzplatz am Fenster)",
    "Beitrag für die Dekoration der Großen Halle zu Halloween",
    "Ein neues Set Zauberer-Schachfiguren (die alten sind zu streitlustig)",
    "Ein seltener Alraunen-Setzling für Professor Sprout",
    "Die Reparatur des Besens nach dem Zusammenstoß mit der Peitschenden Weide",
    "Ein Abo für den 'Klitterer', um auf dem Laufenden zu bleiben",
    "Bestechung für einen Hauself für das Passwort zur Küche",
    "Ein neuer Satz Quidditch-Bälle (die Klatscher sind entkommen)",
    "Ein Exemplar von 'Hogwarts, eine Geschichte' (als Einschlafhilfe)",
    "Eine Spende an den Orden des Phönix (pssst!)",
    "Ein neues Paar Drachenleder-Handschuhe für den Kräuterkundeunterricht",
    "Die Kosten für die Entfernung eines Flederwicht-Fluchs",
    "Ein Geschenk für Hagrids neuesten 'harmlosen' Tierfreund",
    "Ein Päckchen Lakritz-Zauberstäbe als Nervennahrung",
    "Der Wetteinsatz, dass Gryffindor das nächste Spiel gewinnt",
    "Ein neuer Umhang (der alte hat einen Trankfleck)",
    "Ein Beitrag für die nächste Sitzung von Dumbledores Armee",
    "Eine Flasche Tinte und eine Rolle Pergament",
    "Ein neues Vorhängeschloss für mein Tagebuch (gegen neugierige Geschwister)",
    "Die Kaution für die Weasley-Zwillinge",
    "Ein Set selbst-schreibender Federn für die ZAG-Vorbereitung",
    "Eine Kiste Kürbispasteten für die ganze Abteilung",
    "Ein Beruhigungstrank für die nächste Begegnung mit dem Minister",
    "Die Reparatur des kaputten Interministeriellen Memos",
    "Ein neues Set Roben für die nächste Gerichtsverhandlung im Zaubergamot",
    "Bestechung für einen besseren Schreibtisch in der Mysteriumsabteilung",
    "Ein Beitrag zur Kaffeekasse der Aurorenzentrale",
    "Ein Päckchen 'U-No-Poo' für Dolores Umbridge",
    "Die Gebühr für die Reinigung der Abteilung für magische Unfälle und Katastrophen",
    "Ein neues Gehirn für die Gehirne in der Halle der Prophezeiungen",
    "Ein Ticket für die nächste Sitzung des Zaubergamots (mit Popcorn)",
    "Ein neues Namensschild für meine Bürotür (diesmal richtig geschrieben)",
    "Ein verzauberter Aktenordner, der sich selbst sortiert",
    "Die Kosten für die Beseitigung eines misslungenen Experiments aus dem Ministerium",
    "Ein Exemplar von 'Die Rechte der magischen Geschöpfe' für die Abteilung zur Führung und Aufsicht Magischer Geschöpfe",
    "Ein neuer Satz Gesetze und Verordnungen (die alten sind verhext)",
    "Ein Beitrag zur 'Wir-ignorieren-den-Minister'-Stiftung",
    "Ein neuer Zeitumkehrer für die Abteilung für Zeitreisen",
    "Ein verzauberter Stift, der Formulare automatisch ausfüllt",
    "Die Reparatur des Lifts im Ministerium (er steckt schon wieder fest)",
    "Ein neues Porträt für das Büro des Ministers (dieses lächelt wenigstens)",
    "Bestechung für eine schnellere Bearbeitung meines Antrags",
    "Ein Päckchen 'Peruanisches Instant-Finsternispulver' für die nächste Besprechung",
    "Ein neuer Satz Prophezeiungen (die alten waren zu deprimierend)",
    "Die Gebühr für die Nutzung des Flohnetzwerks im Ministerium",
    "Ein neuer Schreibtischstuhl, der nicht quietscht",
    "Ein Exemplar von 'Bürokratie für Dummies'",
    "Ein Beitrag zur jährlichen Ministeriums-Weihnachtsfeier",
    "Ein neuer Satz Stempel für die Abteilung für magische Strafverfolgung",
    "Ein verzauberter Kaffeebecher, der nie kalt wird",
    "Die Kosten für die Entfernung eines Poltergeistes aus dem Archiv",
    "Ein neues Gesetzbuch (das alte wurde als Türstopper verwendet)",
    "Ein Beitrag zur 'Macht-Arthur-Weasley-glücklich'-Stiftung",
    "Ein neuer Satz Roben für die nächste internationale Konferenz der Zauberer",
    "Ein verzauberter Papierkorb, der Dokumente sicher vernichtet",
    "Die Reparatur des Springbrunnens im Atrium des Ministeriums",
    "Ein neues Porträt von Cornelius Fudge (zum Draufwerfen)",
    "Bestechung für einen Parkplatz für meinen Besen näher am Eingang",
    "Ein Päckchen 'Kanarienvogel-Kekse' für die Kaffeepause",
    "Ein neuer Satz Aktenvernichter (die alten sind verflucht)",
    "Die Gebühr für die Kalibrierung meines Zauberstabs",
    "Ein neues Exemplar von 'Magische Hieroglyphen und Logogramme'",
    "Ein Beitrag zur 'Wir-brauchen-mehr-Fenster-im-Ministerium'-Initiative",
    "Schweigegeld (du weißt wofür)",
    "Therapiestunde für meine Eule, sie hat eine Existenzkrise",
    "Rückerstattung für den Unsichtbarkeitsumhang, der durchsichtig war",
    "Abonnement für 'Magische Pilze des Monats'-Club",
    "Wöchentliche Lieferung von Drachenatem-Minzbonbons",
    "Investition in ein Startup, das selbstrührende Teetassen herstellt",
    "Bußgeld für das Verzaubern von Muggel-Geld",
    "Anteil an der Schatzsuche in den Verbotenen Wäldern",
    "Kurs 'Wie man mit einem Geist Smalltalk führt'",
    "Schutzgeld für die Kobolde",
    "Ein Pfund gemahlener Einhorn-Hörner (ethisch bezogen, natürlich)",
    "Spende für die 'Anonyme Zaubertrank-Süchtigen'-Hotline",
    "Anzahlung für ein maßgeschneidertes Porträt, das Witze erzählt",
    "Reparatur meines fliegenden Staubsaugers",
    "Gebühr für die Mitgliedschaft im 'Club der exzentrischen Hutträger'",
    "Rückerstattung für das 'Buch der Ruhe', das geschrien hat",
    "Ein Fass Oger-Starkbier",
    "Investition in eine Wurmschwanz-Farm",
    "Dein Anteil an der Wette, wer Professor Binns zum Einschlafen bringt",
    "Ein selbstschreibender Einkaufszettel",
    "Bußgeld für das illegale Züchten von Knallrümpfigen Krötern",
    "Ein verzaubertes Monokel, das die Auren der Menschen anzeigt",
    "Kosten für die professionelle Reinigung meines Denkariums",
    "Ein Set 'Sprechender Socken', die Modetipps geben",
    "Ein Ticket für das jährliche Troll-Ballett",
    "Rückerstattung für den 'Ewigen Kaugummi', der nach drei Minuten den Geschmack verlor",
    "Anzahlung für eine Villa in Little Hangleton (renovierungsbedürftig)",
    "Ein Glas getrockneter Billywig-Stacheln",
    "Dein Gewinn aus dem Zauberer-Bingo letzte Woche",
    "Ein Kurs in 'Die Kunst des dramatischen Auftritts mit Umhang'",
    "Ein Set selbst-nachfüllender Gewürzdosen",
    "Versicherung gegen spontane Verwandlungen",
    "Ein verzaubertes Jo-Jo, das zurückbellt",
    "Gebühr für die Eichung meines moralischen Kompasses",
    "Rückerstattung für die 'Wahrheitsbonbons', die nur Lügen erzählten",
    "Ein Dutzend Flaschen 'Gedächtnis-Lösch-Trank' (für Notfälle)",
    "Investition in eine Kette von mobilen Zaubertrank-Bars",
    "Dein Anteil am Verkauf von 'Gilderoy Lockhart'-Actionfiguren",
    "Ein selbst-malendes Malbuch",
    "Bußgeld für das Verhexen von Parkuhren",
    "Ein verzauberter Brieföffner, der singt, wenn Post kommt",
    "Kosten für die Beseitigung eines Basilisken aus der Kanalisation",
    "Ein Set 'Leuchtender Pilze' für den Garten",
    "Ein Ticket für die 'Magische Weltausstellung'",
    "Rückzahlung für den 'Stimmungsring', der immer nur 'mürrisch' anzeigte",
    "Anzahlung für einen Thestral (du musst ihn nicht sehen können, um zu bezahlen)",
    "Ein Glas Feen-Staub (extra glitzernd)",
    "Dein Gewinn aus der Wette, dass es heute regnet",
    "Ein Kurs in 'Fortgeschrittenes Schweben für Faule'",
    "Ein selbst-deckender Tisch",
    "Versicherung gegen Flüche von Ex-Partnern",
    "Ein verzauberter Blumentopf, der seine Pflanzen selbst aussucht",
    "Gebühr für die jährliche Überprüfung meines Fluchs",
    "Rückerstattung für die 'magischen Bohnen', die nur normale Bohnen waren",
    "Ein Dutzend Flaschen 'Elixier des langen Lebens' (oder auch nur Limonade)",
    "Investition in eine Firma, die selbst-gehende Koffer herstellt",
    "Dein Anteil an der 'Verkaufe-Lockhart-Haarsträhnen'-Aktion",
    "Ein selbst-faltendes Zelt für Camping-Abenteuer",
    "Bußgeld für das Verzaubern der Nachbarskatze",
    "Ein verzauberter Kühlschrank, der Rezepte vorschlägt",
    "Kosten für die Exmatrikulation meines Ghuls aus der Abendschule",
    "Ein Set 'sprechender Tierfiguren', die nur die Wahrheit sagen",
    "Ein Ticket für das 'Internationale Symposium für nutzlose Zauber'",
    "Rückzahlung für den 'Gedankenlese-Hut', der nur Kopfschmerzen verursachte",
    "Anzahlung für eine gebrauchte Kristallkugel (mit leichten Kratzern)",
    "Ein Glas Drachen-Tränen (sehr salzig)",
    "Dein Gewinn aus der Wette, wie viele Treppenstufen Hogwarts hat",
    "Ein Kurs in 'Wie man einen Hauself höflich entlässt'",
    "Ein selbst-reinigendes Aquarium",
    "Versicherung gegen den Zorn der Zentauren",
    "Ein verzauberter Besen, der auch Staub wischt",
    "Gebühr für die Namensänderung meines Poltergeistes",
    "Rückerstattung für die 'unsichtbare Tinte', die lila war",
    "Ein Dutzend Flaschen 'Trank des lebenden Todes' (für meine Pflanzen)",
    "Investition in eine Zeitung, die nur gute Nachrichten druckt",
    "Dein Anteil an der 'Verkaufe-gebrauchte-Zauberstäbe'-Börse",
    "Ein selbst-schaukelnder Schaukelstuhl",
    "Bußgeld für das Füttern der Wasserspeier",
    "Ein verzauberter Weinkeller, der den Wein perfekt altern lässt",
    "Kosten für die Umschulung meines Irrwichts (er soll jetzt Komplimente machen)",
    "Ein Set 'singender Pflanzen', die die Opernarien schmettern",
    "Ein Ticket für die 'Meisterschaft im Zauberer-Duell'",
    "Rückzahlung für den 'Kraft-Trank', der mich nur müde gemacht hat",
    "Anzahlung für einen Drachen (nur ein kleiner, versprochen)",
    "Ein Glas Phönix-Asche (ideal für den Kamin)",
    "Dein Gewinn aus der Wette, welches Passwort die Fette Dame heute hat",
    "Ein Kurs in 'Wie man sich unsichtbar macht, ohne einen Umhang zu benutzen'",
    "Ein selbst-spielendes Klavier, das nur traurige Lieder kennt",
    "Versicherung gegen Diebstahl durch Niffler",
    "Ein verzauberter Toaster, der Gesichter auf den Toast brennt",
];

const requestNotePlaceholders = [
    "Schuldest mir noch für das Butterbier",
    "Bitte überweise deinen Anteil für die Zaubertrankzutaten",
    "Geld für die Reparatur meines Besens",
    "Leihst du mir Geld für den Ausflug nach Hogsmeade?",
    "Rückerstattung für das Buch von Flourish & Blotts",
    "Sammle für ein Geburtstagsgeschenk für Hagrid, dein Beitrag?",
    "Mein Anteil an der letzten Runde Feuerwhiskey",
    "Brauche dringend Knuts für den Fahrenden Ritter",
    "Dein Beitrag für die Team-Umhänge",
    "Erinnerung: Du wolltest mir das Geld für die Schokofrösche zurückgeben",
    "Kaution für die Weasley-Zwillinge, mal wieder...",
    "Könntest du die Rechnung im Honigtopf übernehmen?",
    "Anteil für das Abendessen in den Drei Besen",
    "Spende für S.P.E.W., machst du mit?",
    "Bitte um einen kleinen Zuschuss für neue Federkiele",
    "Wetteinsatz für das nächste Quidditch-Spiel",
    "Ich lege für die Tickets für die Weltmeisterschaft aus, dein Anteil bitte",
    "Dein Beitrag zur Partykasse im Gemeinschaftsraum",
    "Rückzahlung für die verlorene Wette",
    "Geld für ein neues Exemplar von 'Geschichte der Zauberei'",
    "Bitte um eine kleine Finanzspritze für meine Niffler-Zucht",
    "Ich brauche Geld für ein neues Paar Drachenleder-Handschuhe",
    "Dein Anteil an der Miete für den Besenschrank",
    "Kannst du mir Geld für ein neues Teleskop leihen?",
    "Rückerstattung für die Kräuterkunde-Ausrüstung",
    "Dein Beitrag für den 'Wir-hassen-Umbridge'-Fond",
    "Ich sammle für Dobbys Socken-Kollektion",
    "Bitte um eine kleine Unterstützung für meine Forschungen",
    "Dein Anteil für das Abwehren des Poltergeistes",
    "Rückerstattung für den Beruhigungstrank vor den ZAGs",
    "Leihst du mir was für eine seltene Alraune?",
    "Kostenbeteiligung für die Entfluchung meines Kessels",
    "Sammelbestellung bei Eeylops Eulenkaufhaus, dein Anteil bitte",
    "Ich brauche Geld, um Peeves zu bestechen",
    "Dein Beitrag für die nächste Sitzung von Dumbledores Armee",
    "Rückzahlung für das Porto des Heulers an deine Mutter",
    "Finanzspritze für mein Projekt 'selbst-umrührende Kessel'",
    "Anteil an den Kosten für die Beseitigung des portablen Sumpfes",
    "Leihst du mir Geld für einen Liebestrank? (rein wissenschaftlich)",
    "Rückerstattung für die Nasch-und-Schwänz-Leckereien",
    "Dein Beitrag zum Kauf eines neuen Tarnumhangs (unserer hat ein Loch)",
    "Sammle für die Renovierung der Heulenden Hütte",
    "Bitte um einen Vorschuss für die nächste Runde 'Explodierender Snap'",
    "Dein Anteil für die Pflege von Hagrids neuem 'Haustier'",
    "Geld für eine neue Ausgabe des Klitterers",
    "Rückerstattung für die Zutaten des Felix Felicis",
    "Bitte um eine Spende für die 'Rettet die Hippogreife'-Initiative",
    "Dein Beitrag zur Reparatur des Verschwindekabinetts",
    "Ich lege für die Apparier-Prüfungsgebühr aus",
    "Sammle für eine Statue zu Ehren von Dumbledore",
    "Rückerstattung für die Butterbier-Runde von letzter Woche",
    "Dein Anteil am Kauf des 'Monsterbuchs der Monster'",
    "Finanzierung für die Suche nach dem Stein der Weisen",
    "Geld für eine neue Zeitumkehrer-Versicherung",
    "Bitte um einen Zuschuss für meine Sammlung seltener Zauberer-Karten",
    "Dein Beitrag zur Bestechung der fetten Dame",
    "Ich brauche Geld, um meinen Zauberstab reparieren zu lassen",
    "Rückerstattung für die Quidditch-Ausrüstung",
    "Sammle für ein Abschiedsgeschenk für Professor Lupin",
    "Dein Anteil am Feuerwerk der Weasleys",
    "Geld für ein neues Set Gobstones",
    "Bitte um eine kleine Leihgabe für eine Flasche Veritaserum",
    "Rückerstattung für die Miete des Denkariums",
    "Dein Beitrag für die nächste Expedition in den Verbotenen Wald",
    "Ich lege für die Heiltränke nach dem letzten Spiel aus",
    "Sammle Geld für die Befreiung der Hauselfen",
    "Rückerstattung für die Anti-Schummel-Federkiele",
    "Dein Anteil an der Bestellung bei Zonko's Scherzartikelladen",
    "Geld für die Reinigung der Eulerei",
    "Bitte um Unterstützung für mein Duellierclub-Training",
    "Rückerstattung für die Pflege von Krätze",
    "Dein Anteil am Kauf seltener Zaubertrank-Aufsätze",
    "Finanzierung für die nächste Ausgabe des 'Tagespropheten'",
    "Geld für ein neues magisches Schachspiel",
    "Bitte um eine Spende für die St. Mungo-Klinik",
    "Rückerstattung für die explodierenden Bonbons",
    "Dein Anteil an der Taxifahrt mit dem Fahrenden Ritter",
    "Ich brauche Geld für neue Roben von Madam Malkin's",
    "Sammle für die Restaurierung des Gemeinschaftsraums",
    "Rückerstattung für die Mondkalb-Dung-Lieferung",
    "Dein Anteil an den Kosten für die De-Gnomisierung des Gartens",
    "Geld für ein neues Paar Quidditch-Handschuhe",
    "Bitte um einen Kredit für eine neue Eule",
    "Rückerstattung für die Tickets für das Konzert der Schwestern des Schicksals",
    "Dein Beitrag für die nächste Butterbier-Flatrate-Party",
    "Ich sammle für die Verteidigung gegen die dunklen Künste-Nachhilfestunden",
    "Rückerstattung für die Pflege von Seidenschnabel",
    "Dein Anteil am Kauf der Karte des Rumtreibers",
    "Geld für eine neue Phiole für Professor Slughorn",
    "Bitte um einen Zuschuss für die nächste Hogsmeade-Shoppingtour",
    "Rückerstattung für die Wette gegen Slytherin",
    "Dein Anteil an der Bestellung von 'Verlängerbaren Ohren'",
    "Ich brauche Geld für ein neues Buch über magische Geschöpfe",
    "Sammle für ein Denkmal für die gefallenen Helden",
    "Rückerstattung für die Reparatur des Gemeinschafts-Kessels",
    "Dein Anteil an der Bestechung von Argus Filch",
    "Geld für eine neue Ausgabe von 'Zaubertränke für Fortgeschrittene'",
    "Bitte um einen Vorschuss für die nächste Süßigkeiten-Lieferung von Honigtopf",
    "Rückerstattung für die Organisation der Weihnachtsfeier",
    "Dein Anteil an der Miete für den Raum der Wünsche",
    "Ich brauche Geld für ein neues Set selbst-mischender Karten",
    "Sammle für die 'Haltet Hogwarts sauber'-Kampagne",
    "Rückerstattung für die Heulende-Hütte-Tour",
    "Dein Anteil am Kauf eines neuen Snitches",
    "Geld für die Reparatur des kaputten Spiegels",
    "Bitte um eine Leihgabe für die Teilnahme am Trimagischen Turnier",
    "Rückerstattung für die Feuerwerkskörper vom 4. Juli",
    "Dein Anteil an den Kosten für die Verwandlung von Malfoy in ein Frettchen",
    "Ich brauche Geld für eine neue Kristallkugel",
    "Sammle für die Renovierung des Quidditch-Feldes",
    "Rückerstattung für die Anti-Doxy-Spray-Ladung",
    "Dein Anteil an der Rettungsaktion für Sirius Black",
    "Geld für ein neues Set Zauberer-Briefmarken",
    "Bitte um einen Zuschuss für mein Basilisken-Forschungsprojekt",
    "Rückerstattung für die Miete der fliegenden Schlüssel",
    "Dein Anteil an der Bezahlung des Trolls im Kerker",
    "Ich brauche Geld für ein neues Medaillon (nicht das von Slytherin!)",
    "Sammle für die Wiedereröffnung von 'Weasleys Zauberhafte Zauberscherze'",
    "Rückerstattung für die Reparatur des fliegenden Ford Anglia",
    "Dein Anteil an der Bestechung des Ministers für Magie",
    "Geld für eine neue Ausgabe von 'Die Märchen von Beedle dem Barden'",
    "Noch offen: Dein Anteil für die Bücher",
    "Bitte um Rückzahlung für die Kinokarten",
    "Erinnerung: Die Wette von gestern Abend",
    "Du bist dran mit der Runde im Pub",
    "Kosten für die gemeinsame Taxifahrt",
    "Dein Beitrag zum gemeinsamen Geschenk",
    "Ich lege das Geld für das Essen aus, bitte zurückzahlen",
    "Noch offen: Dein Anteil an der Miete",
    "Rückerstattung für die Einkäufe",
    "Beteiligung an den Reparaturkosten",
    "Leihst du mir was bis zum Monatsende?",
    "Sammelbestellung, dein Anteil bitte",
    "Könntest du mir für den Kaffee aushelfen?",
    "Dein Einsatz für die Tipprunde",
    "Rückzahlung des kleinen Kredits von letzter Woche",
    "Kostenbeteiligung für das Projekt",
    "Dein Anteil an der Rechnung für das Abendessen",
    "Ich sammle Geld für einen wohltätigen Zweck, bist du dabei?",
    "Bitte um einen kleinen Vorschuss",
    "Dein Anteil für die Tickets",
    "Rückerstattung für die Medikamente aus der Apotheke",
    "Beteiligung an den Spritkosten",
    "Könntest du mir das geliehene Geld zurückgeben?",
    "Dein Beitrag für die Partykasse",
    "Ich brauche Geld für ein neues Ladegerät",
    "Rückzahlung für die ausgeliehenen 20 Galleonen",
    "Dein Anteil an den Streaming-Abos für den magischen Spiegel",
    "Bitte überweise mir deinen Teil der Nebenkosten",
    "Ich habe die Konzertkarten bezahlt, dein Anteil steht noch aus",
    "Geld für die Reinigung der Festumhänge",
    "Dein Beitrag für das Hochzeitsgeschenk",
    "Rückerstattung für die Hotelbuchung im Tropfenden Kessel",
    "Kosten für den gemeinsamen Urlaub",
    "Bitte um deinen Anteil für den Wocheneinkauf in der Winkelgasse",
    "Ich lege für die Getränke aus",
    "Dein Teil der Pizza-Bestellung",
    "Rückzahlung für die Bahntickets des Hogwarts-Express",
    "Beteiligung an den Kosten für das neue Spiel",
    "Könntest du mir meinen Anteil für das Taxi schicken?",
    "Dein Beitrag für die Klassenfahrt",
    "Ich brauche Geld für die Studiengebühren in Hogwarts",
    "Rückerstattung für die Kopierkosten der Aufsätze",
    "Dein Anteil für die Sportvereinsgebühr (Quidditch)",
    "Bitte um eine kleine Finanzspritze für den Umzug",
    "Ich habe die Kaution vorgestreckt",
    "Dein Teil der Maklergebühr",
    "Rückzahlung für die neuen Möbel",
    "Kostenbeteiligung für die Renovierung",
    "Dein Anteil für die Handwerkerrechnung",
    "Ich brauche Geld für die Autoreparatur (fliegendes Auto)",
    "Rückerstattung für die Versicherung",
    "Dein Anteil an der Besen-Steuer",
    "Bitte um Beteiligung an den Tierarztkosten für Hedwig",
    "Ich habe das Futter für den Hund (Fang) bezahlt",
    "Dein Beitrag für das neue Spielzeug der Kinder",
    "Rückerstattung für die Babysitter-Kosten",
    "Kosten für den gemeinsamen Ausflug",
    "Dein Anteil an der Ferienwohnung",
    "Ich lege für die Mautgebühren aus",
    "Rückzahlung für die Vignetten",
    "Beteiligung an den Parkgebühren",
    "Dein Beitrag für den Grillabend",
    "Ich habe das Fleisch und die Getränke besorgt",
    "Rückerstattung für den Kuchen",
    "Kosten für die Dekoration der Party",
    "Dein Anteil an der Raummiete",
    "Ich brauche Geld für die Nachhilfestunden",
    "Rückzahlung für die Kursgebühren",
    "Beteiligung an den Materialkosten",
    "Dein Beitrag für die Exkursion",
    "Ich habe die Laborgebühren bezahlt",
    "Rückerstattung für die Fachliteratur",
    "Kosten für die Softwarelizenz",
    "Dein Anteil am Server-Hosting",
    "Ich brauche Geld für die Domain-Registrierung",
    "Rückzahlung für die Werbekosten",
    "Beteiligung am Büromaterial",
    "Dein Beitrag zur Kaffeekasse im Büro",
    "Ich habe das Mittagessen für alle geholt",
    "Rückerstattung für die Geschäftsreisekosten",
    "Kosten für das Team-Event",
    "Dein Anteil am Abschiedsgeschenk für den Kollegen",
    "Erinnerung an die Wettgewinne vom Quidditch-Spiel",
    "Bitte um Rückzahlung des Vorschusses für die Bertie Botts Bohnen",
    "Kostenbeteiligung für die Reparatur des kaputten Zauberstabs",
    "Dein Anteil für den Eintritt in die Heulende Hütte",
    "Ich habe für 'Phantastische Tierwesen' ausgelegt",
    "Bitte gib mir das Geld für die Kaution von Hagrid zurück",
    "Dein Beitrag für die DA-Sitzung fehlt noch",
    "Rückerstattung der Lizenzgebühr für den Federkiel",
    "Kosten für die Nachhilfe in Verwandlung",
    "Ich sammle Geld für einen Heuler für Malfoy, dein Anteil?",
    "Die Karte des Rumtreibers war nicht umsonst, dein Anteil bitte",
    "Honigtopf-Raubzug: Dein Anteil an der Beute... äh, Rechnung",
    "Die neuesten Zauberscherze, dein Kostenanteil",
    "Abo vom Tagespropheten, du bist dran mit Zahlen",
    "Rückzahlung für die Runde Kürbissaft",
    "Noch offen: Dein Anteil am neuen Umhang von Madam Malkin's",
    "Bitte um Rückerstattung für die Zischenden Wissbies",
    "Kosten für die Pflege des Hippogreifs",
    "Veritaserum-Beschaffung, dein Anteil",
    "Leihgebühr für das Denkarium",
    "Dein Beitrag für das magische Tierfutter",
    "Reparaturkosten für das fliegende Auto, wir teilen doch, oder?",
    "Die Rechnung von den Drei Besen ist da",
    "Gehalt für den Hauself, dein Anteil",
    "Sammle für eine seltene Alraune, machst du mit?",
    "Investition in einen portablen Sumpf, dein Anteil?",
    "Geld für den nächsten Hogsmeade-Ausflug",
    "Bitte um Beteiligung an den neuen Drachenleder-Handschuhen",
    "Spende an den Orden des Phönix, bist du dabei?",
    "Fehlender Betrag für den neuen Satz Zaubertrank-Fläschchen",
    "Dein Einsatz für das magische Schachspiel",
    "Erinnerungsmich-Ersatz, Kostenbeteiligung erbeten",
    "Die Knallbonbons von gestern, dein Anteil",
    "Bestellung bei Eeylops Eulenkaufhaus, bitte überweisen",
    "Dein Anteil für den seltenen Zaubertrank-Aufsatz",
    "Pflegekosten für Krätze, bitte beteiligen",
    "Mondkalb-Dung-Lieferung, dein Teil der Rechnung",
    "Lakritz-Zauberstäbe, du bist dran",
    "Explodierender Kessel, bitte um Beteiligung an den Kosten",
    "Geburtstagsgeschenk, dein Beitrag steht noch aus",
    "Würg Riegel, dein Anteil an der Großbestellung",
    "Verlängerbare Ohren, bitte um Rückerstattung",
    "Kanarienvogel-Kekse, dein Anteil?",
    "Dein Beitrag für das peruanische Instant-Finsternispulver",
    "Nasch-und-Schwänz-Leckereien, bitte um Kostenbeteiligung",
    "Pickel-Entferner, du wolltest die Hälfte zahlen",
    "Liebestrank-Experiment, dein Anteil an den Zutaten",
    "Kotzbomben-Vorrat, bitte um deinen Beitrag",
    "Essbare Dunkle Male, dein Anteil?",
    "Tagtraumzauber-Patent, bitte um deine Investition",
    "Kopf-ab-Hut, dein Anteil am Scherz",
    "Wunderhexen-Zauber-Set, Kostenbeteiligung",
    "Scherzartikelladen-Rechnung, dein Teil",
    "Fressanfall-Fudge, bitte um Rückzahlung",
    "Honigtopf-Einkauf, dein Anteil fehlt noch",
    "Rechnung von Potage's Kesselladen",
    "Dein Anteil am Einkauf bei Flourish & Blotts",
    "Feder von Scrivenshaft's, bitte erstatten",
    "Zonko's Scherzartikelladen, dein Beitrag",
    "Madam Puddifoot's Teesalon, du warst eingeladen, aber...",
    "Eulenleckerlis, dein Anteil",
    "Kosten für den Tagespropheten",
    "Eis von Florean Fortescue, bitte zurückzahlen",
    "Besuch im Tropfenden Kessel, dein Deckel",
    "Gringotts Bearbeitungsgebühr, bitte beteiligen",
    "Besenpolitur-Set, dein Anteil",
    "Tickets für das Chudley Cannons Spiel",
    "Dein Wetteinsatz für das Gryffindor vs. Slytherin Spiel",
    "Quidditch-Handschuhe, dein Anteil",
    "Reparatur des Klatschers, Kostenbeteiligung",
    "Poster von Viktor Krum, du wolltest es auch",
    "Team-Beitrag für neue Umhänge",
    "Quidditch-Almanach, dein Anteil",
    "Heiltrank für nach dem Training, bitte erstatten",
    "Ticket für die Quidditch-Weltmeisterschaft",
    "Kniesel-Futter, dein Beitrag",
    "Halsband für Fang, du wolltest es mitschenken",
    "Drachenfutter, streng geheime Kostenbeteiligung",
    "Decke für Hedwig's Käfig, dein Anteil",
    "Buch über die Pflege von Hippogreifen, bitte erstatten",
    "Bezahlung für die De-Gnomisierung des Gartens",
    "Niffler-Futter, bitte um deinen Beitrag",
    "Bowtruckle-Zweige, dein Anteil",
    "Terrarium für einen Schrumpffüßler, Kostenbeteiligung",
    "Salamander-Futter, dein Beitrag",
    "Nachhilfe bei Slughorn, bitte um deinen Anteil",
    "Neuer Satz Phiolen, Kostenbeteiligung",
    "Pergament und Tinte, dein Anteil",
    "Ausgabe von 'Verteidigung für Fortgeschrittene'",
    "Beitrag für den Duellierclub",
    "Gebühr für die Apparierprüfung",
    "Neues Teleskop für Astronomie, dein Anteil",
    "Kräuterkunde-Handschuhe, bitte erstatten",
    "Exemplar von 'Geschichte der Zauberei'",
    "Versuch, Hauspunkte zu kaufen, dein Einsatz?",
    "Schweigegeld für Peeves, dein Anteil",
    "Passwort für die fette Dame, dein Beitrag zur Bestechung",
    "Beitrag zum 'Wir-hassen-Umbridge'-Fond",
    "Portschlüssel nach Hause, dein Anteil",
    "Neues Paar Socken für Dobby, Spende erbeten",
    "Bibliotheksgebühr für überfälliges Buch",
    "Magisches Amulett gegen Nargel, dein Anteil",
    "Flasche Felix Felicis, bitte um deinen (großen) Anteil",
    "Neuer Zeitumkehrer, Kostenbeteiligung",
    "Gobstone-Set, dein Anteil",
    "Zauberer-Schach-Wetteinsatz",
    "Ausgabe des Klitterers, bitte erstatten",
    "Finanzierung für die Suche nach dem Schnarchkackler",
    "Geschenk für Professor McGonagall, dein Beitrag",
    "Heuler an meine Eltern, Portokosten",
    "Bestechung für einen Slytherin, dein Anteil",
    "Beruhigungstrank für die ZAGs, Kostenbeteiligung",
    "Entfernung eines Flederwicht-Fluchs, dein Anteil",
    "Zauber, um Socken zu sortieren, dein Beitrag",
    "Abonnement für 'Hexenwoche', bitte erstatten",
    "Selbst-umrührender Kessel, dein Anteil",
    "Set Explodierender Snap, Kostenbeteiligung",
    "Spende für St. Mungo's, bist du dabei?",
    "Rückzahlung einer verlorenen Wette",
    "Geld für den nächsten Streich, dein Beitrag",
    "Neuer Tarnumhang, bitte um Beteiligung",
    "Seltenes Autogramm von Lockhart, dein Anteil",
    "Magischer Kalender, Kostenbeteiligung",
    "Muggel-Artefakt für Mr. Weasley, dein Beitrag",
    "Kiste mit heulenden Süßigkeiten, dein Anteil",
    "Zauber, der die Hausaufgaben macht, Investition?",
    "Flasche Odgen's Old Firewhisky, dein Anteil",
    "Päckchen Droobles Bester Blaskaugummi",
    "Geschenk für den Hausgeist, dein Beitrag",
    "Reparatur eines zerbrochenen Erinner-michs",
    "Einladung zum Weihnachtsball, Kosten für dein +1",
    "Geld für einen neuen Familiar, dein Anteil",
    "Beitrag für die Party im Gemeinschaftsraum",
    "Magisches Vorhängeschloss für mein Tagebuch",
    "Schachtel Säure-Knaller, dein Anteil",
    "Zauber, der Gemüse wie Süßigkeiten schmecken lässt",
    "Karte für das Konzert der Schwestern des Schicksals",
    "Set selbststrickender Nadeln, dein Anteil",
    "Verzauberte Schneekugel von Hogsmeade",
    "Geld für den Ausflug in die Winkelgasse",
    "Päckchen singender Lebkuchenmänner",
    "Amulett zum Schutz vor Werwölfen",
    "Verzauberter Kompass, der zum Kühlschrank führt",
    "Kissen, das einem Schlaflieder vorsingt",
    "Magisches Pflaster, das Wunden sofort heilt",
    "Zauber, der verlorene Gegenstände findet",
    "Set unsichtbarer Tinte, dein Anteil",
    "Verzaubertes Lesezeichen, das die Geschichte vorliest",
    "Magischer Federkiel, der nicht kleckst",
    "Set schwebender Kerzen für mein Zimmer",
    "Flasche Elfenwein, dein Anteil an der Rechnung",
    "Erinnerung: Du wolltest mir Geld leihen",
    "Vorschuss für unser gemeinsames Projekt",
    "Noch offen: Dein Anteil an der letzten Bestellung",
    "Bitte um Rückzahlung des Darlehens",
    "Gemeinschaftskasse ist leer, bitte auffüllen",
    "Dein Beitrag für die Miete steht noch aus",
    "Stromrechnung, dein Anteil bitte",
    "Internetrechnung, bitte überweisen",
    "Lebensmitteleinkauf, dein Anteil",
    "Getränke von gestern Abend",
    "Taxifahrt, bitte um deinen Anteil",
    "Geburtstagsgeschenk für einen Freund",
    "Hochzeitsgeschenk, dein Beitrag",
    "Konzertkarten, ich hab ausgelegt",
    "Urlaubsplanung, Anzahlung erforderlich",
    "Flugtickets, bitte um deinen Anteil",
    "Hotelbuchung, dein Beitrag",
    "Mietwagenkosten, bitte beteiligen",
    "Spritgeld für die letzte Fahrt",
    "Reparaturkosten, dein Anteil",
    "Versicherungsbeitrag, bitte überweisen",
    "Tierarztkosten, dein Anteil für den Hippogreif",
    "Medikamente, bitte um Rückerstattung",
    "Abendessen von letzter Woche",
    "Kinotickets, du bist dran",
    "Streaming-Dienst, dein monatlicher Beitrag",
    "Vereinsbeitrag, bitte überweisen",
    "Kursgebühr, dein Anteil",
    "Materialkosten für den Kurs",
    "Nachhilfestunden, bitte bezahlen",
    "Studiengebühren, bitte um Unterstützung",
    "Kaution für die Wohnung",
    "Renovierungskosten, dein Anteil",
    "Neue Möbel, bitte beteiligen",
    "Handwerkerrechnung, dein Anteil",
    "Gartenbedarf, bitte um Kostenbeteiligung",
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

const RequestMoneyView: React.FC<{
    currentUser: User;
    users: User[];
    moneyRequests: MoneyRequest[];
    onCreateRequest: (requesteeIds: string[], amount: { g: number; s: number; k: number }, note?: string) => Promise<void>;
    onAcceptRequest: (request: MoneyRequest) => Promise<void>;
    onRejectRequest: (requestId: string) => Promise<void>;
}> = ({ currentUser, users, moneyRequests, onCreateRequest, onAcceptRequest, onRejectRequest }) => {
    // Form state
    const [requesteeIds, setRequesteeIds] = useState<string[]>([]);
    const [galleons, setGalleons] = useState('');
    const [sickles, setSickles] = useState('');
    const [knuts, setKnuts] = useState('');
    const [note, setNote] = useState('');
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [notePlaceholder, setNotePlaceholder] = useState('z.B. für Butterbier');

    // Request list state
    const [requestError, setRequestError] = useState('');
    const [dismissedRejectedIds, setDismissedRejectedIds] = useState<string[]>([]);

    useEffect(() => {
        const randomPlaceholder = requestNotePlaceholders[Math.floor(Math.random() * requestNotePlaceholders.length)];
        setNotePlaceholder(`z.B. ${randomPlaceholder}`);
    }, []);

    const otherUsers = users
        .filter(u => u.id !== currentUser.id && !u.is_deleted)
        .sort((a, b) => a.name.localeCompare(b.name));

    const handleRequesteeToggle = (userId: string) => {
        setRequesteeIds(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const filteredUsers = otherUsers.filter(user => user.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleCreateRequest = async () => {
        setFormError('');
        setFormSuccess('');
        if (requesteeIds.length === 0) {
            setFormError('Bitte wähle mindestens einen Empfänger aus.');
            return;
        }

        const amount = {
            g: parseInt(galleons) || 0,
            s: parseInt(sickles) || 0,
            k: parseInt(knuts) || 0
        };
        // Fix: Call currencyToKnuts with the correct object shape
        const amountInKnuts = currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k });

        if (amountInKnuts <= 0) {
            setFormError('Bitte gib einen Betrag größer als 0 an.');
            return;
        }

        try {
            await onCreateRequest(requesteeIds, amount, note.trim());
            setFormSuccess('Anfrage(n) erfolgreich gesendet.');
            setRequesteeIds([]);
            setGalleons('');
            setSickles('');
            setKnuts('');
            setNote('');
        } catch (e: any) {
            setFormError(e.message);
        }
    };

    const incomingRequests = moneyRequests.filter(r => r.requestee_id === currentUser.id && r.status === 'pending');
    const yourOpenRequests = moneyRequests.filter(r => r.requester_id === currentUser.id && r.status === 'pending');
    const yourRejectedRequests = moneyRequests.filter(r => r.requester_id === currentUser.id && r.status === 'rejected' && !dismissedRejectedIds.includes(r.id));
    
    const handleAccept = async (request: MoneyRequest) => {
        setRequestError('');
        try {
            if (currentUser.balance < request.amount) {
                const canonicalBalance = knutsToCanonical(currentUser.balance);
                const canonicalRequest = knutsToCanonical(request.amount);
                setRequestError(`Du hast nicht genug Geld. Du benötigst ${canonicalRequest.galleons}G ${canonicalRequest.sickles}S ${canonicalRequest.knuts}K, hast aber nur ${canonicalBalance.galleons}G ${canonicalBalance.sickles}S ${canonicalBalance.knuts}K.`);
                return;
            }
            await onAcceptRequest(request);
        } catch (e: any) {
            setRequestError(e.message);
        }
    };

    const handleReject = async (requestId: string) => {
        setRequestError('');
        try {
            await onRejectRequest(requestId);
        } catch (e: any) {
            setRequestError(e.message);
        }
    };

    const handleDismissRejected = (requestId: string) => {
        setDismissedRejectedIds(prev => [...prev, requestId]);
    };

    const commonInputStyles = "w-full p-4 bg-[#FFFFFF21] border border-[#FFFFFF59] rounded-2xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow";
    const AmountDisplay: React.FC<{ amount: number }> = ({ amount }) => {
        const canonical = knutsToCanonical(amount);
        return (
            <>
                {`${canonical.galleons.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">G</span>
                {`, ${canonical.sickles.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">S</span>
                {`, ${canonical.knuts.toLocaleString('de-DE')} `}<span className="text-lg opacity-70">K</span>
            </>
        );
    };

    return (
        <div className="space-y-8">
            {/* Form to create a request */}
            <div className="space-y-6">
                <h2 className="text-3xl sm:text-4xl font-bold">Geld anfordern</h2>
                <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 border border-[#FFFFFF59]">
                    <div className="space-y-6">
                        <div>
                            <label className="block mb-2 text-sm font-medium opacity-80">Von</label>
                            <input
                                type="text"
                                placeholder="Nutzer suchen..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className={`${commonInputStyles} mb-2`}
                            />
                            <div className="bg-[#FFFFFF21] border border-[#FFFFFF59] rounded-2xl p-2 max-h-48 overflow-y-auto">
                                {filteredUsers.length > 0 ? (
                                    filteredUsers.map(user => (
                                        <label key={user.id} className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors ${requesteeIds.includes(user.id) ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                            <input
                                                type="checkbox"
                                                checked={requesteeIds.includes(user.id)}
                                                onChange={() => handleRequesteeToggle(user.id)}
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
                            <label htmlFor="request-note" className="block mb-2 text-sm font-medium opacity-80">Notiz (optional)</label>
                            <input type="text" id="request-note" value={note} onChange={e => setNote(e.target.value)} className={commonInputStyles} placeholder={notePlaceholder} maxLength={100} />
                        </div>
                        {formError && <p className="text-red-400 text-sm text-center">{formError}</p>}
                        {formSuccess && <p className="text-green-400 text-sm text-center">{formSuccess}</p>}
                        <button onClick={handleCreateRequest} className="w-full text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base h-[3.75rem] transition-colors">
                            Anfordern
                        </button>
                    </div>
                </div>
            </div>

            {/* Lists of requests */}
            <div className="space-y-6">
                <h3 className="text-2xl font-bold">Offene Anfragen</h3>
                {requestError && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-xl">{requestError}</p>}
                
                {/* Incoming Requests */}
                <div>
                    <h4 className="text-xl font-bold mb-2">Anfragen an dich</h4>
                    <div className="space-y-4">
                        {incomingRequests.length > 0 ? (
                            incomingRequests.map(req => (
                                <div key={req.id} className="bg-[#FFFFFF21] rounded-3xl p-4 sm:p-5 border border-[#FFFFFF59]">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">
                                                <span className={houseTextColors[req.requester?.house || '']}>{req.requester?.name || 'Unbekannt'}</span>
                                            </p>
                                            <p className="text-sm opacity-70">{new Date(req.created_at).toLocaleString('de-DE')}</p>
                                        </div>
                                        <p className="font-bold text-lg text-yellow-300"><AmountDisplay amount={req.amount} /></p>
                                    </div>
                                    {req.note && <p className="text-sm opacity-80 mt-2 pt-2 border-t border-white/10">{req.note}</p>}
                                    <div className="flex gap-4 mt-4">
                                        <button onClick={() => handleReject(req.id)} className="w-full h-12 flex items-center justify-center bg-red-600/20 hover:bg-red-600/40 text-red-300 font-bold rounded-full transition-colors"><XIcon className="w-7 h-7" /></button>
                                        <button onClick={() => handleAccept(req)} className="w-full h-12 flex items-center justify-center bg-green-600/20 hover:bg-green-600/40 text-green-300 font-bold rounded-full transition-colors"><CheckIcon className="w-7 h-7" /></button>
                                    </div>
                                </div>
                            ))
                        ) : <p className="text-center opacity-70 p-4">Du hast keine offenen Anfragen.</p>}
                    </div>
                </div>

                {/* Your Requests */}
                <div>
                    <h4 className="text-xl font-bold mb-2">Status deiner Anfragen</h4>
                    <div className="space-y-3">
                         {yourRejectedRequests.length > 0 && yourRejectedRequests.map(req => (
                             <div key={req.id} className="relative bg-red-500/10 rounded-2xl p-4 border border-red-500/30">
                                <p className="text-sm"><strong className={houseTextColors[req.requestee?.house || '']}>{req.requestee?.name || 'Unbekannt'}</strong> hat deine Anfrage über <strong className="text-red-300"><AmountDisplay amount={req.amount} /></strong> abgelehnt.</p>
                                <button onClick={() => handleDismissRejected(req.id)} className="absolute top-1 right-1 p-1 text-white/50 hover:text-white"><XIcon className="w-4 h-4" /></button>
                            </div>
                        ))}
                         {yourOpenRequests.length > 0 ? (
                            yourOpenRequests.map(req => (
                                <div key={req.id} className="bg-black/20 rounded-2xl p-4">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm">Wartet auf Antwort von <strong className={houseTextColors[req.requestee?.house || '']}>{req.requestee?.name || 'Unbekannt'}</strong></p>
                                        <p className="text-sm font-semibold opacity-80"><AmountDisplay amount={req.amount} /></p>
                                    </div>
                                </div>
                            ))
                        ) : yourRejectedRequests.length === 0 ? (
                            <p className="text-center opacity-70 p-4">Du hast keine Anfragen gesendet.</p>
                        ) : null}
                    </div>
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
    
    const ORIGINAL_KING_EMAIL = 'luca.lombino@icloud.com';
    const KINGSLEY_EMAIL = 'da-hauspokal-orga@outlook.com';
    const TEST_LUSA_EMAIL = 'lucagauntda7@gmail.com';

    const canCurrentUserDeleteUser = (targetUser: User) => {
        if (!isKing) return false;
        if (targetUser.id === currentUser.id) return false; // Can't delete self
        if (currentUser.email === KINGSLEY_EMAIL && (targetUser.email === ORIGINAL_KING_EMAIL || targetUser.email === TEST_LUSA_EMAIL)) {
            return false; // Kingsley can't delete Original King or Test-Lusa
        }
        return true;
    };


    return (
        <div className="space-y-6">
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSave={onUpdateUser}
                    onDelete={onSoftDeleteUser}
                    currentUser={currentUser}
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
                        visibleUsers.map(user => {
                            const { galleons, sickles, knuts } = knutsToCanonical(user.balance);
                            return (
                                <div key={user.id} className={`flex items-center justify-between p-3 rounded-2xl ${user.is_deleted ? 'bg-red-500/10' : 'bg-black/20'}`}>
                                    <div>
                                        <p className="font-semibold">{user.name} {user.id === currentUser.id && '(Du)'}</p>
                                        <p className="text-sm opacity-70">
                                            {galleons.toLocaleString('de-DE')} G, {sickles.toLocaleString('de-DE')} S, {knuts.toLocaleString('de-DE')} K - <span className={`font-semibold ${houseTextColors[user.house]}`}>{user.house}</span>
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
                                             {canCurrentUserDeleteUser(user) && (
                                                <button onClick={() => onSoftDeleteUser(user.id)} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Nutzer löschen">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                             )}
                                        </>
                                       )}
                                    </div>
                                </div>
                            );
                        })
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
                                {userNote && <p className="text-white/80 mt-1 pt-1 border-t border-white/10 text-xs"><em>{userNote}</em></p>}
                            </div>
                        );
                    }) : (
                        <p className="text-center opacity-70 p-4">Keine passenden Transaktionen gefunden.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ProfileView: React.FC<{
  currentUser: User;
  onUpdateProfile: (updates: { name?: string; house?: House; }) => Promise<void>;
  onUpdatePassword: (password: string) => Promise<void>;
}> = ({ currentUser, onUpdateProfile, onUpdatePassword }) => {
  const [name, setName] = useState(currentUser.name);
  const [house, setHouse] = useState(currentUser.house);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const hasProfileChanges = name !== currentUser.name || house !== currentUser.house;

  const handleProfileSave = async () => {
    setProfileError('');
    setProfileSuccess('');
    if (!name.trim()) {
      setProfileError('Der Name darf nicht leer sein.');
      return;
    }
    try {
      await onUpdateProfile({
        name: name.trim(),
        house,
      });
      setProfileSuccess('Dein Profil wurde erfolgreich aktualisiert.');
    } catch (error: any) {
      setProfileError(error.message || 'Aktualisierung fehlgeschlagen.');
    }
  };

  const handlePasswordUpdate = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (password.length < 6) {
      setPasswordError('Das Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Die Passwörter stimmen nicht überein.');
      return;
    }
    try {
      await onUpdatePassword(password);
      setPasswordSuccess('Dein Passwort wurde erfolgreich geändert.');
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.message || 'Änderung des Passworts fehlgeschlagen.');
    }
  };
  
  const houseDetails = {
    [House.Gryffindor]: { color: "border-red-500", label: "Gryffindor" },
    [House.Slytherin]: { color: "border-green-500", label: "Slytherin" },
    [House.Hufflepuff]: { color: "border-yellow-400", label: "Hufflepuff" },
    [House.Ravenclaw]: { color: "border-blue-500", label: "Ravenclaw" },
  };

  const commonInputStyles = "w-full p-4 bg-[#FFFFFF21] border border-[#FFFFFF59] rounded-2xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow";

  return (
    <div className="space-y-8">
      {/* Profile Details */}
      <div className="space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold">Profil bearbeiten</h2>
        <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 border border-[#FFFFFF59] space-y-6">
          <div>
            <label htmlFor="profile-name" className="block mb-2 text-sm font-medium opacity-80">Name</label>
            <input id="profile-name" type="text" value={name} onChange={e => setName(e.target.value)} className={commonInputStyles} />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium opacity-80">Haus</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.values(House).map((h) => (
                <button type="button" key={h} onClick={() => setHouse(h)} className={`p-4 rounded-2xl border-2 transition-all duration-200 text-center font-bold ${house === h ? `${houseDetails[h].color} bg-white/10` : 'border-transparent bg-[#FFFFFF21] hover:bg-white/10'}`}>
                    {houseDetails[h].label}
                </button>
              ))}
            </div>
          </div>
           {profileError && <p className="text-red-400 text-sm text-center">{profileError}</p>}
           {profileSuccess && <p className="text-green-400 text-sm text-center">{profileSuccess}</p>}
          <button onClick={handleProfileSave} disabled={!hasProfileChanges} className="w-full text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base h-[3.75rem] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            Profil speichern
          </button>
        </div>
      </div>
      
      {/* Security */}
      <div className="space-y-6">
        <h2 className="text-3xl sm:text-4xl font-bold">Sicherheit</h2>
        <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 border border-[#FFFFFF59] space-y-6">
          <div>
            <label className="block mb-2 text-sm font-medium opacity-80">E-Mail</label>
            <p className="p-4 bg-black/20 border border-white/20 rounded-2xl text-white/70">{currentUser.email}</p>
          </div>
          <div>
            <label htmlFor="new-password"className="block mb-2 text-sm font-medium opacity-80">Neues Passwort</label>
            <input id="new-password" type="password" value={password} onChange={e => setPassword(e.target.value)} className={commonInputStyles} placeholder="Mindestens 6 Zeichen" />
          </div>
          <div>
            <label htmlFor="confirm-password"className="block mb-2 text-sm font-medium opacity-80">Neues Passwort bestätigen</label>
            <input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={commonInputStyles} placeholder="Passwort wiederholen" />
          </div>
          {passwordError && <p className="text-red-400 text-sm text-center">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-400 text-sm text-center">{passwordSuccess}</p>}
          <button onClick={handlePasswordUpdate} disabled={!password || !confirmPassword} className="w-full text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base h-[3.75rem] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            Passwort ändern
          </button>
        </div>
      </div>
    </div>
  );
};


const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  users,
  transactions,
  moneyRequests,
  onSendMoney,
  isKing,
  globalTransactions,
  onUpdateUser,
  onSoftDeleteUser,
  onRestoreUser,
  onCreateRequest,
  onAcceptRequest,
  onRejectRequest,
  onUpdateProfile,
  onUpdatePassword
}) => {
  const [activeTab, setActiveTab] = useState('send');

  const { galleons, sickles, knuts } = knutsToCanonical(currentUser.balance);

  const TabButton: React.FC<{ tabName: string; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 rounded-full text-sm sm:text-base font-bold transition-colors duration-300 ${activeTab === tabName ? 'bg-white text-black' : 'bg-transparent text-white/80 hover:bg-white/10'}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="container mx-auto p-4 pt-28 md:pt-32 pb-24">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 mb-8 border border-[#FFFFFF59] text-center">
            <p className="text-sm font-semibold uppercase opacity-70 tracking-widest">Kontostand</p>
            <div className="my-2 text-4xl sm:text-5xl font-extrabold tracking-tighter">
                <span>{galleons.toLocaleString('de-DE')}</span><span className="text-3xl sm:text-4xl opacity-70 font-bold"> G</span>{' '}
                <span>{sickles.toLocaleString('de-DE')}</span><span className="text-3xl sm:text-4xl opacity-70 font-bold"> S</span>{' '}
                <span>{knuts.toLocaleString('de-DE')}</span><span className="text-3xl sm:text-4xl opacity-70 font-bold"> K</span>
            </div>
            <p className="text-xs opacity-50">entspricht {currentUser.balance.toLocaleString('de-DE')} Knuts</p>
        </div>

        <div className="bg-[#FFFFFF21] rounded-full p-1.5 flex gap-1.5 border border-[#FFFFFF59] mb-8">
            <TabButton tabName="send" label="Senden" icon={<SendIcon />} />
            <TabButton tabName="request" label="Anfordern" icon={<BanknotesIcon />} />
            <TabButton tabName="history" label="Verlauf" icon={<HistoryIcon />} />
            <TabButton tabName="profile" label="Profil" icon={<UserIcon />} />
            {isKing && <TabButton tabName="admin" label="Admin" icon={<AdminIcon />} />}
        </div>
        
        <div className="animate-fadeIn">
            {activeTab === 'send' && (
                <SendMoneyView
                    currentUser={currentUser}
                    users={users}
                    onSendMoney={onSendMoney}
                />
            )}
            {activeTab === 'request' && (
                <RequestMoneyView
                    currentUser={currentUser}
                    users={users}
                    moneyRequests={moneyRequests}
                    onCreateRequest={onCreateRequest}
                    onAcceptRequest={onAcceptRequest}
                    onRejectRequest={onRejectRequest}
                />
            )}
            {activeTab === 'history' && (
                <HistoryView
                    transactions={transactions}
                    currentUserId={currentUser.id}
                />
            )}
            {activeTab === 'profile' && (
                <ProfileView
                  currentUser={currentUser}
                  onUpdateProfile={onUpdateProfile}
                  onUpdatePassword={onUpdatePassword}
                />
            )}
            {activeTab === 'admin' && isKing && globalTransactions && (
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
    </div>
  );
};

export default Dashboard;
