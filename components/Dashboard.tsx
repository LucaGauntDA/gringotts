
import React, { useState, useEffect } from 'react';
import { User, Transaction, House, BettingEvent, Bet, BettingEventStatus } from '../types';
import { knutsToCanonical, currencyToKnuts, getRandomPaymentReason, GALLEON_IN_KNUTS, SICKLE_IN_KNUTS } from '../utils';
import { 
    SendIcon, SendIconSolid, TrophyIcon, 
    HistoryIcon, HistoryIconSolid, UserIcon, UserIconSolid, AdminIcon, AdminIconSolid,
    CheckIcon, XMarkIcon, InfoIcon, FilterIcon, BanknotesIcon
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

const houseDetails = {
    [House.Gryffindor]: { color: "border-red-500", label: "Gryffindor" },
    [House.Slytherin]: { color: "border-green-500", label: "Slytherin" },
    [House.Hufflepuff]: { color: "border-yellow-400", label: "Hufflepuff" },
    [House.Ravenclaw]: { color: "border-blue-500", label: "Ravenclaw" },
};

const getErrorMessage = (e: any): string => {
    if (!e) return "Unbekannter Fehler";
    if (typeof e === 'string') return e;
    if (e.message) return e.message;
    if (e.error_description) return e.error_description;
    try {
        return JSON.stringify(e);
    } catch {
        return String(e);
    }
};

const CurrencyInput = ({ value, onChange }: { value: { g: number; s: number; k: number }, onChange: (val: { g: number; s: number; k: number }) => void }) => (
    <div className="grid grid-cols-3 gap-1.5 md:gap-2">
        <div>
            <label className="text-[10px] md:text-xs opacity-70 mb-1 block text-center">Galleonen</label>
            <input 
                type="number" min="0" 
                value={value.g === 0 ? '' : value.g} 
                onChange={e => onChange({ ...value, g: Math.max(0, parseInt(e.target.value) || 0) })} 
                placeholder="0"
                className="w-full p-2 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-white/50 text-center font-bold text-sm md:text-base" 
            />
        </div>
        <div>
            <label className="text-[10px] md:text-xs opacity-70 mb-1 block text-center">Sickel</label>
            <input 
                type="number" min="0" 
                value={value.s === 0 ? '' : value.s} 
                onChange={e => onChange({ ...value, s: Math.max(0, parseInt(e.target.value) || 0) })} 
                placeholder="0"
                className="w-full p-2 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-white/50 text-center font-bold text-sm md:text-base" 
            />
        </div>
        <div>
            <label className="text-[10px] md:text-xs opacity-70 mb-1 block text-center">Knuts</label>
            <input 
                type="number" min="0" 
                value={value.k === 0 ? '' : value.k} 
                onChange={e => onChange({ ...value, k: Math.max(0, parseInt(e.target.value) || 0) })} 
                placeholder="0"
                className="w-full p-2 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-white/50 text-center font-bold text-sm md:text-base" 
            />
        </div>
    </div>
);

const UserSelect = ({ users, selectedIds, onChange, label = "Empfänger" }: { users: User[], selectedIds: string[], onChange: (ids: string[]) => void, label?: string }) => {
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredUsers = users
        .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));

    const toggleUser = (id: string) => {
        if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id));
        else onChange([...selectedIds, id]);
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium opacity-80">{label} ({selectedIds.length} gewählt)</label>
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Nutzer suchen..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-white/50 pl-10"
                />
                 <div className="absolute left-3 top-3.5 opacity-30"><FilterIcon className="w-4 h-4"/></div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar border border-white/5 p-2 rounded-xl bg-black/20">
                {filteredUsers.length > 0 ? filteredUsers.map(u => {
                    const isSelected = selectedIds.includes(u.id);
                    return (
                        <div 
                            key={u.id} 
                            onClick={() => toggleUser(u.id)}
                            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-white/10 border border-white/30' : 'bg-transparent border border-transparent hover:bg-white/5'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-white border-white' : 'border-white/30'}`}>
                                    {isSelected && <div className="w-2.5 h-2.5 bg-black rounded-full" />}
                                </div>
                                <span className={`text-sm md:text-base ${isSelected ? 'font-bold' : ''}`}>{u.name}</span>
                            </div>
                            <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full ${u.house === House.Gryffindor ? 'text-red-400 bg-red-900/20' : u.house === House.Slytherin ? 'text-green-400 bg-green-900/20' : u.house === House.Ravenclaw ? 'text-blue-400 bg-blue-900/20' : 'text-yellow-400 bg-yellow-900/20'}`}>
                                {u.house}
                            </span>
                        </div>
                    )
                }) : (
                    <div className="text-center py-4 opacity-40 text-sm italic">Keine Nutzer gefunden</div>
                )}
            </div>
        </div>
    );
};

const CurrencyConverterModal = ({ onClose, initialBalance }: { onClose: () => void, initialBalance: number }) => {
    const [wizardAmount, setWizardAmount] = useState({ g: 0, s: 0, k: 0 });
    const [euroAmount, setEuroAmount] = useState<string>('');
    const [gbpToEur, setGbpToEur] = useState<number | null>(null);
    const [loadingRate, setLoadingRate] = useState(true);

    useEffect(() => {
        fetch('https://api.frankfurter.app/latest?from=GBP&to=EUR')
            .then(res => res.json())
            .then(data => { if (data?.rates?.EUR) setGbpToEur(data.rates.EUR); })
            .catch(err => console.error(err))
            .finally(() => setLoadingRate(false));
        const canonical = knutsToCanonical(initialBalance);
        setWizardAmount({ g: canonical.galleons, s: canonical.sickles, k: canonical.knuts });
    }, [initialBalance]);

    const totalKnuts = currencyToKnuts({ galleons: wizardAmount.g, sickles: wizardAmount.s, knuts: wizardAmount.k });
    const totalGalleons = totalKnuts / GALLEON_IN_KNUTS;
    
    let eurEquivalent = '...';
    if (gbpToEur !== null) {
        const totalGbp = totalGalleons * 5;
        eurEquivalent = (totalGbp * gbpToEur).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const handleEuroChange = (val: string) => {
        setEuroAmount(val);
        const eur = parseFloat(val.replace(',', '.')) || 0;
        if (gbpToEur !== null && eur > 0) {
            const gbp = eur / gbpToEur;
            const galleons = gbp / 5;
            const knuts = Math.round(galleons * GALLEON_IN_KNUTS);
            const canonical = knutsToCanonical(knuts);
            setWizardAmount({ g: canonical.galleons, s: canonical.sickles, k: canonical.knuts });
        } else if (eur === 0) setWizardAmount({ g: 0, s: 0, k: 0 });
    };

    const formatNum = (num: number) => num.toLocaleString('de-DE', { maximumFractionDigits: 2 });

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[1000] overflow-y-auto flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-[#121212] rounded-[2rem] p-6 md:p-8 w-full max-w-md border border-white/10 shadow-2xl space-y-6 animate-fadeIn relative" 
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest opacity-40">Währungsrechner</h3>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all active:scale-90">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 space-y-6">
                    <h4 className="text-center font-bold text-lg">Von Zauberwährung</h4>
                    <CurrencyInput value={wizardAmount} onChange={(val) => {
                        setWizardAmount(val);
                        if (gbpToEur !== null) {
                            const tk = currencyToKnuts({ galleons: val.g, sickles: val.s, knuts: val.k });
                            const gbp = (tk / GALLEON_IN_KNUTS) * 5;
                            setEuroAmount((gbp * gbpToEur).toFixed(2));
                        }
                    }} />
                    <div className="h-px bg-white/10 w-full" />
                    <div className="space-y-1 text-center">
                        <p className="text-2xl font-black">{totalKnuts.toLocaleString('de-DE')} <span className="text-[10px] font-bold uppercase tracking-widest">Knuts</span></p>
                        <p className="text-lg font-bold opacity-80">{formatNum(totalKnuts/SICKLE_IN_KNUTS)} <span className="text-[10px] uppercase tracking-widest opacity-50">Sickel</span></p>
                        <p className="text-lg font-bold opacity-80">{formatNum(totalGalleons)} <span className="text-[10px] uppercase tracking-widest opacity-50">Galleonen</span></p>
                        <p className="text-xl font-black text-yellow-500 mt-2">≈ {eurEquivalent} <span className="text-xs">EUR</span></p>
                    </div>
                </div>

                <div className="bg-white/5 p-4 rounded-3xl border border-white/10 space-y-4">
                    <h4 className="text-center font-bold text-lg">Von Muggelwährung</h4>
                    <div className="space-y-1">
                        <label className="text-center block text-[10px] uppercase tracking-widest opacity-50 font-bold">Euro (€)</label>
                        <input 
                            type="number" 
                            step="0.01"
                            value={euroAmount}
                            onChange={(e) => handleEuroChange(e.target.value)}
                            placeholder="0,00"
                            className="w-full bg-white/5 border border-white/20 p-4 rounded-2xl text-center text-2xl font-black focus:outline-none focus:border-white/50"
                        />
                    </div>
                </div>

                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center text-[10px]">
                    <p className="font-bold opacity-60">1 Galleone = 17 Sickel | 1 Sickel = 29 Knuts</p>
                    <div className="h-px bg-white/5 my-2" />
                    <p className="font-bold text-yellow-500/80">1 Galleone = 5 £ ≈ {gbpToEur ? (5 * gbpToEur).toFixed(2) : '...'} €</p>
                    <p className="uppercase tracking-widest font-black opacity-30 pt-1">
                        {loadingRate ? 'Lade Live-Kurs...' : `Kurs: 1 £ = ${gbpToEur?.toFixed(4)} €`}
                    </p>
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'send'|'bet'|'history'|'profile'|'admin'>('send');
    const [showConverter, setShowConverter] = useState(false);
    const canonicalBalance = knutsToCanonical(props.currentUser.balance);

    return (
        <div className="container mx-auto px-4 pb-24 pt-32 max-w-4xl">
             <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-16 mb-8 border border-white/20 text-center relative overflow-hidden group hover:border-white/30 transition-all duration-500 shadow-2xl mx-auto w-full">
                 <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <p className="text-[0.6rem] md:text-sm font-bold tracking-[0.2em] uppercase opacity-60 mb-2">Kontostand <button onClick={() => setShowConverter(true)} className="p-1 hover:scale-110 transition-transform"><InfoIcon className="w-4 h-4 inline mb-1 opacity-50 hover:opacity-100"/></button></p>
                <div className="flex justify-center items-baseline gap-1 md:gap-4 flex-nowrap whitespace-nowrap overflow-hidden">
                    <span className="text-[32px] sm:text-[64px] md:text-[110px] font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 to-yellow-600 drop-shadow-sm filter shrink-0">
                        {canonicalBalance.galleons}<span className="text-[20px] sm:text-[32px] md:text-[48px] ml-1 text-yellow-500/80">G</span>
                    </span>
                    <span className="text-[24px] sm:text-[48px] md:text-[72px] font-bold text-gray-300 shrink-0">
                         , {canonicalBalance.sickles}<span className="text-[16px] sm:text-[24px] md:text-[36px] ml-1 text-gray-400">S</span>
                    </span>
                    <span className="text-[24px] sm:text-[48px] md:text-[72px] font-bold text-orange-700/80 shrink-0">
                         , {canonicalBalance.knuts}<span className="text-[16px] sm:text-[24px] md:text-[36px] ml-1 text-orange-800/80">K</span>
                    </span>
                </div>
                <p className="text-[0.6rem] md:text-sm opacity-40 mt-4 font-mono">entspricht {props.currentUser.balance.toLocaleString()} Knuts</p>
            </div>

            <div className="flex justify-between md:justify-center gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide">
                 <NavButton active={activeTab==='send'} onClick={()=>setActiveTab('send')} icon={<SendIconSolid/>} label="Senden" />
                 <NavButton active={activeTab==='bet'} onClick={()=>setActiveTab('bet')} icon={<TrophyIcon/>} label="Wetten" />
                 <NavButton active={activeTab==='history'} onClick={()=>setActiveTab('history')} icon={<HistoryIconSolid/>} label="Verlauf" />
                 <NavButton active={activeTab==='profile'} onClick={()=>setActiveTab('profile')} icon={<UserIconSolid/>} label="Profil" />
                 {props.isKing && <NavButton active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<AdminIconSolid/>} label="Admin" />}
            </div>

            <div className="animate-fadeIn pb-12">
                {activeTab === 'send' && <SendMoneyView {...props} />}
                {activeTab === 'bet' && <BettingView {...props} />}
                {activeTab === 'history' && <HistoryView transactions={props.transactions} currentUserId={props.currentUser.id} />}
                {activeTab === 'profile' && <ProfileView currentUser={props.currentUser} onUpdateProfile={props.onUpdateProfile} onUpdatePassword={props.onUpdatePassword} />}
                {activeTab === 'admin' && props.isKing && <AdminView currentUser={props.currentUser} users={props.users} globalTransactions={props.globalTransactions} onUpdateUser={props.onUpdateUser} onSoftDeleteUser={props.onSoftDeleteUser} onRestoreUser={props.onRestoreUser} />}
            </div>
            {showConverter && <CurrencyConverterModal onClose={()=>setShowConverter(false)} initialBalance={props.currentUser.balance} />}
        </div>
    );
};

// --- Sub-View Components ---

const SendMoneyView = ({ users, currentUser, onSendMoney }: DashboardProps) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [amount, setAmount] = useState({ g: 0, s: 0, k: 0 });
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (sending) return;
        
        const totalAmountInKnuts = currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k });
        if (selectedIds.length === 0) return alert("Bitte wähle mindestens einen Empfänger aus.");
        if (totalAmountInKnuts <= 0) return alert("Bitte gib einen Betrag ein.");
        
        const totalTotal = totalAmountInKnuts * selectedIds.length;
        if (currentUser.balance < totalTotal) return alert(`Nicht genügend Guthaben. Du benötigst ${totalTotal} Knuts, hast aber nur ${currentUser.balance}.`);

        setSending(true);
        try {
            await onSendMoney(selectedIds, amount, note);
            setAmount({ g: 0, s: 0, k: 0 });
            setSelectedIds([]);
            setNote('');
        } catch (e: any) {
            console.error("Send error:", e);
            alert("Fehler beim Senden: " + getErrorMessage(e));
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/20 space-y-6">
            <h3 className="text-2xl font-bold">Geld senden</h3>
            <UserSelect users={users.filter(u => u.id !== currentUser.id && !u.is_deleted)} selectedIds={selectedIds} onChange={setSelectedIds} />
            <CurrencyInput value={amount} onChange={setAmount} />
            <div className="space-y-2">
                <label className="block text-sm font-medium opacity-80">Notiz (Optional)</label>
                <input 
                    type="text" 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    placeholder={getRandomPaymentReason()}
                    className="w-full p-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-white/50" 
                />
            </div>
            <button 
                onClick={handleSend}
                disabled={sending || selectedIds.length === 0}
                className="w-full bg-white text-black font-bold py-4 rounded-full hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg active:scale-[0.98]"
            >
                {sending ? 'Wird gesendet...' : <><SendIcon className="w-5 h-5"/> Senden</>}
            </button>
        </div>
    );
};

const BettingView = ({ bettingEvents, bets, onPlaceBet, currentUser, isKing, onCreateEvent, onResolveEvent, onToggleEventStatus, onDeleteEvent }: DashboardProps) => {
    const [amount, setAmount] = useState({ g: 0, s: 0, k: 0 });
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | null>(null);
    const [betting, setBetting] = useState(false);

    const [showCreate, setShowCreate] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newOptionA, setNewOptionA] = useState('');
    const [newOptionB, setNewOptionB] = useState('');

    const handleBet = async () => {
        if (!selectedEventId || !selectedChoice) return alert("Bitte wähle ein Event und eine Option.");
        if (currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k }) <= 0) return alert("Bitte gib einen Betrag ein.");
        setBetting(true);
        try {
            await onPlaceBet(selectedEventId, amount, selectedChoice);
            setAmount({ g: 0, s: 0, k: 0 });
            setSelectedEventId(null);
            setSelectedChoice(null);
        } catch (e: any) {
            alert(getErrorMessage(e));
        } finally {
            setBetting(false);
        }
    };

    const handleCreate = async () => {
        if (!newTitle || !newOptionA || !newOptionB) return alert("Alle Felder ausfüllen.");
        await onCreateEvent(newTitle, newOptionA, newOptionB);
        setShowCreate(false);
        setNewTitle(''); setNewOptionA(''); setNewOptionB('');
    };

    return (
        <div className="space-y-8">
            {isKing && (
                <div className="bg-blue-500/10 border border-blue-500/30 p-6 rounded-3xl">
                    <button onClick={() => setShowCreate(!showCreate)} className="w-full font-bold flex items-center justify-between">
                        <span>Neues Event erstellen (Admin)</span>
                        <TrophyIcon className="w-5 h-5"/>
                    </button>
                    {showCreate && (
                        <div className="mt-4 space-y-4">
                            <input placeholder="Titel" value={newTitle} onChange={e=>setNewTitle(e.target.value)} className="w-full p-3 bg-black/40 rounded-xl" />
                            <div className="grid grid-cols-2 gap-2">
                                <input placeholder="Option A" value={newOptionA} onChange={e=>setNewOptionA(e.target.value)} className="w-full p-3 bg-black/40 rounded-xl" />
                                <input placeholder="Option B" value={newOptionB} onChange={e=>setNewOptionB(e.target.value)} className="w-full p-3 bg-black/40 rounded-xl" />
                            </div>
                            <button onClick={handleCreate} className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl">Event erstellen</button>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-6">
                <h3 className="text-2xl font-bold px-2">Aktuelle Wetten</h3>
                {bettingEvents.length === 0 && <p className="text-center py-12 opacity-40 italic">Zur Zeit keine aktiven Wetten.</p>}
                {bettingEvents.map(event => {
                    const myBet = bets.find(b => b.event_id === event.id);
                    const isLocked = event.status === BettingEventStatus.LOCKED;
                    const isResolved = event.status === BettingEventStatus.RESOLVED;

                    return (
                        <div key={event.id} className={`bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border ${selectedEventId === event.id ? 'border-yellow-500/50' : 'border-white/20'} transition-all`}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="text-xl font-bold">{event.title}</h4>
                                    <p className="text-xs opacity-50 uppercase tracking-widest mt-1">Status: {event.status}</p>
                                </div>
                                {myBet && (
                                    <div className="bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full text-xs font-bold">
                                        Deine Wette: {myBet.choice === 'A' ? event.option_a : event.option_b}
                                    </div>
                                )}
                            </div>

                            {!isResolved && !isLocked && (
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <button 
                                        onClick={() => { setSelectedEventId(event.id); setSelectedChoice('A'); }}
                                        className={`p-4 rounded-2xl border-2 transition-all font-bold ${selectedEventId === event.id && selectedChoice === 'A' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 hover:bg-white/5'}`}
                                    >
                                        {event.option_a}
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedEventId(event.id); setSelectedChoice('B'); }}
                                        className={`p-4 rounded-2xl border-2 transition-all font-bold ${selectedEventId === event.id && selectedChoice === 'B' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 hover:bg-white/5'}`}
                                    >
                                        {event.option_b}
                                    </button>
                                </div>
                            )}

                            {selectedEventId === event.id && !isLocked && !isResolved && (
                                <div className="space-y-4 animate-fadeIn">
                                    <CurrencyInput value={amount} onChange={setAmount} />
                                    <button onClick={handleBet} disabled={betting} className="w-full bg-yellow-500 text-black font-bold py-4 rounded-full disabled:opacity-50">
                                        Wette platzieren
                                    </button>
                                </div>
                            )}

                            {isResolved && (
                                <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-sm opacity-60">Gewinner:</p>
                                    <p className="text-xl font-black text-yellow-500 uppercase tracking-wider">{event.winner === 'A' ? event.option_a : event.option_b}</p>
                                </div>
                            )}

                            {isKing && (
                                <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-2">
                                    {event.status === BettingEventStatus.OPEN && <button onClick={() => onToggleEventStatus(event.id, BettingEventStatus.LOCKED)} className="text-[10px] bg-white/10 px-3 py-1 rounded-lg">Sperren</button>}
                                    {event.status === BettingEventStatus.LOCKED && <button onClick={() => onToggleEventStatus(event.id, BettingEventStatus.OPEN)} className="text-[10px] bg-white/10 px-3 py-1 rounded-lg">Öffnen</button>}
                                    {!isResolved && (
                                        <>
                                            <button onClick={() => onResolveEvent(event.id, 'A')} className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-lg">Sieg A</button>
                                            <button onClick={() => onResolveEvent(event.id, 'B')} className="text-[10px] bg-green-500/20 text-green-400 px-3 py-1 rounded-lg">Sieg B</button>
                                        </>
                                    )}
                                    <button onClick={() => onDeleteEvent(event.id)} className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-lg ml-auto">Löschen</button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const HistoryView = ({ transactions, currentUserId }: { transactions: Transaction[], currentUserId: string }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-2xl font-bold px-2 mb-6">Transaktionsverlauf</h3>
            <div className="space-y-2">
                {transactions.map(t => {
                    const isSender = t.sender_id === currentUserId;
                    const otherParty = isSender ? t.receiver?.name : t.sender?.name;
                    const amountKnuts = t.amount;
                    const isAdmin = t.note?.startsWith('ADMIN_BALANCE_CHANGE');
                    const isBetWin = t.note?.startsWith('Wettgewinn:');
                    const isBetPlacement = t.note?.startsWith('Wetteinsatz:');
                    
                    let primaryText = isAdmin ? 'Systemanpassung' : isBetWin ? 'Wettgewinn' : isBetPlacement ? 'Wetteinsatz' : isSender ? `An ${otherParty}` : `Von ${otherParty}`;
                    let secondaryText = t.note?.split('|~|')[0];
                    let oldBalanceText = '';
                    let displaySign = isSender ? '-' : '+';
                    let signColor = isSender ? 'text-red-500' : 'text-green-400';

                    // Spezielles Parsing für Admin-Anpassungen
                    if (isAdmin) {
                        signColor = 'text-yellow-500';
                        if (t.note?.includes('ADMIN_BALANCE_CHANGE_V3')) {
                            const parts = t.note.replace('ADMIN_BALANCE_CHANGE_V3: ', '').split('|');
                            const adminName = parts[0];
                            const targetName = parts[1];
                            const oldKnuts = parseInt(parts[2]);
                            const newKnuts = parseInt(parts[3]);
                            
                            primaryText = `Systemanpassung von ${adminName}`;
                            secondaryText = `Kontostand von ${targetName} angepasst`;
                            
                            const oldC = knutsToCanonical(oldKnuts);
                            oldBalanceText = `Geld davor: ${oldC.galleons}G ${oldC.sickles}S ${oldC.knuts}K`;
                            
                            displaySign = newKnuts >= oldKnuts ? '+' : '-';
                            signColor = newKnuts >= oldKnuts ? 'text-green-400' : 'text-red-500';
                        } else if (t.note?.includes('::')) {
                            const parts = t.note.split('::');
                            if (parts.length >= 5) {
                                const oldKnuts = parseInt(parts[3]);
                                const newKnuts = parseInt(parts[4]);
                                const oldC = knutsToCanonical(oldKnuts);
                                oldBalanceText = `Geld davor: ${oldC.galleons}G ${oldC.sickles}S ${oldC.knuts}K`;
                                displaySign = newKnuts >= oldKnuts ? '+' : '-';
                                signColor = newKnuts >= oldKnuts ? 'text-green-400' : 'text-red-500';
                            }
                        } else if (t.note?.includes('|')) {
                            const parts = t.note.replace('ADMIN_BALANCE_CHANGE: ', '').split('|');
                            primaryText = `Systemanpassung von ${parts[0]}`;
                            secondaryText = `Kontostand von ${parts[1]} angepasst`;
                        }
                    }

                    // Farbanpassung für Wetten zur besseren Übersicht
                    if (isBetWin) {
                        signColor = 'text-green-400';
                        displaySign = '+';
                    } else if (isBetPlacement) {
                        signColor = 'text-red-500';
                        displaySign = '-';
                    }

                    const c = knutsToCanonical(amountKnuts);

                    return (
                        <div key={t.id} className="bg-[#1c1c1c]/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10 flex justify-between items-center group hover:bg-white/5 transition-all">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center ${isAdmin ? 'bg-yellow-500/20 text-yellow-500' : (isBetWin || isBetPlacement) ? 'bg-yellow-500/20 text-yellow-500' : isSender ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                    {isAdmin ? <BanknotesIcon className="w-6 h-6"/> : (isBetWin || isBetPlacement) ? <TrophyIcon className="w-6 h-6"/> : isSender ? <SendIcon className="w-6 h-6 rotate-45"/> : <SendIcon className="w-6 h-6 -rotate-[135deg]"/>}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-bold text-white leading-tight break-words">{primaryText}</p>
                                    <p className="text-[10px] opacity-40 uppercase tracking-widest">{new Date(t.created_at).toLocaleString('de-DE')}</p>
                                    {oldBalanceText && <p className="text-[10px] text-yellow-500/70 font-semibold mt-0.5">{oldBalanceText}</p>}
                                    {secondaryText && <p className="text-xs opacity-70 mt-1 italic break-words leading-relaxed">"{secondaryText}"</p>}
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                                <p className={`font-mono font-bold text-base sm:text-lg ${signColor} whitespace-nowrap`}>
                                    {displaySign}{c.galleons}G {c.sickles}S {c.knuts}K
                                </p>
                            </div>
                        </div>
                    )
                })}
                {transactions.length === 0 && (
                    <div className="text-center py-20 opacity-40">
                        <HistoryIcon className="w-16 h-16 mx-auto mb-4 opacity-20"/>
                        <p>Noch keine Transaktionen vorhanden.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ProfileView = ({ currentUser, onUpdateProfile, onUpdatePassword }: { currentUser: User, onUpdateProfile: (updates: { name?: string; house?: House }) => Promise<void>, onUpdatePassword: (password: string) => Promise<void> }) => {
    const [name, setName] = useState(currentUser.name);
    const [house, setHouse] = useState<House>(currentUser.house);
    const [password, setPassword] = useState('');
    const [updating, setUpdating] = useState(false);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await onUpdateProfile({ name, house });
            if (password) await onUpdatePassword(password);
            alert("Profil aktualisiert!");
        } catch (e: any) {
            alert(getErrorMessage(e));
        } finally {
            setUpdating(false);
            setPassword('');
        }
    };

    return (
        <form onSubmit={handleUpdate} className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 md:p-8 border border-white/20 space-y-6">
            <h3 className="text-2xl font-bold">Profil bearbeiten</h3>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium opacity-60 mb-2">Dein Name</label>
                    <input value={name} onChange={e=>setName(e.target.value)} className="w-full p-4 bg-white/5 border border-white/20 rounded-2xl focus:outline-none focus:border-white/50" />
                </div>
                <div>
                    <label className="block text-sm font-medium opacity-60 mb-2">Dein Haus</label>
                    <div className="grid grid-cols-2 gap-2">
                        {Object.values(House).map(h => (
                            <button 
                                key={h} 
                                type="button" 
                                onClick={() => setHouse(h)} 
                                className={`p-3 rounded-xl border-2 transition-all font-bold ${house === h ? `${houseDetails[h].color} bg-white/20 shadow-lg` : 'border-transparent bg-white/5 hover:bg-white/10'}`}
                            >
                                {h}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium opacity-60 mb-2">Neues Passwort (optional)</label>
                    <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Unverändert lassen" className="w-full p-4 bg-white/5 border border-white/20 rounded-2xl focus:outline-none focus:border-white/50" />
                </div>
            </div>
            <button type="submit" disabled={updating} className="w-full bg-white text-black font-bold py-4 rounded-full hover:bg-gray-200 transition-all disabled:opacity-50">
                {updating ? 'Wird gespeichert...' : 'Änderungen speichern'}
            </button>
        </form>
    );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center min-w-[4.5rem] h-[4.5rem] rounded-2xl transition-all duration-300 ${active ? 'bg-white text-black scale-105 shadow-xl' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
        <div className="w-6 h-6 mb-1">{icon}</div>
        <span className="text-[0.65rem] font-bold uppercase tracking-wide">{label}</span>
    </button>
);

export default Dashboard;
