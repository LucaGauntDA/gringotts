import React, { useState, useEffect } from 'react';
import type { User, Transaction } from '../types';
import { House } from '../types';
import { SendIcon, HistoryIcon, CrownIcon, UsersIcon, TrashIcon, RestoreIcon, UserEditIcon } from './icons';
import { knutsToCurrency, currencyToKnuts, formatCurrency } from '../utils';


interface DashboardProps {
  currentUser: User;
  users: User[];
  transactions: Transaction[];
  onSendMoney: (receiverId: string, amountInKnuts: number) => void;
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
}> = ({ user, onClose, onSave, onDelete }) => {
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
                <>
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-3"><UserEditIcon /> Nutzer bearbeiten</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium opacity-80 mb-1">Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} className={commonInputStyles} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium opacity-80 mb-1">Haus</label>
                            <select value={house} onChange={e => setHouse(e.target.value as House)} className={commonInputStyles}>
                                {Object.values(House).map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium opacity-80 mb-1">Kontostand</label>
                            <div className="grid grid-cols-3 gap-2">
                                <input type="number" value={galleons} onChange={e => setGalleons(e.target.value)} min="0" placeholder="Galleonen" className={`${commonInputStyles} text-center`} />
                                <input type="number" value={sickles} onChange={e => setSickles(e.target.value)} min="0" placeholder="Sickel" className={`${commonInputStyles} text-center`} />
                                <input type="number" value={knuts} onChange={e => setKnuts(e.target.value)} min="0" placeholder="Knuts" className={`${commonInputStyles} text-center`} />
                            </div>
                        </div>
                         {error && <p className="text-red-400 text-sm">{error}</p>}
                        <div className="flex gap-4 pt-4">
                           <button onClick={() => setShowConfirmDelete(true)} className="w-1/3 text-white bg-red-600/80 hover:bg-red-600 font-bold rounded-full text-base px-5 text-center h-12 transition-colors flex items-center justify-center gap-2">
                                <TrashIcon className="w-5 h-5" /> Löschen
                            </button>
                            <button onClick={handleSave} className="w-2/3 text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base px-5 text-center h-12 transition-colors">
                                Speichern
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    </div>
  )
}


const houseTextColors: { [key: string]: string } = {
  Gryffindor: 'text-red-400',
  Hufflepuff: 'text-yellow-300',
  Ravenclaw: 'text-blue-400',
  Slytherin: 'text-green-400',
};

const houseBgColors: { [key: string]: string } = {
  Gryffindor: 'bg-red-700',
  Hufflepuff: 'bg-yellow-500',
  Ravenclaw: 'bg-blue-800',
  Slytherin: 'bg-green-700',
};

const houseBorderColors: { [key: string]: string } = {
  Gryffindor: 'border-red-500',
  Hufflepuff: 'border-yellow-400',
  Ravenclaw: 'border-blue-500',
  Slytherin: 'border-green-500',
};

const houseDotColors: { [key: string]: string } = {
    Gryffindor: 'bg-red-500',
    Hufflepuff: 'bg-yellow-400',
    Ravenclaw: 'bg-blue-500',
    Slytherin: 'bg-green-500',
};

const HouseDot: React.FC<{ house?: string }> = ({ house }) => {
    if (!house || !houseDotColors[house]) return null;
    return <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle ${houseDotColors[house]}`}></span>;
}

const commonInputStyles = "w-full p-3 bg-black/20 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow text-base";
const containerStyles = "bg-[#FFFFFF21] rounded-3xl p-6 border border-[#FFFFFF59]";

const Dashboard: React.FC<DashboardProps> = ({ currentUser, users, transactions, onSendMoney, isKing = false, globalTransactions = [], onUpdateUser, onSoftDeleteUser, onRestoreUser }) => {
  const [receiverId, setReceiverId] = useState('');
  const [galleons, setGalleons] = useState<string>('');
  const [sickles, setSickles] = useState<string>('');
  const [knuts, setKnuts] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeView, setActiveView] = useState<'user' | 'king' | 'deleted'>('user');
  const [editingUser, setEditingUser] = useState<User | null>(null);


  const handleSendMoney = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!receiverId) {
      setError('Bitte wähle einen Empfänger.');
      return;
    }

    const amountInKnuts = currencyToKnuts({
      galleons: parseInt(galleons) || 0,
      sickles: parseInt(sickles) || 0,
      knuts: parseInt(knuts) || 0,
    });

    if (amountInKnuts <= 0) {
      setError('Der Betrag muss größer als Null sein.');
      return;
    }
    if (amountInKnuts > currentUser.balance) {
      setError('Nicht genügend Guthaben vorhanden.');
      return;
    }

    try {
        await onSendMoney(receiverId, amountInKnuts);
        setSuccess(`${formatCurrency(amountInKnuts)} erfolgreich gesendet!`);
        setReceiverId('');
        setGalleons('');
        setSickles('');
        setKnuts('');
        setTimeout(() => setSuccess(''), 4000);
    } catch(e: any) {
        setError(e.message || 'Senden fehlgeschlagen.');
    }
  };

  const userTransactions = transactions
    .filter(t => t.sender_id === currentUser.id || t.receiver_id === currentUser.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const activeUsers = users.filter(u => !u.is_deleted);
  const deletedUsers = users.filter(u => u.is_deleted);
  const otherUsers = activeUsers.filter(u => u.id !== currentUser.id);

  const { galleons: balanceG, sickles: balanceS, knuts: balanceK } = knutsToCurrency(currentUser.balance);

  const KingAllUsersView = () => (
    <div>
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-3"><UsersIcon /> Alle aktiven Nutzer</h3>
        <div className="overflow-y-auto max-h-[65vh] pr-2 space-y-2">
          {activeUsers.map(user => (
            <button key={user.id} 
              onClick={() => user.id !== currentUser.id && setEditingUser(user)}
              className={`w-full bg-black/30 p-3 rounded-xl flex justify-between items-center text-left ${user.id !== currentUser.id ? 'hover:bg-black/50 transition-colors cursor-pointer' : 'cursor-default'}`}
              disabled={user.id === currentUser.id}
              aria-label={`Nutzer ${user.name} bearbeiten`}
            >
              <div>
                <p className={`font-semibold ${houseTextColors[user.house]}`}>
                  <HouseDot house={user.house} />
                  {user.name} {user.id === currentUser.id && <span className="text-xs opacity-70">(Du)</span>}
                </p>
                <p className="text-xs opacity-70 ml-[18px]">{user.house}</p>
              </div>
              <p className="font-bold text-lg">{formatCurrency(user.balance)}</p>
            </button>
          ))}
        </div>
    </div>
  );
  
  const KingDeletedUsersView = () => (
      <div>
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-3"><TrashIcon /> Gelöschte Nutzer</h3>
        {deletedUsers.length > 0 ? (
            <div className="overflow-y-auto max-h-[65vh] pr-2 space-y-2">
            {deletedUsers.map(user => (
                <div key={user.id} className="bg-black/30 p-3 rounded-xl flex justify-between items-center">
                <div>
                    <p className={`font-semibold ${houseTextColors[user.house]}`}>
                    <HouseDot house={user.house} />
                    {user.name}
                    </p>
                    <p className="text-xs opacity-70 ml-[18px]">{user.house}</p>
                </div>
                <button 
                    onClick={() => onRestoreUser(user.id)}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full transition-colors text-sm"
                >
                    <RestoreIcon className="w-4 h-4" /> Wiederherstellen
                </button>
                </div>
            ))}
            </div>
        ) : (
            <p className="opacity-70 text-center py-8">Keine gelöschten Nutzer.</p>
        )}
      </div>
  );

  const KingGlobalTransactionsView = () => (
    <div>
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-3"><HistoryIcon /> Alle Transaktionen</h3>
        <div className="overflow-y-auto max-h-[65vh] pr-2 space-y-2">
          {globalTransactions.map(t => (
            <li key={t.id} className="bg-black/30 p-3 rounded-xl flex justify-between items-center list-none">
              <div>
                <p className="font-semibold text-sm">
                  <span className={`inline-flex items-center ${t.sender?.house && houseTextColors[t.sender.house]}`}>
                    <HouseDot house={t.sender?.house} />
                    {t.sender?.name || 'Unbekannt'}
                  </span>
                  <span className="opacity-70 mx-1">→</span>
                  <span className={`inline-flex items-center ${t.receiver?.house && houseTextColors[t.receiver.house]}`}>
                    <HouseDot house={t.receiver?.house} />
                    {t.receiver?.name || 'Unbekannt'}
                  </span>
                </p>
                <p className="text-xs opacity-70">{new Date(t.created_at).toLocaleString('de-DE')}</p>
              </div>
              <p className="font-bold">{formatCurrency(t.amount)}</p>
            </li>
          ))}
        </div>
    </div>
  );

  return (
    <>
    {editingUser && <UserEditModal user={editingUser} onClose={() => setEditingUser(null)} onSave={onUpdateUser} onDelete={onSoftDeleteUser} />}
    <div className="container mx-auto p-4 pt-24 md:pt-28">
      {isKing && (
        <div className="mb-6 flex justify-center">
          <div className="bg-[#FFFFFF21] p-1.5 rounded-full flex gap-1 sm:gap-2 flex-wrap justify-center">
            <button onClick={() => setActiveView('user')} className={`px-4 sm:px-6 py-2 rounded-full font-bold transition-colors ${activeView === 'user' ? 'bg-white text-black' : 'hover:bg-white/10'}`}>
              Mein Konto
            </button>
            <button onClick={() => setActiveView('king')} className={`px-4 sm:px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2 ${activeView === 'king' ? 'bg-white text-black' : 'hover:bg-white/10'}`}>
              <CrownIcon className="w-5 h-5" />
              Königliche Übersicht
            </button>
             <button onClick={() => setActiveView('deleted')} className={`px-4 sm:px-6 py-2 rounded-full font-bold transition-colors flex items-center gap-2 ${activeView === 'deleted' ? 'bg-white text-black' : 'hover:bg-white/10'}`}>
              <TrashIcon className="w-5 h-5" />
              Gelöschte Nutzer
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Balance and Send Money */}
        <div className="lg:col-span-1 space-y-8">
          <div className={containerStyles}>
            <div className="flex items-center gap-4 mb-4">
               <div 
                  className={`w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 ${houseBgColors[currentUser.house]} border-4 ${houseBorderColors[currentUser.house]}`}
                  aria-label={`Avatar für ${currentUser.name}`}
              >
                  <span className="text-4xl font-bold text-white select-none">{currentUser.name.charAt(0)}</span>
              </div>
              <div>
                <h2 className={`text-3xl sm:text-[2.25rem] font-bold mb-1 leading-tight ${houseTextColors[currentUser.house]}`}>{currentUser.name}</h2>
                <p className="opacity-80">{currentUser.house}</p>
              </div>
            </div>
            
            <div className="text-center bg-black/30 p-6 rounded-2xl">
                <p className="opacity-80 text-sm">Aktueller Kontostand</p>
                <p className="text-4xl sm:text-5xl font-black text-white tracking-wider">
                    {balanceG.toLocaleString()} <span className="text-2xl sm:text-3xl opacity-80 font-semibold">G</span>
                </p>
                <div className="flex justify-center gap-6 mt-2">
                    <p className="text-xl sm:text-2xl font-bold text-white/80 tracking-wider">
                        {balanceS} <span className="text-lg sm:text-xl opacity-80 font-semibold">S</span>
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-white/80 tracking-wider">
                        {balanceK} <span className="text-lg sm:text-xl opacity-80 font-semibold">K</span>
                    </p>
                </div>
            </div>
          </div>

          <div className={containerStyles}>
            <h2 className="text-3xl sm:text-[2.25rem] font-bold mb-4 flex items-center gap-3 leading-tight"><SendIcon /> Galleonen Senden</h2>
            <form onSubmit={handleSendMoney} className="space-y-4">
              <div>
                <label htmlFor="receiver" className="block text-sm font-medium opacity-80 mb-1">Empfänger</label>
                <select id="receiver" value={receiverId} onChange={(e) => setReceiverId(e.target.value)} className={commonInputStyles} required>
                  <option value="" disabled>Wähle einen Empfänger</option>
                  {otherUsers.map(user => (
                    <option key={user.id} value={user.id}>{user.name} ({user.house})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium opacity-80 mb-1">Betrag</label>
                <div className="grid grid-cols-3 gap-2">
                    <input type="number" value={galleons} onChange={e => setGalleons(e.target.value)} min="0" placeholder="Galleonen" className={`${commonInputStyles} text-center`} />
                    <input type="number" value={sickles} onChange={e => setSickles(e.target.value)} min="0" max="16" placeholder="Sickel" className={`${commonInputStyles} text-center`} />
                    <input type="number" value={knuts} onChange={e => setKnuts(e.target.value)} min="0" max="28" placeholder="Knuts" className={`${commonInputStyles} text-center`} />
                </div>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              {success && <p className="text-green-400 text-sm">{success}</p>}
              <button type="submit" className="w-full flex justify-center items-center gap-2 bg-white text-black font-bold py-2 px-4 rounded-full hover:bg-gray-200 transition-colors h-[3.75rem] text-base">
                Senden
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Transaction History / King Views */}
        <div className={`lg:col-span-2 ${containerStyles} min-h-[50vh]`}>
          {isKing && activeView === 'king' ? (
            <div className="space-y-8">
                <KingAllUsersView />
                <KingGlobalTransactionsView />
            </div>
          ) : isKing && activeView === 'deleted' ? (
            <KingDeletedUsersView />
          ) : (
            <>
              <h2 className="text-3xl sm:text-[2.25rem] font-bold mb-4 flex items-center gap-3 leading-tight"><HistoryIcon /> Transaktionen</h2>
              <div className="overflow-y-auto max-h-[50vh] lg:max-h-[65vh] pr-2">
                {userTransactions.length > 0 ? (
                  <ul className="space-y-3">
                    {userTransactions.map(t => {
                      const isSender = t.sender_id === currentUser.id;
                      const otherUser = isSender ? t.receiver : t.sender;
                      return (
                        <li key={t.id} className="bg-black/30 p-4 rounded-2xl flex justify-between items-center">
                          <div>
                            <p className="font-semibold">
                              {isSender ? 'An ' : 'Von '}
                              <span className={`inline-flex items-center ${otherUser?.house && houseTextColors[otherUser.house]}`}>
                                <HouseDot house={otherUser?.house} />
                                {otherUser?.name || 'Unbekannt'}
                              </span>
                            </p>
                            <p className="text-xs opacity-70">{new Date(t.created_at).toLocaleString('de-DE')}</p>
                          </div>
                          <p className={`font-bold text-lg ${isSender ? 'text-red-400' : 'text-green-400'}`}>
                            {isSender ? '-' : '+'} {formatCurrency(t.amount)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="opacity-70 text-center py-8">Keine Transaktionen vorhanden.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default Dashboard;