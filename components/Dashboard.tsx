
import React, { useState } from 'react';
import { User, Transaction, House, BettingEvent, Bet, BettingEventStatus } from '../types';
import { knutsToCanonical, getRandomPaymentReason } from '../utils';
import { 
    SendIconSolid, TrophyIcon, HistoryIconSolid, AdminIconSolid, UserIconSolid, 
    BanknotesIconSolid, SendIcon, CheckIcon, FilterIcon, EyeIcon, EyeSlashIcon, 
    DiceIcon, DiceIconSolid, XMarkIcon, AdminIcon 
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
    onUpdateUser: (userId: string, updates: { name: string; house: House; balance: number, is_admin: boolean }) => Promise<void>;
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
    Gryffindor: 'text-[#FF5C5C]',
    Hufflepuff: 'text-[#FFD700]',
    Ravenclaw: 'text-[#4DA6FF]',
    Slytherin: 'text-[#2ECC71]',
};

// Styles für die Haus-Auswahl Buttons im Profil
const houseSelectionStyles: { [key: string]: { border: string, shadow: string } } = {
    Gryffindor: { border: 'border-[#FF5C5C]', shadow: 'shadow-[0_0_15px_rgba(255,92,92,0.3)]' },
    Hufflepuff: { border: 'border-[#FFD700]', shadow: 'shadow-[0_0_15px_rgba(255,215,0,0.3)]' },
    Ravenclaw: { border: 'border-[#4DA6FF]', shadow: 'shadow-[0_0_15px_rgba(77,166,255,0.4)]' },
    Slytherin: { border: 'border-[#2ECC71]', shadow: 'shadow-[0_0_15px_rgba(46,204,113,0.3)]' },
};

const Dashboard: React.FC<DashboardProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'send'|'bet'|'history'|'admin'|'profile'>('send');
    const b = knutsToCanonical(props.currentUser.balance);

    // Send Money State
    const [selectedReceiverIds, setSelectedReceiverIds] = useState<string[]>([]);
    const [sendAmount, setSendAmount] = useState({ g: 0, s: 0, k: 0 });
    const [sendNote, setSendNote] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Bet State (User)
    const [betAmount, setBetAmount] = useState<{ [eventId: string]: { g: number; s: number; k: number } }>({});

    // Bet Admin State
    const [isBetAdminOpen, setIsBetAdminOpen] = useState(false);
    const [newBet, setNewBet] = useState({ title: '', optA: '', optB: '' });
    const [showBetCreator, setShowBetCreator] = useState(false);

    // Profile State
    const [profileName, setProfileName] = useState(props.currentUser.name);
    const [profileHouse, setProfileHouse] = useState(props.currentUser.house);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleReceiverToggle = (userId: string) => {
        if (selectedReceiverIds.includes(userId)) {
            setSelectedReceiverIds(prev => prev.filter(id => id !== userId));
        } else {
            setSelectedReceiverIds(prev => [...prev, userId]);
        }
    };

    const handleSendSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedReceiverIds.length === 0) return;
        await props.onSendMoney(selectedReceiverIds, sendAmount, sendNote || getRandomPaymentReason());
        setSelectedReceiverIds([]);
        setSendAmount({ g: 0, s: 0, k: 0 });
        setSendNote('');
    };

    const handlePlaceBetSubmit = async (eventId: string, choice: 'A' | 'B') => {
        const amt = betAmount[eventId] || { g: 0, s: 0, k: 0 };
        await props.onPlaceBet(eventId, amt, choice);
        setBetAmount(prev => ({ ...prev, [eventId]: { g: 0, s: 0, k: 0 } }));
    };

    // Admin Bet Handlers
    const handleCreateBet = async () => {
        if (!newBet.title || !newBet.optA || !newBet.optB) return;
        await props.onCreateEvent(newBet.title, newBet.optA, newBet.optB);
        setNewBet({ title: '', optA: '', optB: '' });
        setShowBetCreator(false);
    };

    const updateBetAmount = (eventId: string, type: 'g'|'s'|'k', val: number) => {
        setBetAmount(prev => ({
            ...prev,
            [eventId]: { ... (prev[eventId] || {g:0,s:0,k:0}), [type]: val }
        }));
    };

    const handlePasswordUpdate = () => {
        if (newPassword && newPassword === confirmPassword) {
            props.onUpdatePassword(newPassword);
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    const filteredUsers = props.users
        .filter(u => u.id !== props.currentUser.id && !u.is_deleted)
        .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="container mx-auto px-4 pb-24 pt-32 max-w-4xl">
            {/* Balance Card */}
            <div className="relative bg-[#161616] rounded-3xl p-10 mb-8 border border-white/5 shadow-2xl overflow-hidden">
                {/* Top Golden Glow */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-80 shadow-[0_0_25px_rgba(255,215,0,0.6)]"></div>
                
                <div className="text-center">
                    <p className="text-[#666] text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-1 font-sans">
                        Verfügbares Vermögen
                    </p>
                    <div className="flex flex-wrap justify-center items-baseline gap-3 md:gap-5 font-sans">
                        <div className="flex items-baseline">
                            <span className="text-5xl md:text-[5rem] font-bold text-[#FFC200] tracking-tight leading-none">{b.galleons}</span>
                            <span className="text-xl md:text-3xl font-medium text-[#CFA700] ml-1">G</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className="text-5xl md:text-[5rem] font-bold text-[#E0E0E0] tracking-tight leading-none">{b.sickles}</span>
                            <span className="text-xl md:text-3xl font-medium text-[#9CA3AF] ml-1">S</span>
                        </div>
                        <div className="flex items-baseline">
                            <span className="text-5xl md:text-[5rem] font-bold text-[#D95D2E] tracking-tight leading-none">{b.knuts}</span>
                            <span className="text-xl md:text-3xl font-medium text-[#A63C14] ml-1">K</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex justify-center mb-8">
                <div className="bg-[#1c1c1c]/80 backdrop-blur-xl p-1.5 rounded-full border border-white/10 flex gap-1 shadow-xl overflow-x-auto max-w-full no-scrollbar">
                    {[
                        { id: 'send', icon: SendIconSolid, label: 'Senden' },
                        { id: 'bet', icon: DiceIconSolid, label: 'Wetten' },
                        { id: 'history', icon: HistoryIconSolid, label: 'Verlauf' },
                        { id: 'profile', icon: UserIconSolid, label: 'Profil' },
                        ...(props.isKing ? [{ id: 'admin', icon: AdminIconSolid, label: 'Admin' }] : [])
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-white text-black font-bold shadow-lg transform scale-105' 
                                : 'text-white/60 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="animate-fadeIn">
                {activeTab === 'send' && (
                    <div className="bg-[#121212] rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl max-w-2xl mx-auto">
                        <h2 className="text-xl font-bold mb-6 text-white">Geld überweisen</h2>
                        <form onSubmit={handleSendSubmit} className="space-y-4">
                            {/* User Selection */}
                            <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Empfänger suchen..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#1E1E1E] rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                                />
                            </div>
                            
                            <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                {filteredUsers.map(user => {
                                    const isSelected = selectedReceiverIds.includes(user.id);
                                    return (
                                        <div 
                                            key={user.id}
                                            onClick={() => handleReceiverToggle(user.id)}
                                            className="w-full p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all bg-[#1E1E1E] hover:bg-[#252525]"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-base">{user.name}</span>
                                                <span className={`text-[10px] uppercase tracking-wider font-bold mt-1 ${houseColors[user.house]}`}>
                                                    {user.house.toUpperCase()}
                                                </span>
                                            </div>
                                            
                                            <div className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${isSelected ? 'border-white' : 'border-white/20'}`}>
                                                {isSelected && <div className="w-3 h-3 bg-white rounded-full" />}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {selectedReceiverIds.length > 0 && (
                                <p className="text-sm text-green-400 font-medium px-1 text-right">
                                    {selectedReceiverIds.length} ausgewählt
                                </p>
                            )}

                            {/* Amount Inputs */}
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                <div className="flex flex-col items-center">
                                    <div className="bg-[#1E1E1E] w-full rounded-xl h-16 flex items-center justify-center relative">
                                        {sendAmount.g === 0 && <span className="absolute text-white/20 font-bold text-lg pointer-events-none">G</span>}
                                        <input 
                                            type="number" min="0" 
                                            value={sendAmount.g || ''} 
                                            onChange={e => setSendAmount({...sendAmount, g: parseInt(e.target.value) || 0})}
                                            className="w-full h-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wider">Galleonen</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="bg-[#1E1E1E] w-full rounded-xl h-16 flex items-center justify-center relative">
                                         {sendAmount.s === 0 && <span className="absolute text-white/20 font-bold text-lg pointer-events-none">S</span>}
                                        <input 
                                            type="number" min="0" max="16"
                                            value={sendAmount.s || ''} 
                                            onChange={e => setSendAmount({...sendAmount, s: parseInt(e.target.value) || 0})}
                                            className="w-full h-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wider">Sickel</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="bg-[#1E1E1E] w-full rounded-xl h-16 flex items-center justify-center relative">
                                         {sendAmount.k === 0 && <span className="absolute text-white/20 font-bold text-lg pointer-events-none">K</span>}
                                        <input 
                                            type="number" min="0" max="28"
                                            value={sendAmount.k || ''} 
                                            onChange={e => setSendAmount({...sendAmount, k: parseInt(e.target.value) || 0})}
                                            className="w-full h-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                                        />
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wider">Knuts</span>
                                </div>
                            </div>

                            <input 
                                type="text"
                                placeholder="Verwendungszweck (z.B. Butterbier-Runde)"
                                value={sendNote}
                                onChange={(e) => setSendNote(e.target.value)}
                                className="w-full bg-[#1E1E1E] rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all mt-2"
                            />

                            <button 
                                type="submit"
                                disabled={selectedReceiverIds.length === 0 || (sendAmount.g === 0 && sendAmount.s === 0 && sendAmount.k === 0)}
                                className="w-full py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase mt-4 shadow-lg transition-all bg-white text-black hover:bg-gray-200 disabled:bg-[#2A2A2A] disabled:text-white/20 disabled:cursor-not-allowed"
                            >
                                SENDEN
                            </button>
                        </form>
                    </div>
                )}

                {activeTab === 'bet' && (
                    <div className="space-y-8 max-w-2xl mx-auto">
                        
                        {/* ADMIN BETTING MANAGEMENT SECTION (Collapsible) */}
                        {props.isKing && (
                            <div className="bg-[#1c1c1c]/60 backdrop-blur-xl rounded-3xl border border-yellow-500/30 overflow-hidden mb-6 shadow-xl">
                                <button 
                                    onClick={() => setIsBetAdminOpen(!isBetAdminOpen)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <AdminIcon className="w-6 h-6 text-yellow-500" />
                                        <span className="font-bold text-yellow-500 uppercase tracking-widest text-sm">Wett-Verwaltung (Admin)</span>
                                    </div>
                                    <div className={`transform transition-transform duration-300 ${isBetAdminOpen ? 'rotate-180' : ''}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-yellow-500">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </div>
                                </button>

                                {isBetAdminOpen && (
                                    <div className="p-6 border-t border-white/10 animate-fadeIn space-y-8">
                                        {/* Neue Wette erstellen */}
                                        <div>
                                            <div className="flex justify-between items-center mb-4">
                                                <h3 className="font-bold text-white/80">Neue Wette erstellen</h3>
                                                <button onClick={() => setShowBetCreator(!showBetCreator)} className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors">
                                                    {showBetCreator ? 'Abbrechen' : '+ Neu'}
                                                </button>
                                            </div>
                                            {showBetCreator && (
                                                <div className="mb-6 p-4 bg-black/40 rounded-xl border border-white/10 space-y-3">
                                                    <input value={newBet.title} onChange={e=>setNewBet({...newBet, title: e.target.value})} placeholder="Wett-Thema (z.B. Wer gewinnt Quidditch?)" className="w-full p-3 bg-[#1E1E1E] border border-white/10 rounded-xl focus:outline-none focus:border-yellow-500/50" />
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <input value={newBet.optA} onChange={e=>setNewBet({...newBet, optA: e.target.value})} placeholder="Option A" className="w-full p-3 bg-[#1E1E1E] border border-white/10 rounded-xl focus:outline-none focus:border-yellow-500/50" />
                                                        <input value={newBet.optB} onChange={e=>setNewBet({...newBet, optB: e.target.value})} placeholder="Option B" className="w-full p-3 bg-[#1E1E1E] border border-white/10 rounded-xl focus:outline-none focus:border-yellow-500/50" />
                                                    </div>
                                                    <button onClick={handleCreateBet} className="w-full bg-yellow-500 text-black py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-yellow-400 transition-colors">Veröffentlichen</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Liste der Wetten (Admin-Ansicht) */}
                                        <div className="space-y-3">
                                            <h3 className="font-bold text-white/80 mb-2">Wetten verwalten</h3>
                                            {props.bettingEvents.length === 0 ? <p className="text-white/30 text-sm">Keine Wetten vorhanden.</p> : 
                                            props.bettingEvents.map(event => (
                                                <div key={event.id} className="p-4 bg-black/40 rounded-xl border border-white/10">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <h4 className="font-bold text-sm md:text-base">{event.title}</h4>
                                                            <div className={`text-[10px] inline-block px-2 py-0.5 rounded mt-1 uppercase tracking-widest font-bold ${
                                                                event.status === BettingEventStatus.OPEN ? 'bg-blue-500/20 text-blue-400' :
                                                                event.status === BettingEventStatus.LOCKED ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-green-500/20 text-green-400'
                                                            }`}>
                                                                {event.status}
                                                            </div>
                                                        </div>
                                                        <button onClick={() => props.onDeleteEvent(event.id)} className="p-1.5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-colors"><XMarkIcon className="w-5 h-5"/></button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {event.status === BettingEventStatus.OPEN && (
                                                            <button onClick={() => props.onToggleEventStatus(event.id, BettingEventStatus.LOCKED)} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg font-medium transition-colors">
                                                                Annahme schließen
                                                            </button>
                                                        )}
                                                        {event.status === BettingEventStatus.LOCKED && (
                                                            <div className="flex gap-2 w-full mt-2">
                                                                <button onClick={() => props.onResolveEvent(event.id, 'A')} className="flex-1 text-xs bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 py-2 rounded-lg font-bold transition-colors">
                                                                    Sieger: {event.option_a}
                                                                </button>
                                                                <button onClick={() => props.onResolveEvent(event.id, 'B')} className="flex-1 text-xs bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 py-2 rounded-lg font-bold transition-colors">
                                                                    Sieger: {event.option_b}
                                                                </button>
                                                            </div>
                                                        )}
                                                        {event.status === BettingEventStatus.RESOLVED && (
                                                            <p className="text-xs text-white/50 w-full mt-2 border-t border-white/5 pt-2">
                                                                Gewinner war: <span className="text-green-400 font-bold">{event.winner === 'A' ? event.option_a : event.option_b}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                         {props.bettingEvents.length === 0 ? (
                            <div className="text-center p-12 bg-[#121212] rounded-3xl border border-white/10 shadow-xl">
                                <DiceIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                                <p className="text-white/50 font-bold uppercase tracking-widest text-sm">Derzeit keine aktiven Wetten.</p>
                            </div>
                        ) : (
                            props.bettingEvents.map(event => {
                                const myBets = props.bets.filter(b => b.event_id === event.id);
                                const totalBet = myBets.reduce((acc, b) => acc + b.amount, 0);
                                const cBet = knutsToCanonical(totalBet);
                                const evtAmt = betAmount[event.id] || {g:0, s:0, k:0};
                                const isInputEmpty = evtAmt.g === 0 && evtAmt.s === 0 && evtAmt.k === 0;

                                return (
                                    <div key={event.id} className="bg-[#121212] rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl relative overflow-hidden">
                                        {event.status === BettingEventStatus.RESOLVED && (
                                            <div className="absolute top-0 right-0 bg-green-500 text-black text-xs font-bold px-4 py-2 rounded-bl-xl uppercase tracking-widest">
                                                Beendet
                                            </div>
                                        )}
                                        {event.status === BettingEventStatus.LOCKED && (
                                            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-4 py-2 rounded-bl-xl uppercase tracking-widest">
                                                Geschlossen
                                            </div>
                                        )}
                                        {event.status === BettingEventStatus.OPEN && (
                                             <div className="absolute top-0 right-0 bg-white/10 text-white/60 text-xs font-bold px-4 py-2 rounded-bl-xl uppercase tracking-widest">
                                                Offen
                                            </div>
                                        )}
                                        
                                        <h3 className="text-xl font-bold mb-6 text-white pr-20">{event.title}</h3>
                                        
                                        {totalBet > 0 && (
                                            <div className="mb-6 bg-[#1E1E1E] border border-yellow-500/20 rounded-xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-yellow-500/10 p-2 rounded-full">
                                                        <TrophyIcon className="w-5 h-5 text-yellow-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold text-[#666] tracking-widest">Dein Einsatz</p>
                                                        <p className="text-yellow-400 font-bold">{cBet.galleons}G {cBet.sickles}S {cBet.knuts}K</p>
                                                    </div>
                                                </div>
                                                {event.status === BettingEventStatus.RESOLVED && (
                                                    <span className={`text-xs font-bold px-3 py-1 rounded uppercase tracking-widest ${myBets.some(b => b.choice === event.winner) ? 'bg-green-500 text-black' : 'bg-red-500/20 text-red-400'}`}>
                                                        {myBets.some(b => b.choice === event.winner) ? 'GEWONNEN' : 'VERLOREN'}
                                                    </span>
                                                )}
                                                {event.status !== BettingEventStatus.RESOLVED && myBets.length > 0 && (
                                                     <span className="text-xs font-bold px-3 py-1 rounded uppercase tracking-widest bg-white/10 text-white/60">
                                                        {myBets[0].choice === 'A' ? event.option_a : event.option_b}
                                                     </span>
                                                )}
                                            </div>
                                        )}

                                        {event.status === BettingEventStatus.OPEN && totalBet === 0 && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <div className="bg-[#1E1E1E] w-full rounded-xl h-14 flex items-center justify-center relative">
                                                            {evtAmt.g === 0 && <span className="absolute text-white/20 font-bold text-lg pointer-events-none">G</span>}
                                                            <input 
                                                                type="number" min="0" 
                                                                value={evtAmt.g || ''} 
                                                                onChange={e => updateBetAmount(event.id, 'g', parseInt(e.target.value)||0)}
                                                                className="w-full h-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wider">Galleonen</span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <div className="bg-[#1E1E1E] w-full rounded-xl h-14 flex items-center justify-center relative">
                                                            {evtAmt.s === 0 && <span className="absolute text-white/20 font-bold text-lg pointer-events-none">S</span>}
                                                            <input 
                                                                type="number" min="0" 
                                                                value={evtAmt.s || ''} 
                                                                onChange={e => updateBetAmount(event.id, 's', parseInt(e.target.value)||0)}
                                                                className="w-full h-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wider">Sickel</span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <div className="bg-[#1E1E1E] w-full rounded-xl h-14 flex items-center justify-center relative">
                                                            {evtAmt.k === 0 && <span className="absolute text-white/20 font-bold text-lg pointer-events-none">K</span>}
                                                            <input 
                                                                type="number" min="0" 
                                                                value={evtAmt.k || ''} 
                                                                onChange={e => updateBetAmount(event.id, 'k', parseInt(e.target.value)||0)}
                                                                className="w-full h-full bg-transparent text-center text-white font-bold text-xl focus:outline-none"
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-gray-500 font-bold mt-2 uppercase tracking-wider">Knuts</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-3 mt-4">
                                                    <button 
                                                        onClick={() => handlePlaceBetSubmit(event.id, 'A')}
                                                        disabled={isInputEmpty}
                                                        className="w-full py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase shadow-lg transition-all bg-white text-black hover:bg-gray-200 disabled:bg-[#2A2A2A] disabled:text-white/20 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
                                                    >
                                                        <span className="text-[10px] opacity-60">Wette auf</span>
                                                        <span className="px-2 break-words w-full">{event.option_a}</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePlaceBetSubmit(event.id, 'B')}
                                                        disabled={isInputEmpty}
                                                        className="w-full py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase shadow-lg transition-all bg-white text-black hover:bg-gray-200 disabled:bg-[#2A2A2A] disabled:text-white/20 disabled:cursor-not-allowed flex flex-col items-center justify-center gap-1"
                                                    >
                                                        <span className="text-[10px] opacity-60">Wette auf</span>
                                                        <span className="px-2 break-words w-full">{event.option_b}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {event.status !== BettingEventStatus.OPEN && (
                                            <div className="grid grid-cols-2 gap-3 mt-6">
                                                <div className={`p-4 rounded-xl border flex flex-col items-center text-center ${event.winner === 'A' ? 'border-green-500 bg-green-500/10 text-white' : 'border-white/10 bg-[#1E1E1E] text-white/40'}`}>
                                                    <div className="font-bold text-sm md:text-base">{event.option_a}</div>
                                                    {event.winner === 'A' && <CheckIcon className="w-5 h-5 text-green-500 mt-2" />}
                                                </div>
                                                <div className={`p-4 rounded-xl border flex flex-col items-center text-center ${event.winner === 'B' ? 'border-green-500 bg-green-500/10 text-white' : 'border-white/10 bg-[#1E1E1E] text-white/40'}`}>
                                                    <div className="font-bold text-sm md:text-base">{event.option_b}</div>
                                                    {event.winner === 'B' && <CheckIcon className="w-5 h-5 text-green-500 mt-2" />}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl overflow-hidden border border-white/10 shadow-xl">
                        {props.transactions.length === 0 ? (
                            <div className="p-12 text-center text-white/40">Keine Transaktionen vorhanden.</div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {props.transactions.map((t) => {
                                    const isIncoming = t.receiver_id === props.currentUser.id;
                                    const c = knutsToCanonical(t.amount);
                                    const date = new Date(t.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                                    
                                    // Logik zur Anzeige von "Wettbüro" statt des Admin-Namens
                                    const isBetWin = t.note?.startsWith('Wettgewinn');
                                    let displayPartner = '';
                                    
                                    if (isIncoming) {
                                        if (isBetWin) {
                                            displayPartner = 'Wettbüro';
                                        } else {
                                            displayPartner = t.sender?.name || 'Unbekannt';
                                        }
                                    } else {
                                        // Wenn ich gesendet habe (als User)
                                        displayPartner = t.receiver?.name || 'Unbekannt';
                                    }

                                    return (
                                        <div key={t.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isIncoming ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    <SendIcon className={`w-5 h-5 transform ${isIncoming ? 'rotate-180' : ''}`} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm md:text-base">
                                                        {isIncoming ? 'Von' : 'An'}: <span className="text-white/90">{displayPartner}</span>
                                                    </p>
                                                    {t.note && <p className="text-xs md:text-sm text-white/50 italic">{t.note}</p>}
                                                    <p className="text-[10px] text-white/30 mt-1">{date}</p>
                                                </div>
                                            </div>
                                            <div className={`text-right font-mono font-bold whitespace-nowrap ${isIncoming ? 'text-green-400' : 'text-red-400'}`}>
                                                {isIncoming ? '+' : '-'}{c.galleons > 0 && `${c.galleons}G `}{c.sickles > 0 && `${c.sickles}S `}{c.knuts > 0 && `${c.knuts}K`}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="space-y-8 max-w-2xl mx-auto">
                        <div className="bg-[#121212] rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#666] ml-1">Dein Name</label>
                                    <input 
                                        value={profileName} 
                                        onChange={e => setProfileName(e.target.value)} 
                                        className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold tracking-widest text-[#666] ml-1">Dein Haus</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.values(House).map(h => {
                                            const isSelected = profileHouse === h;
                                            const style = isSelected ? houseSelectionStyles[h] : { border: 'border-white/5', shadow: '' };
                                            return (
                                                <button 
                                                    key={h} 
                                                    onClick={() => setProfileHouse(h)} 
                                                    className={`p-4 rounded-xl border-2 transition-all duration-300 font-bold text-sm ${style.border} ${style.shadow} ${isSelected ? 'bg-[#1E1E1E] text-white' : 'bg-[#1E1E1E] text-white/40 hover:text-white/70 hover:border-white/10'}`}
                                                >
                                                    {h}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => props.onUpdateProfile({ name: profileName, house: profileHouse })} 
                                    disabled={!profileName.trim()}
                                    className="w-full py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase mt-2 shadow-lg transition-all bg-white text-black hover:bg-gray-200 disabled:bg-[#2A2A2A] disabled:text-white/20 disabled:cursor-not-allowed"
                                >
                                    PROFIL SPEICHERN
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#121212] rounded-3xl p-6 md:p-8 border border-white/10 shadow-xl">
                            <h2 className="text-xl font-bold mb-6 text-white">Passwort ändern</h2>
                            <div className="space-y-4">
                                <div className="relative">
                                    <input 
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Neues Passwort" 
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                                    />
                                     <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 opacity-50 hover:opacity-100 transition-opacity flex items-center">
                                        {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                    </button>
                                </div>
                                <input 
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Passwort bestätigen" 
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[#1E1E1E] border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                                />
                                <button 
                                    onClick={handlePasswordUpdate}
                                    disabled={!newPassword || newPassword !== confirmPassword}
                                    className="w-full py-4 rounded-xl font-extrabold text-sm tracking-widest uppercase mt-2 shadow-lg transition-all bg-white text-black hover:bg-gray-200 disabled:bg-[#2A2A2A] disabled:text-white/20 disabled:cursor-not-allowed"
                                >
                                    PASSWORT AKTUALISIEREN
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'admin' && props.isKing && (
                    <AdminView 
                        currentUser={props.currentUser}
                        users={props.users}
                        globalTransactions={props.globalTransactions}
                        onUpdateUser={props.onUpdateUser}
                        onSoftDeleteUser={props.onSoftDeleteUser}
                        onRestoreUser={props.onRestoreUser}
                    />
                )}
            </div>
        </div>
    );
};

export default Dashboard;
