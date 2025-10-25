import React, { useState } from 'react';
import type { User, Transaction } from '../types';
import { House } from '../types';
import { UsersIcon, HistoryIcon, PinIcon, EditIcon, TrashIcon, ShieldCheckIcon, PlusCircleIcon } from './icons';
import { currencyToKnuts, knutsToCurrency, formatCurrency } from '../utils';

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  transactions: Transaction[];
  onUpdateBalance: (userId: string, newBalanceInKnuts: number) => Promise<void>;
  onUpdateUser: (userId: string, data: { name: string; house: House }) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onToggleAdmin: (userId: string, currentAdminStatus: boolean) => Promise<void>;
  onAdminCreateTransaction: (senderId: string, receiverId: string, amountInKnuts: number) => Promise<void>;
  onDeleteTransaction: (transactionId: string) => Promise<void>;
}

interface EditableBalance {
  [userId: string]: {
    g: string;
    s: string;
    k: string;
  };
}

const pinnedNames = ['Lusa-Luca', 'Kingsley'];
const containerStyles = "bg-[#FFFFFF21] rounded-3xl p-6 border border-[#FFFFFF59]";
const commonInputStyles = "w-full bg-black/20 border border-white/20 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow text-base p-2 text-center";
const modalInputStyles = "w-full p-3 bg-black/20 border border-white/30 rounded-xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow text-base";

const houseTextColors: { [key: string]: string } = {
  Gryffindor: 'text-red-400',
  Hufflepuff: 'text-yellow-300',
  Ravenclaw: 'text-blue-400',
  Slytherin: 'text-green-400',
};

const houseBorderColors: { [key: string]: string } = {
    Gryffindor: 'border-red-600',
    Hufflepuff: 'border-yellow-400',
    Ravenclaw: 'border-blue-600',
    Slytherin: 'border-green-600',
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


const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, users, transactions, onUpdateBalance, onUpdateUser, onDeleteUser, onToggleAdmin, onAdminCreateTransaction, onDeleteTransaction }) => {
  const [editableBalances, setEditableBalances] = useState<EditableBalance>({});
  
  // Modal States
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToToggleAdmin, setUserToToggleAdmin] = useState<User | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [showCreateTransaction, setShowCreateTransaction] = useState(false);

  // Form states
  const [editName, setEditName] = useState('');
  const [editHouse, setEditHouse] = useState<House>(House.Gryffindor);
  const [createTxSender, setCreateTxSender] = useState('');
  const [createTxReceiver, setCreateTxReceiver] = useState('');
  const [createTxG, setCreateTxG] = useState('');
  const [createTxS, setCreateTxS] = useState('');
  const [createTxK, setCreateTxK] = useState('');
  const [createTxError, setCreateTxError] = useState('');


  // --- Handlers ---

  const handleBalanceChange = (userId: string, field: 'g' | 's' | 'k', value: string) => {
    setEditableBalances(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleBalanceUpdate = async (userId: string) => {
    const balanceInput = editableBalances[userId];
    if (balanceInput) {
      const newBalanceInKnuts = currencyToKnuts({
        galleons: parseInt(balanceInput.g) || 0,
        sickles: parseInt(balanceInput.s) || 0,
        knuts: parseInt(balanceInput.k) || 0,
      });
      if (!isNaN(newBalanceInKnuts) && newBalanceInKnuts >= 0) {
        await onUpdateBalance(userId, newBalanceInKnuts);
        setEditableBalances(prev => ({ ...prev, [userId]: { g: '', s: '', k: '' } }));
      }
    }
  };

  const openEditModal = (user: User) => {
    setUserToEdit(user);
    setEditName(user.name);
    setEditHouse(user.house);
  }

  const handleUserUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if(userToEdit) {
      await onUpdateUser(userToEdit.id, { name: editName, house: editHouse });
      setUserToEdit(null);
    }
  }

  const handleAdminCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateTxError('');
    if (!createTxSender || !createTxReceiver) {
      setCreateTxError('Bitte Absender und Empfänger auswählen.');
      return;
    }
    if (createTxSender === createTxReceiver) {
      setCreateTxError('Absender und Empfänger dürfen nicht identisch sein.');
      return;
    }
    const amount = currencyToKnuts({ galleons: parseInt(createTxG) || 0, sickles: parseInt(createTxS) || 0, knuts: parseInt(createTxK) || 0 });
    if (amount <= 0) {
      setCreateTxError('Betrag muss größer als 0 sein.');
      return;
    }
    try {
      await onAdminCreateTransaction(createTxSender, createTxReceiver, amount);
      setShowCreateTransaction(false);
      setCreateTxSender(''); setCreateTxReceiver(''); setCreateTxG(''); setCreateTxS(''); setCreateTxK('');
    } catch (err: any) {
      setCreateTxError(err.message);
    }
  }

  const allTransactions = [...transactions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const pinnedUsers = users.filter(u => pinnedNames.includes(u.name))
                         .sort((a, b) => pinnedNames.indexOf(a.name) - pinnedNames.indexOf(b.name));
  const otherUsers = users.filter(u => !pinnedNames.includes(u.name)).sort((a,b) => a.name.localeCompare(b.name));
  const sortedUsers = [...pinnedUsers, ...otherUsers];


  // FIX: Changed component definition to use React.FC to fix typing issue with the 'key' prop.
  const UserCard: React.FC<{ user: User }> = ({ user }) => {
    const { galleons, sickles, knuts } = knutsToCurrency(user.balance);
    const userBalanceInput = editableBalances[user.id] || { g: '', s: '', k: '' };
    const isCurrentUser = user.id === currentUser.id;
    const isLusaLucaTargetedByKingsley = currentUser.name === 'Kingsley' && user.name === 'Lusa-Luca';


    return (
      <div className={`p-4 rounded-2xl border-l-4 ${pinnedNames.includes(user.name) ? 'bg-black/50' : 'bg-black/30'} ${houseBorderColors[user.house]}`}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-semibold flex items-center gap-2">
              {pinnedNames.includes(user.name) && <PinIcon className="w-4 h-4 text-yellow-300" />}
              <span className={`inline-flex items-center ${houseTextColors[user.house]}`}>
                <HouseDot house={user.house} />
                {user.name}
              </span>
              {user.is_admin && <ShieldCheckIcon className="w-5 h-5 text-blue-400" title="Admin" />}
            </p>
            <p className="text-sm opacity-70">{user.house}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg text-white">{galleons.toLocaleString()} <span className="opacity-80 text-base">G</span></p>
            <p className="font-semibold text-sm text-white/80">{sickles} <span className="opacity-80">S</span>, {knuts} <span className="opacity-80">K</span></p>
          </div>
        </div>
        <div className="space-y-3 mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-grow grid grid-cols-3 gap-2">
                <input type="number" disabled={isLusaLucaTargetedByKingsley} value={userBalanceInput.g} onChange={(e) => handleBalanceChange(user.id, 'g', e.target.value)} placeholder="G" min="0" className={`${commonInputStyles} disabled:opacity-50 disabled:cursor-not-allowed`} />
                <input type="number" disabled={isLusaLucaTargetedByKingsley} value={userBalanceInput.s} onChange={(e) => handleBalanceChange(user.id, 's', e.target.value)} placeholder="S" min="0" max="16" className={`${commonInputStyles} disabled:opacity-50 disabled:cursor-not-allowed`} />
                <input type="number" disabled={isLusaLucaTargetedByKingsley} value={userBalanceInput.k} onChange={(e) => handleBalanceChange(user.id, 'k', e.target.value)} placeholder="K" min="0" max="28" className={`${commonInputStyles} disabled:opacity-50 disabled:cursor-not-allowed`} />
              </div>
              <button disabled={isLusaLucaTargetedByKingsley} onClick={() => handleBalanceUpdate(user.id)} className="bg-white text-black font-bold py-2 px-3 rounded-full hover:bg-gray-200 transition-colors text-sm self-stretch disabled:opacity-50 disabled:cursor-not-allowed">Speichern</button>
            </div>
            <div className="flex justify-end items-center gap-2">
                <button disabled={isLusaLucaTargetedByKingsley} onClick={() => openEditModal(user)} className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Nutzer bearbeiten"><EditIcon className="w-4 h-4" /></button>
                <button disabled={isCurrentUser || isLusaLucaTargetedByKingsley} onClick={() => setUserToToggleAdmin(user)} className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Admin-Status ändern"><ShieldCheckIcon className="w-4 h-4" /></button>
                <button disabled={isCurrentUser || isLusaLucaTargetedByKingsley} onClick={() => setUserToDelete(user)} className="p-2 rounded-full bg-black/30 hover:bg-red-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Nutzer löschen"><TrashIcon className="w-4 h-4" /></button>
            </div>
        </div>
      </div>
    );
  }

  // FIX: Changed component definition to use React.FC to fix typing issue with the 'children' prop.
  const Modal: React.FC<{ children: React.ReactNode, onClose: () => void }> = ({ children, onClose }) => (
     <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#2a2a2a] rounded-3xl p-8 border border-[#FFFFFF59] max-w-md w-full" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
  );

  return (
    <>
      {/* --- Modals --- */}
      {userToEdit && (
        <Modal onClose={() => setUserToEdit(null)}>
            <h3 className="text-xl font-bold mb-4">Nutzer bearbeiten: {userToEdit.name}</h3>
            <form onSubmit={handleUserUpdate} className="space-y-4">
                 <div>
                  <label htmlFor="edit-name" className="block mb-1 text-sm font-medium opacity-80">Name</label>
                  <input id="edit-name" type="text" value={editName} onChange={e => setEditName(e.target.value)} className={modalInputStyles} required />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium opacity-80">Haus</label>
                    <select value={editHouse} onChange={e => setEditHouse(e.target.value as House)} className={modalInputStyles}>
                        {Object.values(House).map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setUserToEdit(null)} className="font-bold rounded-full text-base px-5 text-center h-12">Abbrechen</button>
                    <button type="submit" className="text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base px-5 text-center h-12">Speichern</button>
                </div>
            </form>
        </Modal>
      )}

      {userToDelete && (
        <Modal onClose={() => setUserToDelete(null)}>
            <h3 className="text-xl font-bold mb-4">Nutzer löschen</h3>
            <p className="opacity-80 mb-6">Möchtest du <span className="font-bold">{userToDelete.name}</span> wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
            <div className="flex justify-end gap-3">
                 <button onClick={() => setUserToDelete(null)} className="font-bold rounded-full text-base px-5 text-center h-12">Abbrechen</button>
                 <button onClick={async () => { await onDeleteUser(userToDelete.id); setUserToDelete(null); }} className="text-white bg-red-600 hover:bg-red-700 font-bold rounded-full text-base px-5 text-center h-12">Löschen</button>
            </div>
        </Modal>
      )}
      
      {userToToggleAdmin && (
        <Modal onClose={() => setUserToToggleAdmin(null)}>
            <h3 className="text-xl font-bold mb-4">Admin-Status ändern</h3>
            <p className="opacity-80 mb-6">
                Möchtest du den Admin-Status für <span className="font-bold">{userToToggleAdmin.name}</span> wirklich {userToToggleAdmin.is_admin ? 'entziehen' : 'vergeben'}?
            </p>
            <div className="flex justify-end gap-3">
                 <button onClick={() => setUserToToggleAdmin(null)} className="font-bold rounded-full text-base px-5 text-center h-12">Abbrechen</button>
                 <button onClick={async () => { await onToggleAdmin(userToToggleAdmin.id, userToToggleAdmin.is_admin || false); setUserToToggleAdmin(null); }} className="text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base px-5 text-center h-12">Bestätigen</button>
            </div>
        </Modal>
      )}

      {transactionToDelete && (
        <Modal onClose={() => setTransactionToDelete(null)}>
             <h3 className="text-xl font-bold mb-4">Transaktion löschen</h3>
            <p className="opacity-80 mb-6">
                Möchtest du die Transaktion über <span className="font-bold">{formatCurrency(transactionToDelete.amount)}</span> von {transactionToDelete.sender?.name} an {transactionToDelete.receiver?.name} wirklich löschen?
            </p>
            <div className="flex justify-end gap-3">
                 <button onClick={() => setTransactionToDelete(null)} className="font-bold rounded-full text-base px-5 text-center h-12">Abbrechen</button>
                 <button onClick={async () => { await onDeleteTransaction(transactionToDelete.id); setTransactionToDelete(null); }} className="text-white bg-red-600 hover:bg-red-700 font-bold rounded-full text-base px-5 text-center h-12">Löschen</button>
            </div>
        </Modal>
      )}

      {showCreateTransaction && (
         <Modal onClose={() => setShowCreateTransaction(false)}>
            <h3 className="text-xl font-bold mb-4">Manuelle Transaktion erstellen</h3>
            <form onSubmit={handleAdminCreateTx} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium opacity-80 mb-1">Absender</label>
                    <select value={createTxSender} onChange={e => setCreateTxSender(e.target.value)} className={modalInputStyles} required>
                        <option value="" disabled>Wähle einen Absender</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium opacity-80 mb-1">Empfänger</label>
                    <select value={createTxReceiver} onChange={e => setCreateTxReceiver(e.target.value)} className={modalInputStyles} required>
                        <option value="" disabled>Wähle einen Empfänger</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium opacity-80 mb-1">Betrag</label>
                    <div className="grid grid-cols-3 gap-2">
                        <input type="number" value={createTxG} onChange={e => setCreateTxG(e.target.value)} min="0" placeholder="Galleonen" className={`${modalInputStyles} text-center`} />
                        <input type="number" value={createTxS} onChange={e => setCreateTxS(e.target.value)} min="0" max="16" placeholder="Sickel" className={`${modalInputStyles} text-center`} />
                        <input type="number" value={createTxK} onChange={e => setCreateTxK(e.target.value)} min="0" max="28" placeholder="Knuts" className={`${modalInputStyles} text-center`} />
                    </div>
                </div>
                 {createTxError && <p className="text-red-400 text-sm text-center">{createTxError}</p>}
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowCreateTransaction(false)} className="font-bold rounded-full text-base px-5 text-center h-12">Abbrechen</button>
                    <button type="submit" className="text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base px-5 text-center h-12">Transaktion ausführen</button>
                </div>
            </form>
         </Modal>
      )}


      {/* --- Main Panel --- */}
      <div className="container mx-auto p-4 pt-28">
        <h1 className="text-[3.25rem] font-black mb-8 leading-tight">Admin Panel</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={containerStyles}>
            <h2 className="text-[2.25rem] font-bold mb-4 flex items-center gap-3 leading-tight"><UsersIcon /> Nutzerverwaltung</h2>
            <div className="overflow-y-auto max-h-[65vh] pr-2 space-y-3">
              {sortedUsers.map(user => <UserCard key={user.id} user={user} />)}
            </div>
          </div>

          <div className="space-y-8">
            <div className={containerStyles}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[2.25rem] font-bold flex items-center gap-3 leading-tight"><HistoryIcon /> Globale Transaktionen</h2>
                    <button onClick={() => setShowCreateTransaction(true)} className="p-2 rounded-full bg-black/30 hover:bg-black/50 transition-colors" aria-label="Neue Transaktion erstellen"><PlusCircleIcon/></button>
                </div>
                <div className="overflow-y-auto max-h-[65vh] pr-2">
                  {allTransactions.length > 0 ? (
                    <ul className="space-y-3">
                      {allTransactions.map(t => (
                        <li key={t.id} className="bg-black/30 p-4 rounded-2xl">
                          <div className="flex justify-between items-center">
                              <div>
                                  <p className="font-semibold text-sm">
                                      <span className={`inline-flex items-center ${t.sender?.house && houseTextColors[t.sender.house]}`}>
                                        <HouseDot house={t.sender?.house} />
                                        {t.sender?.name || 'Unbekannt'}
                                      </span>
                                      <span className="mx-1.5 opacity-80">→</span>
                                      <span className={`inline-flex items-center ${t.receiver?.house && houseTextColors[t.receiver.house]}`}>
                                        <HouseDot house={t.receiver?.house} />
                                        {t.receiver?.name || 'Unbekannt'}
                                      </span>
                                  </p>
                                  <p className="text-xs opacity-70">{new Date(t.created_at).toLocaleString('de-DE')}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="font-bold text-white text-right">{formatCurrency(t.amount)}</p>
                                <button onClick={() => setTransactionToDelete(t)} className="p-2 rounded-full hover:bg-red-500/50 transition-colors" aria-label="Transaktion löschen"><TrashIcon className="w-4 h-4 text-white/70" /></button>
                              </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="opacity-70 text-center py-8">Keine Transaktionen vorhanden.</p>
                  )}
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminPanel;