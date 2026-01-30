
import React, { useState } from 'react';
import { User, Transaction, House, BettingEvent, Bet, BettingEventStatus } from '../types';
import { knutsToCanonical } from '../utils';
import { 
    SendIconSolid, TrophyIcon, HistoryIconSolid, AdminIconSolid, UserIconSolid, EyeIcon, EyeSlashIcon
} from './icons';
import AdminView from './AdminPanel';

interface DashboardProps {
    currentUser: User;
    users: User[];
    transactions: Transaction[];
    onSendMoney: (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => Promise<void>;
    isKing: boolean;
    kingEmails: string[];
    globalTransactions: Transaction[];
    onUpdateUser: (userId: string, updates: { name: string; house: House; balance: number }) => Promise<void>;
    onSoftDeleteUser: (userId: string) => Promise<void>;
    onRestoreUser: (userId: string) => Promise<void>;
    onUpdateProfile: (updates: { name?: string; house?: House }) => Promise<void>;
    onUpdatePassword: (password: string) => Promise<void>;
    bettingEvents: BettingEvent[];
    bets: Bet[];
    onPlaceBet: (eventId: string, amount: { g: number; s: number; k: number }, choice: 'A' | 'B') => Promise<void>;
    onCreateEvent: (title: string, optionA: string, optionB: string) => Promise<void>;
    onResolveEvent: (eventId: string, winner: 'A' | 'B') => Promise<void>;
    onToggleEventStatus: (eventId: string, newStatus: BettingEventStatus) => Promise<void>;
    onDeleteEvent: (eventId: string) => Promise<void>;
}

const houseColors: { [key: string]: string } = {
    Gryffindor: 'text-red-400',
    Hufflepuff: 'text-yellow-400',
    Ravenclaw: 'text-blue-400',
    Slytherin: 'text-green-400',
};

const Dashboard: React.FC<DashboardProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'send'|'bet'|'history'|'admin'|'profile'>('send');
    const b = knutsToCanonical(props.currentUser.balance);

    return (
        <div className="container mx-auto px-4 pb-24 pt-32 max-w-4xl">
            {/* Balance Card - Gringotts Vault Design */}
            <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-12 mb-8 border border-white/10 text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent"></div>
                <p className="text-[0.6rem] md:text-xs font-bold tracking-[0.2em] uppercase opacity-40 mb-3">Verfügbares Vermögen</p>
                <div className="flex justify-center items-baseline gap-2 md:gap-4">
                    <span className="text-[42px] sm:text-[64px] md:text-[80px] font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600">
                        {b.galleons}<span className="text-[20px] sm:text-[32px] md:text-[40px] ml-1 text-yellow-500/80 font-aboreto">G</span>
                    </span>
                    <span className="text-[28px] sm:text-[48px] md:text-[60px] font-bold text-gray-300">
                         {b.sickles}<span className="text-[16px] sm:text-[24px] md:text-[30px] ml-1 text-gray-400 font-aboreto">S</span>
                    </span>
                    <span className="text-[28px] sm:text-[48px] md:text-[60px] font-bold text-orange-700/80">
                         {b.knuts}<span className="text-[16px] sm:text-[24px] md:text-[30px] ml-1 text-orange-800/80 font-aboreto">K</span>
                    </span>
                </div>
            </div>

            {/* Nav Tabs */}
            <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                 <NavButton active={activeTab==='send'} onClick={()=>setActiveTab('send')} icon={<SendIconSolid/>} label="Senden" />
                 <NavButton active={activeTab==='bet'} onClick={()=>setActiveTab('bet')} icon={<TrophyIcon/>} label="Wetten" />
                 <NavButton active={activeTab==='history'} onClick={()=>setActiveTab('history')} icon={<HistoryIconSolid/>} label="Verlauf" />
                 <NavButton active={activeTab==='profile'} onClick={()=>setActiveTab('profile')} icon={<UserIconSolid/>} label="Profil" />
                 {props.isKing && <NavButton active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<AdminIconSolid/>} label="Admin" />}
            </div>

            <div className="animate-fadeIn">
                {activeTab === 'send' && <SendMoneyView {...props} />}
                {activeTab === 'bet' && <BettingView {...props} />}
                {activeTab === 'history' && <HistoryView transactions={props.transactions} currentUserId={props.currentUser.id} />}
                {activeTab === 'profile' && <ProfileView {...props} />}
                {activeTab === 'admin' && props.isKing && <AdminView {...props} />}
            </div>
        </div>
    );
};

const SendMoneyView = ({ users, onSendMoney, currentUser }: DashboardProps) => {
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [amount, setAmount] = useState({ g: 0, s: 0, k: 0 });
    const [note, setNote] = useState('');
    const [search, setWithSearch] = useState('');

    const filtered = users
        .filter(u => u.id !== currentUser.id && !u.is_deleted && u.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));

    return (
        <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 space-y-6 shadow-xl">
            <h3 className="text-xl font-bold">Zahlung anweisen</h3>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Empfänger suchen..." 
                    value={search} 
                    onChange={e=>setWithSearch(e.target.value)} 
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all" 
                />
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filtered.length === 0 && <p className="text-center opacity-40 py-4 italic">Keine Magier gefunden.</p>}
                {filtered.map(u => (
                    <button 
                        key={u.id} 
                        onClick={() => setSelectedUsers(p => p.includes(u.id) ? p.filter(id=>id!==u.id) : [...p, u.id])} 
                        className={`w-full p-4 rounded-2xl border flex justify-between items-center transition-all ${selectedUsers.includes(u.id) ? 'border-yellow-500 bg-yellow-500/10 shadow-lg' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                    >
                        <div className="text-left">
                            <span className="font-bold block">{u.name}</span>
                            <span className={`text-[9px] uppercase tracking-[0.1em] font-medium ${houseColors[u.house]}`}>{u.house}</span>
                        </div>
                        {selectedUsers.includes(u.id) ? (
                            <div className="w-6 h-6 bg-yellow-500 rounded-full border border-white/20 shadow-[0_0_10px_rgba(234,179,8,0.4)]" />
                        ) : (
                            <div className="w-6 h-6 rounded-full border border-white/20" />
                        )}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                    <input type="number" placeholder="G" value={amount.g||''} onChange={e=>setAmount({...amount, g: Math.max(0, parseInt(e.target.value)||0)})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-center font-bold text-yellow-500" />
                    <p className="text-[9px] text-center opacity-40 font-bold">GALLEONEN</p>
                </div>
                <div className="space-y-1">
                    <input type="number" placeholder="S" value={amount.s||''} onChange={e=>setAmount({...amount, s: Math.max(0, parseInt(e.target.value)||0)})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-center font-bold text-gray-300" />
                    <p className="text-[9px] text-center opacity-40 font-bold">SICKEL</p>
                </div>
                <div className="space-y-1">
                    <input type="number" placeholder="K" value={amount.k||''} onChange={e=>setAmount({...amount, k: Math.max(0, parseInt(e.target.value)||0)})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-center font-bold text-orange-700" />
                    <p className="text-[9px] text-center opacity-40 font-bold">KNUTS</p>
                </div>
            </div>

            <input 
                type="text" 
                placeholder="Verwendungszweck (z.B. Butterbier-Runde)" 
                value={note} 
                onChange={e=>setNote(e.target.value)} 
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-500/50" 
            />

            <button 
                disabled={selectedUsers.length === 0 || (amount.g === 0 && amount.s === 0 && amount.k === 0)}
                onClick={() => onSendMoney(selectedUsers, amount, note).then(()=> { setSelectedUsers([]); setAmount({g:0,s:0,k:0}); setNote(''); })} 
                className="w-full bg-white disabled:opacity-30 disabled:cursor-not-allowed text-black py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-transform active:scale-95 shadow-xl"
            >
                Transaktion bestätigen
            </button>
        </div>
    );
};

const BettingView = ({ bettingEvents, onPlaceBet, bets }: DashboardProps) => {
    const activeEvents = bettingEvents.filter(e => e.status !== BettingEventStatus.RESOLVED);
    const [betAmount, setBetAmount] = useState({ g: 0, s: 0, k: 0 });

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold px-2">Wettbüro</h3>
            {activeEvents.length === 0 && <p className="text-center opacity-40 py-10">Aktuell keine offenen Wetten.</p>}
            {activeEvents.map(event => {
                const myBet = bets.find(b => b.event_id === event.id);
                return (
                    <div key={event.id} className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center">
                            <h4 className="text-lg font-bold text-yellow-500/90">{event.title}</h4>
                            <span className="text-[10px] bg-white/10 px-2 py-1 rounded-full uppercase tracking-tighter opacity-50">{event.status}</span>
                        </div>
                        {myBet ? (
                            <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl flex justify-between items-center">
                                <div><p className="text-xs opacity-50 uppercase mb-1">Deine Wette auf</p><p className="font-bold">{myBet.choice === 'A' ? event.option_a : event.option_b}</p></div>
                                <div className="text-right"><p className="text-xs opacity-50 uppercase mb-1">Einsatz</p><p className="font-mono">{knutsToCanonical(myBet.amount).knuts}K</p></div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => onPlaceBet(event.id, betAmount, 'A')} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                        <p className="text-[10px] opacity-30 uppercase mb-1">Option A</p><p className="font-bold">{event.option_a}</p>
                                    </button>
                                    <button onClick={() => onPlaceBet(event.id, betAmount, 'B')} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                        <p className="text-[10px] opacity-30 uppercase mb-1">Option B</p><p className="font-bold">{event.option_b}</p>
                                    </button>
                                </div>
                                <input type="number" placeholder="Einsatz in Knuts" onChange={e=>setBetAmount({g:0,s:0,k:parseInt(e.target.value)||0})} className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-center font-mono focus:outline-none focus:ring-2 focus:ring-yellow-500/50" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const HistoryView = ({ transactions, currentUserId }: { transactions: Transaction[], currentUserId: string }) => {
    const cleanNote = (note?: string) => {
        if (!note) return '';
        // Entfernt alles ab dem Metadaten-Trenner |~|
        return note.split('|~|')[0].trim();
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold px-2">Kontoauszug</h3>
            {transactions.length === 0 && <p className="text-center opacity-40 py-10 italic">Der Tresor ist noch leer.</p>}
            {transactions.map(t => {
                const isOut = t.sender_id === currentUserId;
                const counterparty = isOut ? t.receiver : t.sender;
                const c = knutsToCanonical(t.amount);
                const displayNote = cleanNote(t.note);
                const partnerHouse = counterparty?.house || '';

                return (
                    <div key={t.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-start hover:bg-white/10 transition-colors gap-4">
                        <div className="min-w-0 flex-1 space-y-1.5">
                            {/* Primär: Transaktionspartner in seiner Hausfarbe */}
                            <p className="font-bold text-white/90 flex flex-wrap items-center gap-x-1.5 leading-tight">
                                <span className="opacity-50 font-medium text-[10px] uppercase tracking-tighter shrink-0">
                                    {isOut ? 'An:' : 'Von:'}
                                </span>
                                <span className={`${houseColors[partnerHouse] || 'text-white'} break-words`}>
                                    {counterparty?.name || 'Unbekannt'}
                                </span>
                            </p>
                            
                            {/* Sekundär: Die Nachricht (bereinigt und voll sichtbar) */}
                            {displayNote && displayNote !== 'Banktransfer' && (
                                <p className="text-sm opacity-70 italic whitespace-pre-wrap break-words leading-relaxed text-white/80">
                                    "{displayNote}"
                                </p>
                            )}

                            {/* Tertiär: Datum & Zeit */}
                            <p className="text-[10px] opacity-30 uppercase tracking-widest pt-0.5">
                                {new Date(t.created_at).toLocaleDateString('de-DE')} • {new Date(t.created_at).toLocaleTimeString('de-DE', {hour:'2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                        <div className="text-right shrink-0 pt-1">
                            <p className={`font-mono font-bold text-lg leading-none ${isOut ? 'text-red-400' : 'text-green-400'}`}>
                                {isOut ? '-' : '+'}{c.galleons}G {c.sickles}S {c.knuts}K
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ProfileView = ({ currentUser, onUpdateProfile, onUpdatePassword }: DashboardProps) => {
    const [name, setName] = useState(currentUser.name);
    const [house, setHouse] = useState<House>(currentUser.house);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPass, setIsSavingPass] = useState(false);
    const [passError, setPassError] = useState<string | null>(null);

    const houseDetails = {
        [House.Gryffindor]: { color: "border-red-500", label: "Gryffindor" },
        [House.Slytherin]: { color: "border-green-500", label: "Slytherin" },
        [House.Hufflepuff]: { color: "border-yellow-400", label: "Hufflepuff" },
        [House.Ravenclaw]: { color: "border-blue-500", label: "Ravenclaw" },
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            await onUpdateProfile({ name, house });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassError(null);
        if (newPassword !== confirmPassword) {
            setPassError("Die Passwörter stimmen nicht überein.");
            return;
        }
        if (newPassword.length < 6) {
            setPassError("Das Passwort muss mindestens 6 Zeichen lang sein.");
            return;
        }
        setIsSavingPass(true);
        try {
            await onUpdatePassword(newPassword);
            setNewPassword('');
            setConfirmPassword('');
        } finally {
            setIsSavingPass(false);
        }
    };

    const inputClasses = "w-full p-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/30 transition-all";

    return (
        <div className="space-y-8 animate-fadeIn">
            <h3 className="text-xl font-bold px-2">Profil verwalten</h3>
            
            {/* Profile Section */}
            <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 space-y-6 shadow-xl">
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-40 font-bold ml-1">Dein Name</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className={inputClasses}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest opacity-40 font-bold ml-1">Dein Haus</label>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.values(House).map((h) => (
                                <button 
                                    type="button" 
                                    key={h} 
                                    onClick={() => setHouse(h)} 
                                    className={`p-3 rounded-xl border-2 transition-all font-bold text-sm ${house === h ? `${houseDetails[h].color} bg-white/10 shadow-[0_0_15px_-5px_currentColor]` : 'border-transparent bg-white/5 hover:bg-white/10'}`}
                                >
                                    {houseDetails[h].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isSavingProfile || (name === currentUser.name && house === currentUser.house)}
                        className="w-full bg-white disabled:opacity-30 text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-lg active:scale-95"
                    >
                        {isSavingProfile ? 'Speichert...' : 'Profil speichern'}
                    </button>
                </form>
            </div>

            {/* Password Section */}
            <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/10 space-y-6 shadow-xl">
                <h4 className="font-bold text-lg">Passwort ändern</h4>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="relative">
                        <input 
                            type={showPass ? 'text' : 'password'} 
                            placeholder="Neues Passwort" 
                            value={newPassword} 
                            onChange={e => { setNewPassword(e.target.value); setPassError(null); }} 
                            className={inputClasses}
                            required
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute inset-y-0 right-0 pr-4 opacity-40 hover:opacity-100 transition-opacity">
                            {showPass ? <EyeSlashIcon /> : <EyeIcon />}
                        </button>
                    </div>
                    <input 
                        type={showPass ? 'text' : 'password'} 
                        placeholder="Passwort bestätigen" 
                        value={confirmPassword} 
                        onChange={e => { setConfirmPassword(e.target.value); setPassError(null); }} 
                        className={inputClasses}
                        required
                    />
                    
                    {passError && (
                        <p className="text-red-400 text-xs font-medium ml-1 animate-fadeIn">
                            {passError}
                        </p>
                    )}

                    <button 
                        type="submit" 
                        disabled={isSavingPass || !newPassword}
                        className="w-full bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95"
                    >
                        {isSavingPass ? 'Ändere...' : 'Passwort aktualisieren'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center min-w-[5rem] h-20 rounded-2xl transition-all duration-300 ${active ? 'bg-white text-black scale-105 shadow-xl shadow-white/5' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
        <div className="w-6 h-6 mb-1">{icon}</div>
        <span className="text-[0.65rem] font-bold uppercase tracking-tighter">{label}</span>
    </button>
);

export default Dashboard;
