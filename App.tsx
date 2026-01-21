
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

const ORIGINAL_KING_EMAIL = 'luca.lombino@icloud.com';
const KING_EMAILS = [ORIGINAL_KING_EMAIL, 'da-hauspokal-orga@outlook.com'];

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
    const newNotification: AppNotification = {
      id: Date.now(),
      message,
      type,
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const refreshData = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if(sessionError) throw sessionError;

    const userIsKing = KING_EMAILS.includes(session?.user?.email ?? '');
    setIsKing(userIsKing);

     if (!session?.user) {
        setCurrentUser(null);
        setUsers([]);
        setTransactions([]);
        setGlobalTransactions([]);
        setBettingEvents([]);
        setBets([]);
        setIsKing(false);
        return;
    }

    const { data: usersData, error: usersError } = await supabase
        .from('users_with_email')
        .select('*');
    if (usersError) throw usersError;
    setUsers(usersData || []);

    const currentUserData = usersData?.find(u => u.id === session.user.id) || null;
    
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

        const filteredTrans = transData?.filter(t => {
            const isAdminChange = t.note?.startsWith('ADMIN_BALANCE_CHANGE');
            if (isAdminChange) {
                return t.receiver_id === currentUserData.id;
            }
            return true;
        }) || [];
        
        setTransactions(filteredTrans);

        try {
            const { data: eventsData, error: eventsError } = await supabase
                .from('betting_events')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (eventsError) {
                console.warn("Betting events could not be loaded:", eventsError.message);
                setBettingEvents([]);
            } else {
                setBettingEvents(eventsData || []);
            }
        } catch (e) {
            console.warn("Betting events fetch exception:", e);
            setBettingEvents([]);
        }

        try {
            if (userIsKing) {
                const { data: rpcBets, error: rpcError } = await supabase.rpc('get_admin_bets_v2');
                if (!rpcError && rpcBets) {
                    const mappedBets: Bet[] = rpcBets.map((b: any) => ({
                        id: b.bet_id,
                        event_id: b.event_id,
                        user_id: b.user_id,
                        amount: b.amount,
                        choice: b.choice,
                        created_at: b.created_at,
                        user: {
                            id: b.user_id,
                            name: b.user_name,
                            house: b.user_house
                        }
                    }));
                    setBets(mappedBets);
                } else {
                    const { data: betsData, error: betsError } = await supabase
                        .from('bets')
                        .select('*, user:users!user_id(id, name, house)');
                    if (!betsError) setBets(betsData || []);
                }
            } else {
                const { data: betsData, error: betsError } = await supabase
                    .from('bets')
                    .select('*, user:users!user_id(id, name, house)')
                    .eq('user_id', currentUserData.id);
                if (!betsError) setBets(betsData || []);
            }
        } catch (e) {
             console.warn("Bets fetch exception:", e);
             setBets([]);
        }
    }

    if (userIsKing) {
      const { data: allTransData, error: allTransError } = await supabase
        .from('transactions')
        .select('*, sender:users!sender_id(id, name, house), receiver:users!receiver_id(id, name, house)')
        .order('created_at', { ascending: false });
      if (allTransError) throw allTransError;
      setGlobalTransactions(allTransData || []);
    }
  }, []);

  const fetchDataWithRetry = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      await refreshData();
    } catch (error: unknown) {
      console.error("Connection error:", error);
      let errorMessage = 'Verbindung fehlgeschlagen.';
      if (error instanceof Error) errorMessage = error.message;
      setConnectionError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [refreshData]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const usersRef = useRef(users);
  useEffect(() => { usersRef.current = users; }, [users]);


  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConnectionError("Supabase ist nicht konfiguriert.");
      setLoading(false);
      return;
    }

    fetchDataWithRetry();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchDataWithRetry();
    });

    const handleNewTransaction = (payload: any) => {
        const newTx = payload.new as Transaction;
        const user = currentUserRef.current;
        if (user && newTx.receiver_id === user.id && !newTx.note?.startsWith('ADMIN_BALANCE_CHANGE')) {
            const allUsers = usersRef.current;
            const sender = allUsers.find(u => u.id === newTx.sender_id);
            const senderName = sender ? sender.name : 'Jemand';
            const canonical = knutsToCanonical(newTx.amount);
            addNotification(`${senderName} hat dir ${canonical.galleons}G gesendet!`, 'success');
            refreshData();
        }
    };

    const transactionsChannel = supabase.channel('public:transactions').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, handleNewTransaction).subscribe();

    return () => {
      supabase.removeChannel(transactionsChannel);
      authListener.subscription.unsubscribe();
    };
  }, [fetchDataWithRetry, refreshData, addNotification]);

  const handleLogin = async (identifier: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: identifier, password });
    if (error) setAuthError(error.message);
  };

  const handleRegister = async (name: string, house: House, password: string, email: string) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name, house, balance: 0 } } });
    if (error) setAuthError(error.message);
    else if (data.user && !data.session) setEmailForVerification(email);
  };
  
  const handleVerifyOtp = async (email: string, token: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
    if (error) setAuthError(error.message);
    else setEmailForVerification(null);
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
    setIsKing(false);
    setLoading(false);
  };
  
  const handleSendMoney = async (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => {
    if (!currentUser) throw new Error("Benutzer nicht eingeloggt.");
    const amountInKnuts = currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k });
    const totalAmount = amountInKnuts * receiverIds.length;
    if (currentUser.balance < totalAmount) throw new Error("Nicht genügend Guthaben.");
    for (const receiverId of receiverIds) {
      const { error } = await supabase.rpc('send_money', { sender_id_in: currentUser.id, receiver_id_in: receiverId, amount_in: amountInKnuts, note_in: `${note || ''}|~|${JSON.stringify(amount)}` });
      if (error) throw error;
    }
    await refreshData();
  };

  const handleUpdateUser = async (userId: string, updates: { name: string; house: House; balance: number }) => {
    if (!isKing || !currentUser) throw new Error("Keine Berechtigung.");
    
    const { data: targetUser } = await supabase.from('users').select('balance, name').eq('id', userId).single();
    if (!targetUser) throw new Error("Nutzer nicht gefunden.");

    const oldBalance = targetUser.balance;
    const newBalance = updates.balance;
    const diff = newBalance - oldBalance;

    if (diff !== 0) {
        const adminName = currentUser.name;
        const targetName = targetUser.name;
        // ADMIN_BALANCE_CHANGE_V3: Admin|Target|Old|New|Note
        const note = `ADMIN_BALANCE_CHANGE_V3: ${adminName}|${targetName}|${oldBalance}|${newBalance}|Manuelle Anpassung`;
        
        await supabase.from('transactions').insert({
            sender_id: currentUser.id,
            receiver_id: userId,
            amount: Math.abs(diff),
            note: note
        });
    }

    const { error: updateError } = await supabase.from('users').update({ name: updates.name, house: updates.house, balance: updates.balance }).eq('id', userId);
    if (updateError) throw updateError;
    
    await refreshData();
  };

  const handleSoftDeleteUser = async (userId: string) => {
      if (!isKing) throw new Error("Keine Berechtigung.");
      await supabase.from('users').update({ is_deleted: true }).eq('id', userId);
      await refreshData();
  };

  const handleRestoreUser = async (userId: string) => {
      if (!isKing) throw new Error("Keine Berechtigung.");
      await supabase.from('users').update({ is_deleted: false }).eq('id', userId);
      await refreshData();
  };

  const handleUpdateProfile = async (updates: { name?: string; house?: House; }) => {
    if (!currentUser) throw new Error("Benutzer nicht eingeloggt.");
    await supabase.from('users').update(updates).eq('id', currentUser.id);
    await refreshData();
  };

  const handleUpdatePassword = async (password: string) => {
    await supabase.auth.updateUser({ password });
  };

  const handleCreateEvent = async (title: string, optionA: string, optionB: string) => {
      if (!currentUser || !isKing) throw new Error("Keine Berechtigung.");
      await supabase.from('betting_events').insert({ title, option_a: optionA, option_b: optionB, status: BettingEventStatus.OPEN, created_by: currentUser.id });
      await refreshData();
  };

  const handlePlaceBet = async (eventId: string, amount: { g: number; s: number; k: number }, choice: 'A' | 'B') => {
      if (!currentUser) throw new Error("Bitte einloggen.");
      const amountInKnuts = currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k });
      
      // 1. Die Wette im System verbuchen (Logik-RPC)
      const { error } = await supabase.rpc('place_bet', { p_event_id: eventId, p_user_id: currentUser.id, p_amount: amountInKnuts, p_choice: choice });
      if (error) throw error;

      // 2. Transaktion manuell loggen, damit der Nutzer sie im Verlauf sieht
      const event = bettingEvents.find(e => e.id === eventId);
      const choiceLabel = choice === 'A' ? event?.option_a : event?.option_b;
      
      // Empfänger ist das Gringotts-System (erster Admin als Stellvertreter)
      const systemAdmin = users.find(u => KING_EMAILS.includes(u.email || '')) || currentUser;

      await supabase.from('transactions').insert({
          sender_id: currentUser.id,
          receiver_id: systemAdmin.id,
          amount: amountInKnuts,
          note: `Wetteinsatz: ${event?.title || 'Wette'} | Tipp: ${choiceLabel}`
      });

      await refreshData();
  };

  const handleToggleEventStatus = async (eventId: string, newStatus: BettingEventStatus) => {
    if (!currentUser || !isKing) return;
    await supabase.rpc('toggle_betting_event_status', { p_event_id: eventId, p_status: newStatus });
    await refreshData();
  };

  const handleResolveEvent = async (eventId: string, winner: 'A' | 'B') => {
    if (!currentUser || !isKing) return;
    await supabase.rpc('resolve_betting_event', { p_event_id: eventId, p_winner: winner, p_admin_id: currentUser.id });
    await refreshData();
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!currentUser || !isKing) return;
    await supabase.rpc('delete_betting_event', { p_event_id: eventId });
    await refreshData();
  };

  if (loading) return <LoadingScreen />;
  if (connectionError) return <ConnectionErrorScreen message={connectionError} onRetry={fetchDataWithRetry} />;
  if (currentUser?.is_deleted) return <AccountDeletedScreen />;
  if (emailForVerification) return <OtpScreen email={emailForVerification} onVerify={handleVerifyOtp} onBack={() => setEmailForVerification(null)} error={authError} />;
  if (!currentUser) return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} />;

  return (
    <>
      <div className="bg-gradient-to-br from-[#121212] to-[#1a1a1a] min-h-screen text-white font-sans selection:bg-white/30 selection:text-white">
        <Header currentUser={currentUser} onLogout={handleLogout} />
        <main className="relative">
          <Dashboard
            currentUser={currentUser}
            users={users}
            transactions={transactions}
            onSendMoney={handleSendMoney}
            isKing={isKing}
            kingEmails={KING_EMAILS}
            globalTransactions={globalTransactions}
            onUpdateUser={handleUpdateUser}
            onSoftDeleteUser={handleSoftDeleteUser}
            onRestoreUser={handleRestoreUser}
            onUpdateProfile={handleUpdateProfile}
            onUpdatePassword={handleUpdatePassword}
            bettingEvents={bettingEvents}
            bets={bets}
            onPlaceBet={handlePlaceBet}
            onCreateEvent={handleCreateEvent}
            onResolveEvent={handleResolveEvent}
            onToggleEventStatus={handleToggleEventStatus}
            onDeleteEvent={handleDeleteEvent}
          />
        </main>
      </div>
       <NotificationCenter notifications={notifications} onRemove={removeNotification} />
    </>
  );
};

export default App;
