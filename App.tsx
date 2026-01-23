
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Transaction, AppNotification, BettingEvent, Bet } from './types';
import { House, BettingEventStatus } from './types';
import LoginScreen from './components/LoginScreen';
import OtpScreen from './components/OtpScreen';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import ConnectionErrorScreen from './components/ConnectionErrorScreen';
import AccountDeletedScreen from './components/AccountDeletedScreen';
import NotificationCenter from './components/NotificationCenter';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';
import { currencyToKnuts, knutsToCanonical } from './utils';

const KING_EMAILS = ['luca.lombino@icloud.com', 'da-hauspokal-orga@outlook.com'];
const NIFFLER_EMAIL = 'l.klostermaier@outlook.de';

const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bettingEvents, setBettingEvents] = useState<BettingEvent[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [emailForVerification, setEmailForVerification] = useState<string | null>(null);
  const [isKing, setIsKing] = useState(false);
  const [globalTransactions, setGlobalTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((message: string, type: AppNotification['type']) => {
    const newNotification: AppNotification = { id: Date.now(), message, type };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const refreshData = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if(sessionError) throw sessionError;

    const userEmail = session?.user?.email?.toLowerCase() ?? '';
    setIsKing(KING_EMAILS.some(e => e.toLowerCase() === userEmail));

    if (!session?.user) {
      setCurrentUser(null);
      return;
    }

    const { data: usersData, error: usersError } = await supabase.from('users_with_email').select('*');
    if (usersError) throw usersError;
    
    const processedUsers = (usersData || []).map(u => {
      if (u.email?.toLowerCase() === NIFFLER_EMAIL.toLowerCase()) return { ...u, house: House.Niffler };
      return u;
    });
    setUsers(processedUsers);

    const currentUserData = processedUsers.find(u => u.id === session.user.id) || null;
    if (currentUserData?.is_deleted) {
      setCurrentUser({ ...currentUserData, is_deleted: true });
      return;
    }
    setCurrentUser(currentUserData);
    
    if (currentUserData) {
      const { data: transData } = await supabase
        .from('transactions')
        .select('*, sender:users!sender_id(id, name, house), receiver:users!receiver_id(id, name, house)')
        .or(`sender_id.eq.${currentUserData.id},receiver_id.eq.${currentUserData.id}`)
        .order('created_at', { ascending: false });
      setTransactions(transData || []);

      const { data: eventsData } = await supabase.from('betting_events').select('*').order('created_at', { ascending: false });
      setBettingEvents(eventsData || []);

      const { data: betsData } = await supabase.from('bets').select('*, user:users!user_id(id, name, house)').eq('user_id', currentUserData.id);
      setBets(betsData || []);
    }

    if (KING_EMAILS.some(e => e.toLowerCase() === userEmail)) {
      const { data: allTransData } = await supabase
        .from('transactions')
        .select('*, sender:users!sender_id(id, name, house), receiver:users!receiver_id(id, name, house)')
        .order('created_at', { ascending: false });
      setGlobalTransactions(allTransData || []);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    refreshData().finally(() => setLoading(false));
    const { data: authListener } = supabase.auth.onAuthStateChange(() => refreshData());
    return () => authListener.subscription.unsubscribe();
  }, [refreshData]);

  const handleSteal = async (targetId: string) => {
    if (!currentUser || currentUser.house !== House.Niffler) return;
    const { error } = await supabase.rpc('send_money', { 
      sender_id_in: targetId, 
      receiver_id_in: currentUser.id, 
      amount_in: 1, 
      note_in: 'Niffler-Raubzug: Ein glitzernder Knut wurde stibitzt!' 
    });
    if (error) throw error;
    addNotification("Erfolgreich stibitzt! Ein glitzernder Knut gehört nun dir.", "success");
    await refreshData();
  };

  const handleSendMoney = async (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => {
    if (!currentUser) throw new Error("Nicht eingeloggt");
    if (currentUser.house === House.Niffler) throw new Error("Niffler senden kein Geld, sie nehmen es sich!");
    const amountInKnuts = currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k });
    for (const receiverId of receiverIds) {
      const { error } = await supabase.rpc('send_money', { 
        sender_id_in: currentUser.id, 
        receiver_id_in: receiverId, 
        amount_in: amountInKnuts, 
        note_in: `${note || ''}|~|${JSON.stringify(amount)}` 
      });
      if (error) throw error;
    }
    await refreshData();
  };

  const handleLogin = async (email: string, pass: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setAuthError(error.message);
  };

  const handleRegister = async (name: string, house: House, pass: string, email: string) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { name, house, balance: 0 } } });
    if (error) setAuthError(error.message);
    else if (data.user && !data.session) setEmailForVerification(email);
  };

  const handleVerifyOtp = async (email: string, token: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) setAuthError(error.message);
    else setEmailForVerification(null);
  };

  if (loading) return <LoadingScreen />;
  if (currentUser?.is_deleted) return <AccountDeletedScreen />;
  if (emailForVerification) return <OtpScreen email={emailForVerification} onVerify={handleVerifyOtp} onBack={() => setEmailForVerification(null)} error={authError} />;
  if (!currentUser) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} />;

  return (
    <div className="bg-[#121212] min-h-screen text-white font-sans">
      <Header currentUser={currentUser} onLogout={() => supabase.auth.signOut()} />
      <Dashboard
        currentUser={currentUser}
        users={users}
        transactions={transactions}
        onSendMoney={handleSendMoney}
        onSteal={handleSteal}
        isKing={isKing}
        kingEmails={KING_EMAILS}
        globalTransactions={globalTransactions}
        onUpdateUser={async () => {}}
        onSoftDeleteUser={async () => {}}
        onRestoreUser={async () => {}}
        onUpdateProfile={async () => {}}
        onUpdatePassword={async () => {}}
        bettingEvents={bettingEvents}
        bets={bets}
        onPlaceBet={async () => {}}
        onCreateEvent={async () => {}}
        onResolveEvent={async () => {}}
        onToggleEventStatus={async () => {}}
        onDeleteEvent={async () => {}}
      />
      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
    </div>
  );
};

export default App;
