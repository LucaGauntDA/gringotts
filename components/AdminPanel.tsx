
import React, { useState } from 'react';
import { User, Transaction, House } from '../types';
import { knutsToCanonical, currencyToKnuts } from '../utils';
import { TrashIcon, RestoreIcon, UserEditIcon, TrophyIcon, BanknotesIcon, SendIcon } from './icons';

interface AdminViewProps {
  currentUser: User;
  users: User[];
  globalTransactions: Transaction[];
  onUpdateUser: (userId: string, updates: { name: string; house: House; balance: number }) => Promise<void>;
  onSoftDeleteUser: (userId: string) => Promise<void>;
  onRestoreUser: (userId: string) => Promise<void>;
}

const AdminView: React.FC<AdminViewProps> = ({ users, globalTransactions, onUpdateUser, onSoftDeleteUser, onRestoreUser }) => {
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: '', house: House.Gryffindor, g: 0, s: 0, k: 0 });
    const [showDeleted, setShowDeleted] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [transFilter, setTransFilter] = useState<'all'|'transfers'|'admin'>('all');
    const [transSearch, setTransSearch] = useState('');

    const sortedUsers = [...users]
        .filter(u => showDeleted ? true : !u.is_deleted)
        .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const filteredTransactions = globalTransactions
        .filter(t => {
            if (transFilter === 'transfers') return !t.note?.startsWith('ADMIN_BALANCE_CHANGE') && !t.note?.startsWith('Wettgewinn:') && !t.note?.startsWith('Wetteinsatz:');
            if (transFilter === 'admin') return t.note?.startsWith('ADMIN_BALANCE_CHANGE');
            return true;
        })
        .filter(t => {
            const searchLower = transSearch.toLowerCase();
            return t.sender?.name.toLowerCase().includes(searchLower) || 
                   t.receiver?.name.toLowerCase().includes(searchLower) ||
                   t.note?.toLowerCase().includes(searchLower);
        });

    const handleEditClick = (user: User) => {
        const c = knutsToCanonical(user.balance);
        setEditingUser(user);
        setEditForm({ 
            name: user.name, 
            house: user.house, 
            g: c.galleons, 
            s: c.sickles, 
            k: c.knuts 
        });
    };

    const handleSave = async () => {
        if (!editingUser) return;
        const totalKnuts = currencyToKnuts({ 
            galleons: editForm.g, 
            sickles: editForm.s, 
            knuts: editForm.k 
        });
        await onUpdateUser(editingUser.id, { 
            name: editForm.name, 
            house: editForm.house, 
            balance: totalKnuts 
        });
        setEditingUser(null);
    };

    return (
        <div className="space-y-8">
             <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/20">
                <h2 className="text-3xl font-bold mb-6">Admin Panel</h2>

                <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                             <h3 className="text-xl font-bold">Nutzer verwalten</h3>
                        </div>
                         <div className="flex items-center gap-2">
                             <span className="text-sm opacity-60">Gelöschte anzeigen</span>
                             <button onClick={() => setShowDeleted(!showDeleted)} className={`w-12 h-6 rounded-full p-1 transition-colors ${showDeleted ? 'bg-green-500' : 'bg-white/20'}`}>
                                 <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-transform ${showDeleted ? 'translate-x-6' : 'translate-x-0'}`} />
                             </button>
                         </div>
                    </div>
                    <input 
                        value={userSearch}
                        onChange={e => setUserSearch(e.target.value)}
                        placeholder="Nutzer suchen..."
                        className="w-full p-3 bg-black/50 border border-white/10 rounded-xl focus:outline-none focus:border-white/40"
                    />
                </div>

                {editingUser && (
                    <div className="mb-8 p-6 bg-blue-500/10 rounded-2xl border border-blue-500/30 animate-fadeIn">
                        <h3 className="font-bold mb-4 text-blue-300">Bearbeite {editingUser.name}</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs opacity-60 ml-1">Name</label>
                                    <input value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="w-full p-3 bg-black border border-white/20 rounded-xl focus:outline-none focus:border-blue-500/50" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs opacity-60 ml-1">Haus</label>
                                    <select value={editForm.house} onChange={e=>setEditForm({...editForm, house: e.target.value as House})} className="w-full p-3 bg-black border border-white/20 rounded-xl focus:outline-none focus:border-blue-500/50">
                                        {Object.values(House).map(h=><option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs opacity-60 ml-1">Kontostand anpassen</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <input 
                                            type="number" 
                                            value={editForm.g} 
                                            onChange={e => setEditForm({ ...editForm, g: Math.max(0, parseInt(e.target.value) || 0) })} 
                                            className="w-full p-3 bg-black border border-white/20 rounded-xl text-center focus:outline-none focus:border-yellow-500/50" 
                                            placeholder="G"
                                        />
                                        <p className="text-[10px] text-center mt-1 opacity-50 uppercase font-bold text-yellow-500">Galleonen</p>
                                    </div>
                                    <div>
                                        <input 
                                            type="number" 
                                            value={editForm.s} 
                                            onChange={e => setEditForm({ ...editForm, s: Math.max(0, parseInt(e.target.value) || 0) })} 
                                            className="w-full p-3 bg-black border border-white/20 rounded-xl text-center focus:outline-none focus:border-gray-400/50" 
                                            placeholder="S"
                                        />
                                        <p className="text-[10px] text-center mt-1 opacity-50 uppercase font-bold text-gray-400">Sickel</p>
                                    </div>
                                    <div>
                                        <input 
                                            type="number" 
                                            value={editForm.k} 
                                            onChange={e => setEditForm({ ...editForm, k: Math.max(0, parseInt(e.target.value) || 0) })} 
                                            className="w-full p-3 bg-black border border-white/20 rounded-xl text-center focus:outline-none focus:border-orange-700/50" 
                                            placeholder="K"
                                        />
                                        <p className="text-[10px] text-center mt-1 opacity-50 uppercase font-bold text-orange-700">Knuts</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={handleSave} className="flex-1 bg-green-500 text-black px-6 py-3 rounded-xl font-bold hover:bg-green-400 transition-colors">Speichern</button>
                            <button onClick={()=>setEditingUser(null)} className="flex-1 bg-white/10 px-6 py-3 rounded-xl hover:bg-white/20 transition-colors">Abbrechen</button>
                        </div>
                    </div>
                )}
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {sortedUsers.map(u => {
                         const c = knutsToCanonical(u.balance);
                         return (
                            <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border ${u.is_deleted ? 'border-red-500/30 bg-red-500/5 opacity-60' : 'border-white/10 bg-white/5'}`}>
                                <div>
                                    <p className="font-bold">{u.name}</p>
                                    <p className="text-sm opacity-60">{c.galleons}G, {c.sickles}S, {c.knuts}K - <span className={u.house === 'Gryffindor' ? 'text-red-400' : u.house === 'Slytherin' ? 'text-green-400' : u.house === 'Ravenclaw' ? 'text-blue-400' : 'text-yellow-400'}>{u.house}</span></p>
                                </div>
                                <div className="flex gap-2">
                                     <button onClick={()=>handleEditClick(u)} className="p-2 hover:bg-white/10 rounded-lg"><UserEditIcon className="w-5 h-5"/></button>
                                     {u.is_deleted ? (
                                        <button onClick={()=>onRestoreUser(u.id)} className="p-2 hover:bg-green-500/20 rounded-lg text-green-400"><RestoreIcon className="w-5 h-5"/></button>
                                    ) : (
                                        <button onClick={()=>onSoftDeleteUser(u.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><TrashIcon className="w-5 h-5"/></button>
                                    )}
                                </div>
                            </div>
                         )
                    })}
                </div>
            </div>

            <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/20">
                <h2 className="text-3xl font-bold mb-6">Alle Transaktionen</h2>
                
                <input 
                    value={transSearch} 
                    onChange={e => setTransSearch(e.target.value)} 
                    placeholder="Transaktionen nach Name, Betrag, Datum..." 
                    className="w-full p-3 bg-white/5 border border-white/20 rounded-xl mb-4 focus:outline-none focus:border-white/50"
                />

                <div className="flex flex-wrap gap-2 mb-6">
                    <button onClick={() => setTransFilter('all')} className={`px-4 py-2 rounded-full font-bold text-sm ${transFilter === 'all' ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>Alle</button>
                    <button onClick={() => setTransFilter('transfers')} className={`px-4 py-2 rounded-full font-bold text-sm ${transFilter === 'transfers' ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>Überweisungen</button>
                    <button onClick={() => setTransFilter('admin')} className={`px-4 py-2 rounded-full font-bold text-sm ${transFilter === 'admin' ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>Admin-Anpassungen</button>
                </div>

                <div className="space-y-2">
                    {filteredTransactions.slice(0, 50).map(t => {
                         const amountKnuts = t.amount;
                         const isBetWin = t.note?.startsWith('Wettgewinn:');
                         const isBetPlacement = t.note?.startsWith('Wetteinsatz:');
                         const isAdminAdjustment = t.note?.startsWith('ADMIN_BALANCE_CHANGE');
                         
                         let detailText = isAdminAdjustment ? 'System-Anpassung' : isBetWin ? 'Wettgewinn' : isBetPlacement ? 'Wetteinsatz' : '';
                         let labelText = isBetWin ? 'Wettbüro Auszahlung' : 
                                         isBetPlacement ? `Wette: ${t.receiver?.name || 'Bank'}` :
                                         isAdminAdjustment ? 'Admin Anpassung' : 
                                         `${t.sender?.name || 'Unbekannt'} → ${t.receiver?.name || 'Unbekannt'}`;
                         let displaySign = '';
                         let signColor = 'text-white';

                         if (isAdminAdjustment) {
                             if (t.note?.includes('ADMIN_BALANCE_CHANGE_V3')) {
                                 const parts = t.note.replace('ADMIN_BALANCE_CHANGE_V3: ', '').split('|');
                                 labelText = `Admin ${parts[0]} → ${parts[1]}`;
                                 const oldK = parseInt(parts[2]);
                                 const newK = parseInt(parts[3]);
                                 displaySign = newK >= oldK ? '+' : '-';
                                 signColor = newK >= oldK ? 'text-green-400' : 'text-red-400';
                                 detailText = 'Gezielte Kontostandsanpassung';
                             } else if (t.note?.includes('::')) {
                                 const parts = t.note.split('::');
                                 if (parts.length >= 5) {
                                     const oldK = parseInt(parts[3]);
                                     const newK = parseInt(parts[4]);
                                     displaySign = newK >= oldK ? '+' : '-';
                                     signColor = newK >= oldK ? 'text-green-400' : 'text-red-400';
                                 }
                             }
                         }

                         if (isBetWin) { signColor = 'text-green-400'; displaySign = '+'; }
                         else if (isBetPlacement) { signColor = 'text-red-400'; displaySign = '-'; }

                         const c = knutsToCanonical(amountKnuts);

                         return (
                            <div key={t.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                <div className="flex items-center gap-3 flex-1">
                                     <div className={`hidden sm:block p-2 rounded-full flex-shrink-0 ${isAdminAdjustment ? 'bg-yellow-500/20 text-yellow-400' : (isBetWin || isBetPlacement) ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {isBetWin || isBetPlacement ? <TrophyIcon className="w-4 h-4"/> : isAdminAdjustment ? <BanknotesIcon className="w-4 h-4"/> : <SendIcon className="w-4 h-4"/>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-blue-300 break-words">
                                            {labelText}
                                        </p>
                                        <p className="opacity-50 text-xs">{new Date(t.created_at).toLocaleString()}</p>
                                        {detailText && <p className="text-xs opacity-70 mt-1 italic">{detailText}</p>}
                                        {t.note && !t.note.startsWith('ADMIN_BALANCE_CHANGE') && <p className="text-xs opacity-70 mt-1 italic break-words leading-relaxed">"{t.note.split('|~|')[0]}"</p>}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className={`font-mono font-bold text-lg ${signColor}`}>{displaySign}{c.galleons} G, {c.sickles} S, {c.knuts} K</p>
                                </div>
                            </div>
                         )
                    })}
                    {filteredTransactions.length === 0 && <p className="opacity-50 text-center">Keine Transaktionen gefunden.</p>}
                </div>
            </div>
        </div>
    );
};

export default AdminView;
