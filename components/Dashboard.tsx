
import React, { useState, useEffect } from 'react';
import { User, Transaction, House, BettingEvent, Bet, BettingEventStatus } from '../types';
import { knutsToCanonical, currencyToKnuts } from '../utils';
import { 
    SendIconSolid, TrophyIcon, HistoryIconSolid, UserIconSolid, AdminIconSolid, BanknotesIcon, InfoIcon, XMarkIcon, FilterIcon
} from './icons';
import AdminView from './AdminPanel';

interface DashboardProps {
    currentUser: User;
    users: User[];
    transactions: Transaction[];
    onSendMoney: (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => Promise<void>;
    onSteal?: (targetId: string) => Promise<void>;
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

const Dashboard: React.FC<DashboardProps> = (props) => {
    const isNiffler = props.currentUser.house === House.Niffler;
    const [activeTab, setActiveTab] = useState<'send'|'bet'|'history'|'profile'|'admin'|'niffler'>(isNiffler ? 'niffler' : 'send');
    const canonicalBalance = knutsToCanonical(props.currentUser.balance);

    return (
        <div className="container mx-auto px-4 pb-24 pt-32 max-w-4xl">
            {/* Balance Card */}
            <div className={`bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-[2.5rem] p-8 md:p-16 mb-8 border border-white/20 text-center relative overflow-hidden group hover:border-white/30 transition-all duration-500 shadow-2xl mx-auto w-full ${isNiffler ? 'niffler-border' : ''}`}>
                <p className={`text-[0.6rem] md:text-sm font-bold tracking-[0.2em] uppercase opacity-60 mb-2 ${isNiffler ? 'niffler-gold' : ''}`}>Kontostand</p>
                <div className="flex justify-center items-baseline gap-1 md:gap-4 whitespace-nowrap overflow-hidden">
                    <span className={`text-[32px] sm:text-[64px] md:text-[110px] font-black text-transparent bg-clip-text ${isNiffler ? 'bg-gradient-to-br from-[#d4af37] to-[#fff7d6]' : 'bg-gradient-to-br from-yellow-300 to-yellow-600'}`}>
                        {canonicalBalance.galleons}<span className="text-[20px] sm:text-[32px] md:text-[48px] ml-1 text-yellow-500/80">G</span>
                    </span>
                    <span className="text-[24px] sm:text-[48px] md:text-[72px] font-bold text-gray-300">
                         , {canonicalBalance.sickles}<span className="text-[16px] sm:text-[24px] md:text-[36px] ml-1 text-gray-400">S</span>
                    </span>
                    <span className="text-[24px] sm:text-[48px] md:text-[72px] font-bold text-orange-700/80">
                         , {canonicalBalance.knuts}<span className="text-[16px] sm:text-[24px] md:text-[36px] ml-1 text-orange-800/80">K</span>
                    </span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide">
                 {!isNiffler && <NavButton active={activeTab==='send'} onClick={()=>setActiveTab('send')} icon={<SendIconSolid/>} label="Senden" />}
                 {isNiffler && <NavButton active={activeTab==='niffler'} onClick={()=>setActiveTab('niffler')} icon={<BanknotesIcon/>} label="Niffler" />}
                 {!isNiffler && <NavButton active={activeTab==='bet'} onClick={()=>setActiveTab('bet')} icon={<TrophyIcon/>} label="Wetten" />}
                 <NavButton active={activeTab==='history'} onClick={()=>setActiveTab('history')} icon={<HistoryIconSolid/>} label="Verlauf" />
                 {!isNiffler && <NavButton active={activeTab==='profile'} onClick={()=>setActiveTab('profile')} icon={<UserIconSolid/>} label="Profil" />}
                 {props.isKing && !isNiffler && <NavButton active={activeTab==='admin'} onClick={()=>setActiveTab('admin')} icon={<AdminIconSolid/>} label="Admin" />}
            </div>

            {/* Content Area */}
            <div className="animate-fadeIn pb-12">
                {activeTab === 'niffler' && isNiffler && <NiffflerView {...props} />}
                {activeTab === 'history' && <HistoryView transactions={props.transactions} currentUserId={props.currentUser.id} />}
                {activeTab === 'send' && !isNiffler && <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 opacity-50 italic">Senden-Funktion verfügbar für Zauberer.</div>}
                {activeTab === 'bet' && !isNiffler && <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 opacity-50 italic">Wettbüro für Haus-Pokal Teilnehmer.</div>}
                {activeTab === 'admin' && props.isKing && !isNiffler && <AdminView {...props} />}
            </div>
        </div>
    );
};

const NiffflerView = ({ users, onSteal, transactions, currentUser }: DashboardProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isStealing, setIsStealing] = useState(false);

  const lastTheft = transactions.find(t => t.receiver_id === currentUser.id && t.note?.startsWith('Niffler-Raubzug:'));

  useEffect(() => {
    const updateTimer = () => {
      if (!lastTheft) return setTimeLeft(0);
      const diff = new Date().getTime() - new Date(lastTheft.created_at).getTime();
      const oneHour = 3600000;
      setTimeLeft(diff < oneHour ? Math.ceil((oneHour - diff) / 1000) : 0);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [lastTheft]);

  const handleStealClick = async (id: string) => {
    if (timeLeft > 0 || isStealing) return;
    setIsStealing(true);
    try {
      await onSteal?.(id);
    } catch (e) {
      alert("Fehler beim Mopsen: " + (e as Error).message);
    } finally {
      setIsStealing(false);
    }
  };

  const filteredUsers = users
    .filter(u => u.id !== currentUser.id && !u.is_deleted && u.house !== House.Niffler)
    .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-6 border border-white/20 space-y-6 niffler-border">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-black niffler-gold uppercase tracking-widest">Niffler Beutezug</h3>
        <p className="text-sm opacity-60">Stibitze einer Person jede Stunde einen glitzernden Knut.</p>
      </div>

      {timeLeft > 0 ? (
        <div className="p-8 bg-yellow-500/10 border border-yellow-500/30 rounded-3xl text-center">
          <p className="text-xs font-bold uppercase tracking-widest opacity-60 mb-2">Nächster Raubzug bereit in</p>
          <p className="text-5xl font-black text-yellow-500 font-mono">
            {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Opfer suchen..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full p-4 bg-white/5 border border-white/20 rounded-2xl focus:outline-none focus:border-white/50 pl-12"
            />
            <FilterIcon className="absolute left-4 top-4.5 w-5 h-5 opacity-40" />
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
            {filteredUsers.length > 0 ? filteredUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-all group">
                <div>
                  <p className="font-bold text-white group-hover:text-yellow-500 transition-colors">{u.name}</p>
                  <p className="text-[10px] opacity-40 uppercase tracking-widest">{u.house}</p>
                </div>
                <button 
                  onClick={() => handleStealClick(u.id)} 
                  disabled={isStealing}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-yellow-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isStealing ? 'Mopst...' : 'Mopsen'}
                </button>
              </div>
            )) : (
              <p className="text-center py-8 opacity-40 italic">Keine Opfer gefunden.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const HistoryView = ({ transactions, currentUserId }: { transactions: Transaction[], currentUserId: string }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-2xl font-bold px-2 mb-4">Transaktionsverlauf</h3>
            <div className="space-y-2">
                {transactions.length > 0 ? transactions.map(t => {
                    const isSender = t.sender_id === currentUserId;
                    const isTheft = t.note?.startsWith('Niffler-Raubzug:');
                    const c = knutsToCanonical(t.amount);
                    return (
                        <div key={t.id} className={`p-4 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center transition-all hover:bg-white/10 ${isTheft ? 'border-yellow-500/30' : ''}`}>
                            <div className="min-w-0 flex-1">
                                <p className={`font-medium truncate ${isTheft ? 'niffler-gold font-bold' : 'text-white/90'}`}>
                                  {isTheft ? (isSender ? 'Du hast Knuts geklaut!' : 'Niffler-Raubzug!') : t.note?.split('|~|')[0] || (isSender ? `An ${t.receiver?.name}` : `Von ${t.sender?.name}`)}
                                </p>
                                <p className="text-[10px] opacity-40 uppercase tracking-widest">{new Date(t.created_at).toLocaleString('de-DE')}</p>
                            </div>
                            <div className="text-right ml-4 shrink-0">
                                <p className={`font-mono font-bold text-lg ${isSender ? 'text-red-500' : 'text-green-500'}`}>
                                  {isSender ? '-' : '+'}{c.knuts}K
                                </p>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 opacity-30 italic">
                        Noch keine Aktivitäten verzeichnet.
                    </div>
                )}
            </div>
        </div>
    );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center min-w-[5rem] h-[5rem] rounded-2xl transition-all duration-300 ${active ? 'bg-white text-black scale-105 shadow-xl' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
    >
        <div className="w-6 h-6 mb-1">{icon}</div>
        <span className="text-[0.65rem] font-bold uppercase tracking-wider">{label}</span>
    </button>
);

export default Dashboard;
