
import React, { useState, useEffect, useCallback } from 'react';
import type { User, Transaction, AppNotification, BettingEvent, Bet } from './types';
import { House, BettingEventStatus } from './types';
import LoginScreen from './components/LoginScreen';
import OtpScreen from './components/OtpScreen';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import AccountDeletedScreen from './components/AccountDeletedScreen';
import ConnectionErrorScreen from './components/ConnectionErrorScreen';
import NotificationCenter from './components/NotificationCenter';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { currencyToKnuts } from './utils';

const KING_EMAILS = ['luca.lombino@icloud.com', 'da-hauspokal-orga@outlook.com'];

const App: React.FC = () => {
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
    setNotifications(prev => [...prev, { id: Date.now(), message, type }]);
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const refreshData = useCallback(async () => {
    try {
      setConnectionError(null);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      const session = sessionData.session;
      
      if (!session?.user) {
        setCurrentUser(null);
        setIsKing(false);
        return;
      }

      const userEmail = session.user.email?.toLowerCase() ?? '';
      setIsKing(KING_EMAILS.some(e => e.toLowerCase() === userEmail));

      const { data: usersData, error: usersError } = await supabase.from('users_with_email').select('*');
      if (usersError) throw usersError;
      
      const processedUsers = usersData || [];
      setUsers(processedUsers);

      const currentUserData = processedUsers.find(u => u.id === session.user.id) || null;
      if (currentUserData?.is_deleted) {
        setCurrentUser({ ...currentUserData, is_deleted: true });
        return;
      }
      setCurrentUser(currentUserData);
      
      if (currentUserData) {
        const { data: transData, error: transError } = await supabase
          .from('transactions')
          .select('*, sender:users!sender_id(id, name, house), receiver:users!receiver_id(id, name, house)')
          .or(`sender_id.eq.${currentUserData.id},receiver_id.eq.${currentUserData.id}`)
          .order('created_at', { ascending: false });
        if (transError) throw transError;
        setTransactions(transData || []);

        const { data: eventsData, error: eventsError } = await supabase.from('betting_events').select('*').order('created_at', { ascending: false });
        if (eventsError) throw eventsError;
        setBettingEvents(eventsData || []);

        const { data: betsData, error: betsError } = await supabase.from('bets').select('*, user:users!user_id(id, name, house)').eq('user_id', currentUserData.id);
        if (betsError) throw betsError;
        setBets(betsData || []);
      }

      if (KING_EMAILS.some(e => e.toLowerCase() === userEmail)) {
        const { data: allTransData, error: allTransError } = await supabase
          .from('transactions')
          .select('*, sender:users!sender_id(id, name, house), receiver:users!receiver_id(id, name, house)')
          .order('created_at', { ascending: false });
        if (allTransError) throw allTransError;
        setGlobalTransactions(allTransData || []);
      }
    } catch (err: any) {
      console.error("Error refreshing data:", err);
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setConnectionError("Die Verbindung zu Gringotts konnte nicht hergestellt werden. Bitte prüfe deine Internetverbindung.");
      } else {
        addNotification("Daten konnten nicht geladen werden.", "error");
      }
    }
  }, [addNotification]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    refreshData().finally(() => setLoading(false));
    const { data: authListener } = supabase.auth.onAuthStateChange(() => refreshData());
    return () => authListener.subscription.unsubscribe();
  }, [refreshData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setUsers([]);
      setTransactions([]);
      setBettingEvents([]);
      setBets([]);
      setIsKing(false);
      setGlobalTransactions([]);
    } catch (err) {
      console.error("Logout error:", err);
      addNotification("Abmelden fehlgeschlagen", "error");
    }
  };

  const handleSendMoney = async (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => {
    if (!currentUser) return;
    const amountInKnuts = currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k });
    if (currentUser.balance < (amountInKnuts * receiverIds.length)) {
      addNotification("Unzureichendes Goldvermögen!", "error");
      return;
    }
    try {
      for (const receiverId of receiverIds) {
        const { error } = await supabase.rpc('send_money', { 
          sender_id_in: currentUser.id, 
          receiver_id_in: receiverId, 
          amount_in: amountInKnuts, 
          note_in: note || 'Banktransfer' 
        });
        if (error) throw error;
      }
      addNotification("Überweisung erfolgreich abgeschlossen.", "success");
      await refreshData();
    } catch (e: any) {
      addNotification("Fehler: " + e.message, "error");
    }
  };

  const handlePlaceBet = async (eventId: string, amount: { g: number; s: number; k: number }, choice: 'A' | 'B') => {
    if (!currentUser) return;
    const amountInKnuts = currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k });
    if (currentUser.balance < amountInKnuts) {
      addNotification("Nicht genügend Knuts!", "error");
      return;
    }
    try {
      const { error } = await supabase.from('bets').insert({ event_id: eventId, user_id: currentUser.id, amount: amountInKnuts, choice });
      if (error) throw error;
      addNotification("Wette platziert!", "success");
      await refreshData();
    } catch (e: any) {
      addNotification(e.message, "error");
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      const { error } = await supabase.from('users').update(updates).eq('id', userId);
      if (error) throw error;
      await refreshData();
    } catch (e: any) {
      addNotification(e.message, "error");
    }
  };

  const handleUpdateProfile = async (updates: { name?: string; house?: House }) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('users').update(updates).eq('id', currentUser.id);
      if (error) throw error;
      addNotification("Profil erfolgreich aktualisiert.", "success");
      await refreshData();
    } catch (e: any) {
      addNotification(e.message, "error");
    }
  };

  const handleUpdatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      addNotification("Passwort erfolgreich geändert.", "success");
    } catch (e: any) {
      addNotification(e.message, "error");
    }
  };

  const handleLogin = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  const handleRegister = async (name: string, house: House, pass: string, email: string) => {
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { data: { name, house, balance: 0 } } });
      if (error) throw error;
      if (data.user && !data.session) setEmailForVerification(email);
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  if (loading) return <LoadingScreen />;
  if (connectionError) return <ConnectionErrorScreen message={connectionError} onRetry={() => { setLoading(true); refreshData().finally(() => setLoading(false)); }} />;
  if (currentUser?.is_deleted) return <AccountDeletedScreen />;
  if (emailForVerification) return <OtpScreen email={emailForVerification} onVerify={async (e, t) => {
    const { error } = await supabase.auth.verifyOtp({ email: e, token: t, type: 'signup' });
    if (error) setAuthError(error.message); else setEmailForVerification(null);
  }} onBack={() => setEmailForVerification(null)} error={authError} />;
  
  if (!currentUser) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} />;

  return (
    <div className="bg-[#121212] min-h-screen text-white font-sans">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <Dashboard
        currentUser={currentUser}
        users={users}
        transactions={transactions}
        onSendMoney={handleSendMoney}
        isKing={isKing}
        kingEmails={KING_EMAILS}
        globalTransactions={globalTransactions}
        onUpdateUser={handleUpdateUser}
        onSoftDeleteUser={(id) => handleUpdateUser(id, { is_deleted: true })}
        onRestoreUser={(id) => handleUpdateUser(id, { is_deleted: false })}
        onUpdateProfile={handleUpdateProfile}
        onUpdatePassword={handleUpdatePassword}
        bettingEvents={bettingEvents}
        bets={bets}
        onPlaceBet={handlePlaceBet}
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
