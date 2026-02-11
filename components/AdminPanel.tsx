
import React, { useState } from 'react';
import { User, Transaction, House } from '../types';
import { knutsToCanonical, currencyToKnuts } from '../utils';
import { TrashIcon, RestoreIcon, UserEditIcon, AdminIcon, HistoryIcon, SendIcon } from './icons';

interface AdminViewProps {
  currentUser: User;
  users: User[];
  globalTransactions: Transaction[];
  onUpdateUser: (userId: string, updates: { name: string; house: House; balance: number, is_admin: boolean }) => Promise<void>;
  onSoftDeleteUser: (userId: string) => Promise<void>;
  onRestoreUser: (userId: string) => Promise<void>;
}

const houseColors: { [key: string]: string } = {
    Gryffindor: 'text-[#FF5C5C]',
    Hufflepuff: 'text-[#FFD700]',
    Ravenclaw: 'text-[#4DA6FF]',
    Slytherin: 'text-[#2ECC71]',
};

const houseBorderColors: { [key: string]: string } = {
    Gryffindor: 'border-l-[#FF5C5C]',
    Hufflepuff: 'border-l-[#FFD700]',
    Ravenclaw: 'border-l-[#4DA6FF]',
    Slytherin: 'border-l-[#2ECC71]',
};

const AdminView: React.FC<AdminViewProps> = ({ 
    users, 
    globalTransactions,
    onUpdateUser, onSoftDeleteUser, onRestoreUser 
}) => {
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({ name: '', house: House.Gryffindor, g: 0, s: 0, k: 0, is_admin: false });
    const [showDeleted, setShowDeleted] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [historySearch, setHistorySearch] = useState('');

    const sortedUsers = [...users]
        .filter(u => showDeleted ? true : !u.is_deleted)
        .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    const filteredHistory = globalTransactions
        .filter(t => {
            const search = historySearch.toLowerCase();
            const senderName = t.sender?.name?.toLowerCase() || 'system';
            const receiverName = t.receiver?.name?.toLowerCase() || 'system';
            const note = t.note?.toLowerCase() || '';
            return senderName.includes(search) || receiverName.includes(search) || note.includes(search);
        });

    const handleEditClick = (user: User) => {
        const c = knutsToCanonical(user.balance);
        setEditingUser(user);
        setEditForm({ 
            name: user.name, 
            house: user.house, 
            g: c.galleons, 
            s: c.sickles, 
            k: c.knuts,
            is_admin: !!user.is_admin
        });
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        const totalKnuts = currencyToKnuts({ galleons: editForm.g, sickles: editForm.s, knuts: editForm.k });
        await onUpdateUser(editingUser.id, { name: editForm.name, house: editForm.house, balance: totalKnuts, is_admin: editForm.is_admin });
        setEditingUser(null);
    };

    return (
        <div className="space-y-8 pb-10">
            {/* NUTZER-VERWALTUNG */}
             <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/20">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl md:text-3xl font-bold">Nutzer-Verwaltung</h2>
                    <div className="flex items-center gap-2 text-xs opacity-60">
                         <span>Gelöschte anzeigen</span>
                         <button onClick={() => setShowDeleted(!showDeleted)} className={`w-8 h-4 rounded-full p-0.5 transition-colors ${showDeleted ? 'bg-green-500' : 'bg-white/20'}`}>
                             <div className={`w-3 h-3 rounded-full bg-white transition-transform ${showDeleted ? 'translate-x-4' : 'translate-x-0'}`} />
                         </button>
                    </div>
                </div>
                <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Nutzer suchen..." className="w-full p-3 bg-black border border-white/10 rounded-xl mb-6 focus:outline-none focus:border-white/30 transition-all" />

                {editingUser && (
                    <div className="mb-8 p-6 bg-blue-500/10 rounded-2xl border border-blue-500/30 space-y-4 animate-fadeIn">
                        <h3 className="font-bold text-blue-300">Profil bearbeiten: {editingUser.name}</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input value={editForm.name} onChange={e=>setEditForm({...editForm, name: e.target.value})} className="p-3 bg-black border border-white/20 rounded-xl" />
                            <select value={editForm.house} onChange={e=>setEditForm({...editForm, house: e.target.value as House})} className="p-3 bg-black border border-white/20 rounded-xl">
                                {Object.values(House).map(h=><option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                            <span className="text-sm">Admin-Status (is_admin)</span>
                            <button onClick={() => setEditForm({...editForm, is_admin: !editForm.is_admin})} className={`w-12 h-6 rounded-full p-1 ${editForm.is_admin ? 'bg-yellow-500' : 'bg-white/20'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${editForm.is_admin ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <input type="number" value={editForm.g} onChange={e => setEditForm({ ...editForm, g: parseInt(e.target.value) || 0 })} className="p-3 bg-black border border-white/20 rounded-xl text-center" placeholder="G" />
                            <input type="number" value={editForm.s} onChange={e => setEditForm({ ...editForm, s: parseInt(e.target.value) || 0 })} className="p-3 bg-black border border-white/20 rounded-xl text-center" placeholder="S" />
                            <input type="number" value={editForm.k} onChange={e => setEditForm({ ...editForm, k: parseInt(e.target.value) || 0 })} className="p-3 bg-black border border-white/20 rounded-xl text-center" placeholder="K" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSaveUser} className="flex-1 bg-green-500 text-black py-3 rounded-xl font-bold">Speichern</button>
                            <button onClick={()=>setEditingUser(null)} className="flex-1 bg-white/10 py-3 rounded-xl">Abbrechen</button>
                        </div>
                    </div>
                )}
                
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {sortedUsers.map(u => {
                         const c = knutsToCanonical(u.balance);
                         const houseColorClass = houseColors[u.house] || 'text-white';
                         const houseBorderClass = houseBorderColors[u.house] || 'border-l-transparent';
                         
                         return (
                            <div key={u.id} className={`flex items-center justify-between p-3 rounded-xl border-t border-r border-b border-white/10 bg-white/5 border-l-4 ${houseBorderClass} ${u.is_deleted ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                                <div className="flex items-center gap-3">
                                    {u.is_admin && <AdminIcon className="w-4 h-4 text-yellow-500 shrink-0" />}
                                    <div>
                                        <p className={`font-bold ${houseColorClass}`}>{u.name}</p>
                                        <p className="text-[10px] opacity-60">
                                            {c.galleons}G {c.sickles}S {c.knuts}K • <span className={houseColorClass}>{u.house}</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <button onClick={()=>handleEditClick(u)} className="p-2 hover:bg-white/10 rounded-lg"><UserEditIcon className="w-5 h-5"/></button>
                                     <button onClick={()=>u.is_deleted ? onRestoreUser(u.id) : onSoftDeleteUser(u.id)} className="p-2 hover:bg-white/10 rounded-lg">
                                        {u.is_deleted ? <RestoreIcon className="w-5 h-5 text-green-400"/> : <TrashIcon className="w-5 h-5 text-red-400"/>}
                                     </button>
                                </div>
                            </div>
                         )
                    })}
                </div>
            </div>

            {/* ADMIN-VERLAUF (NEU) */}
            <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/20">
                <div className="flex items-center gap-3 mb-6">
                    <HistoryIcon className="w-8 h-8 text-white/80" />
                    <h2 className="text-2xl md:text-3xl font-bold">Admin-Verlauf</h2>
                </div>
                
                <input 
                    value={historySearch} 
                    onChange={e => setHistorySearch(e.target.value)} 
                    placeholder="Verlauf durchsuchen (Name, Notiz)..." 
                    className="w-full p-3 bg-black border border-white/10 rounded-xl mb-6 focus:outline-none focus:border-white/30 transition-all" 
                />

                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {filteredHistory.length === 0 ? (
                        <p className="text-center p-10 text-white/30">Keine Transaktionen gefunden.</p>
                    ) : (
                        filteredHistory.map(t => {
                            const c = knutsToCanonical(t.amount);
                            const date = new Date(t.created_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                            const isBetWin = t.note?.startsWith('Wettgewinn');
                            const isBetStake = t.note?.startsWith('Wetteinsatz');
                            
                            // Styling Helfer
                            const senderHouse = t.sender?.house as House;
                            const receiverHouse = t.receiver?.house as House;

                            return (
                                <div key={t.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white/10 p-2 rounded-full shrink-0">
                                            <SendIcon className="w-4 h-4 text-white/60" />
                                        </div>
                                        <div className="text-sm">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                <span className={`font-bold ${houseColors[senderHouse] || 'text-white/40'}`}>
                                                    {t.sender?.name || 'Wettbüro'}
                                                </span>
                                                <span className="text-white/30">➜</span>
                                                <span className={`font-bold ${houseColors[receiverHouse] || 'text-white/40'}`}>
                                                    {t.receiver?.name || 'Wettbüro'}
                                                </span>
                                            </div>
                                            {t.note && <p className="text-white/50 italic text-xs mt-1">{t.note}</p>}
                                            <p className="text-[10px] text-white/20 mt-1 uppercase tracking-widest">{date}</p>
                                        </div>
                                    </div>
                                    <div className={`text-right font-mono font-bold whitespace-nowrap text-sm ${isBetWin ? 'text-green-400' : isBetStake ? 'text-yellow-400' : 'text-blue-400'}`}>
                                        {c.galleons > 0 && `${c.galleons}G `}{c.sickles > 0 && `${c.sickles}S `}{c.knuts > 0 && `${c.knuts}K`}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminView;
