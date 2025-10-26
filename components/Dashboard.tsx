import React, { useState, useEffect, useRef } from 'react';
import type { User, Transaction } from '../types';
import { House } from '../types';
import { SendIcon, HistoryIcon, CrownIcon, UsersIcon, TrashIcon, RestoreIcon, UserEditIcon, UserIcon, FilterIcon } from './icons';
import { knutsToCurrency, currencyToKnuts, formatCurrency } from '../utils';

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
  onSendMoney: (receiverIds: string[], amountInKnuts: number, note?: string) => Promise<void>;
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
    const currency = knutsToCurrency(user.balance);
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
    if (balance < 0) {
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
];

const SendMoneyView: React.FC<{
    currentUser: User;
    users: User[];
    onSendMoney: (receiverIds: string[], amountInKnuts: number, note?: string) => Promise<void>;
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

    const otherUsers = users.filter(u => u.id !== currentUser.id && !u.is_deleted);
    
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
        const amountPerRecipient = currencyToKnuts({
            galleons: parseInt(galleons) || 0,
            sickles: parseInt(sickles) || 0,
            knuts: parseInt(knuts) || 0,
        });

        if (amountPerRecipient <= 0) {
            setError('Bitte gib einen Betrag größer als 0 an.');
            return;
        }

        const totalAmount = amountPerRecipient * receiverIds.length;
        if (totalAmount > currentUser.balance) {
            setError(`Du hast nicht genügend Geld. Du benötigst ${formatCurrency(totalAmount)}, hast aber nur ${formatCurrency(currentUser.balance)}.`);
            return;
        }
        try {
            await onSendMoney(receiverIds, amountPerRecipient, note.trim());
            const recipientNames = receiverIds.map(id => users.find(u => u.id === id)?.name).filter(Boolean);
            setSuccess(`Du hast ${formatCurrency(amountPerRecipient)} an ${recipientNames.length > 1 ? `${recipientNames.length} Personen` : recipientNames[0]} gesendet.`);
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
    if (transactions.length === 0) {
        return <div className="text-center opacity-70">Keine Transaktionen gefunden.</div>;
    }
    return (
        <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">Transaktionsverlauf</h2>
            <div className="space-y-4">
                {transactions.map(tx => {
                    const isAdminChange = tx.note?.startsWith('ADMIN_BALANCE_CHANGE::');

                    if (isAdminChange) {
                        const parts = tx.note.split('::');
                        const newBalanceInKnuts = parseInt(parts[2], 10);
                        const adminName = tx.sender?.name || 'Der King';

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
                                    {adminName} hat den Kontostand von dir geändert. Dein neuer Kontostand beträgt jetzt: <strong className="font-bold">{formatCurrency(newBalanceInKnuts)}</strong>.
                                </p>
                            </div>
                        );
                    }
                    
                    const isSent = tx.sender_id === currentUserId;
                    const otherParty = isSent ? tx.receiver : tx.sender;
                    const houseColorClass = otherParty ? houseTextColors[otherParty.house] : 'opacity-70';

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
                                    {isSent ? '-' : '+'} {formatCurrency(tx.amount)}
                                </p>
                            </div>
                            {tx.note && (
                                <p className="text-sm opacity-80 mt-2 pt-2 border-t border-white/10">
                                    {tx.note}
                                </p>
                            )}
                        </div>
                    );
                })}
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

    const sortedUsers = [...users].sort((a, b) => a.name.localeCompare(b.name));
    const visibleUsers = showDeleted ? sortedUsers : sortedUsers.filter(u => !u.is_deleted);

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
                <div className="space-y-3">
                    {visibleUsers.map(user => (
                        <div key={user.id} className={`flex items-center justify-between p-3 rounded-2xl ${user.is_deleted ? 'bg-red-500/10' : 'bg-black/20'}`}>
                            <div>
                                <p className="font-semibold">{user.name} {user.id === currentUser.id && '(Du)'}</p>
                                <p className="text-sm opacity-70">
                                    {formatCurrency(user.balance)} - <span className={`font-semibold ${houseTextColors[user.house]}`}>{user.house}</span>
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
                    ))}
                </div>
            </div>
            
             <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 border border-[#FFFFFF59]">
                <h3 className="text-2xl font-bold mb-4">Alle Transaktionen</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {transactions.length > 0 ? transactions.map(tx => {
                        const isAdminChange = tx.note?.startsWith('ADMIN_BALANCE_CHANGE::');

                        if (isAdminChange) {
                            const parts = tx.note.split('::');
                            const newBalanceInKnuts = parseInt(parts[2], 10);
                            const adminName = tx.sender?.name || 'Unbekannt';
                            const targetUserName = tx.receiver?.name || 'Unbekannt';

                            return (
                                <div key={tx.id} className="bg-yellow-500/10 p-3 rounded-xl text-sm border border-yellow-500/20">
                                    <p>
                                        <strong className={tx.sender ? houseTextColors[tx.sender.house] : ''}>{adminName}</strong>
                                        {' hat den Kontostand von '}
                                        <strong className={tx.receiver ? houseTextColors[tx.receiver.house] : ''}>{targetUserName}</strong>
                                        {' geändert: '}
                                        <strong className="font-bold">{formatCurrency(newBalanceInKnuts)}</strong>.
                                    </p>
                                    <p className="opacity-60 text-xs mt-1">{new Date(tx.created_at).toLocaleString()}</p>
                                </div>
                            );
                        }
                        
                        return (
                            <div key={tx.id} className="bg-black/20 p-3 rounded-xl text-sm">
                                <p>
                                    <strong className={tx.sender ? houseTextColors[tx.sender.house] : ''}>{tx.sender?.name || 'Unbekannt'}</strong>
                                    {' -> '}
                                    <strong className={tx.receiver ? houseTextColors[tx.receiver.house] : ''}>{tx.receiver?.name || 'Unbekannt'}</strong>
                                    : {formatCurrency(tx.amount)}
                                </p>
                                <p className="opacity-60 text-xs mt-1">{new Date(tx.created_at).toLocaleString()}</p>
                                {tx.note && (
                                    <p className="text-sm opacity-80 mt-1 pt-1 border-t border-white/10">
                                        {tx.note}
                                    </p>
                                )}
                            </div>
                        );
                    }) : <p className="opacity-70">Keine Transaktionen.</p>}
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

  const balance = knutsToCurrency(currentUser.balance);

  return (
    <div className="pt-28 pb-28 md:pt-32 md:pb-32 animate-fadeIn">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
            <p className="text-xl opacity-80">Dein Kontostand</p>
            <p className="text-4xl sm:text-5xl font-bold tracking-tighter">
                {balance.galleons} <span className="text-3xl opacity-70">G</span>, {balance.sickles} <span className="text-3xl opacity-70">S</span>, {balance.knuts} <span className="text-3xl opacity-70">K</span>
            </p>
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