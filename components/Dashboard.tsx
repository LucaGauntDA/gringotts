import React, { useState, useRef } from 'react';
import type { User, Transaction } from '../types';
import { SendIcon, HistoryIcon } from './icons';
import { knutsToCurrency, currencyToKnuts, formatCurrency } from '../utils';


interface DashboardProps {
  currentUser: User;
  users: User[];
  transactions: Transaction[];
  onSendMoney: (receiverId: string, amountInKnuts: number) => void;
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

const Dashboard: React.FC<DashboardProps> = ({ currentUser, users, transactions, onSendMoney }) => {
  const [receiverId, setReceiverId] = useState('');
  const [galleons, setGalleons] = useState<string>('');
  const [sickles, setSickles] = useState<string>('');
  const [knuts, setKnuts] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const otherUsers = users.filter(u => u.id !== currentUser.id);

  const { galleons: balanceG, sickles: balanceS, knuts: balanceK } = knutsToCurrency(currentUser.balance);

  return (
    <div className="container mx-auto p-4 pt-24 md:pt-28">
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

        {/* Right Column: Transaction History */}
        <div className={`lg:col-span-2 ${containerStyles}`}>
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;