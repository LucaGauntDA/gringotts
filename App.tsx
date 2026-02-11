
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
import { currencyToKnuts, knutsToCanonical } from './utils';

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
      
      const { data: usersData, error: usersError } = await supabase.from('users_with_email').select('*');
      if (usersError) throw usersError;
      
      const processedUsers = usersData || [];
      setUsers(processedUsers);

      const currentUserData = processedUsers.find(u => u.id === session.user.id) || null;
      if (currentUserData?.is_deleted) {
        setCurrentUser({ ...currentUserData, is_deleted: true });
        return;
      }
      
      // Update User Data
      setCurrentUser(currentUserData);

      setIsKing(KING_EMAILS.some(e => e.toLowerCase() === userEmail) || currentUserData?.is_admin === true);
      
      if (currentUserData) {
        // Transactions: Fetch where user is sender OR receiver. 
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

      if (KING_EMAILS.some(e => e.toLowerCase() === userEmail) || currentUserData?.is_admin === true) {
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
        setConnectionError("Die Verbindung zu Gringotts konnte nicht hergestellt werden.");
      } else {
        console.error("Daten-Sync Fehler", err);
      }
    }
  }, []);

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
      // Explizites Zurücksetzen aller Zustände für den Redirect zum Login-Screen
      setCurrentUser(null);
      setUsers([]);
      setTransactions([]);
      setBettingEvents([]);
      setBets([]);
      setIsKing(false);
      setGlobalTransactions([]);
      setEmailForVerification(null);
      setAuthError(null);
    } catch (err) {
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
          note_in: note || '' 
        });

        if (error) throw error;
      }
      
      addNotification("Überweisung erfolgreich.", "success");
      await refreshData();
    } catch (e: any) {
      addNotification("Fehler: " + (e.message || "Gringotts antwortet nicht"), "error");
    }
  };

  const handlePlaceBet = async (eventId: string, amount: { g: number; s: number; k: number }, choice: 'A' | 'B') => {
    if (!currentUser) return;
    const amountInKnuts = currencyToKnuts({ galleons: amount.g, sickles: amount.s, knuts: amount.k });
    
    if (amountInKnuts <= 0) {
      addNotification("Einsatz muss größer als 0 sein!", "error");
      return;
    }

    if (currentUser.balance < amountInKnuts) {
      addNotification("Nicht genügend Knuts!", "error");
      return;
    }

    const event = bettingEvents.find(e => e.id === eventId);
    const eventTitle = event ? event.title : 'Wette';
    const choiceText = event ? (choice === 'A' ? event.option_a : event.option_b) : choice;
    const noteText = `Wetteinsatz: ${eventTitle} (${choiceText})`;

    // --- OPTIMISTIC UPDATE ---
    const oldBalance = currentUser.balance;
    const newBalance = oldBalance - amountInKnuts;
    
    setCurrentUser({ ...currentUser, balance: newBalance });
    
    const tempTransaction: Transaction = {
      id: 'temp-' + Date.now(),
      sender_id: currentUser.id,
      receiver_id: null,
      amount: amountInKnuts,
      created_at: new Date().toISOString(),
      note: noteText,
      sender: { id: currentUser.id, name: currentUser.name, house: currentUser.house },
      receiver: undefined
    };
    setTransactions(prev => [tempTransaction, ...prev]);

    try {
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', currentUser.id);

      if (balanceError) throw new Error("Fehler beim Geldabzug: " + balanceError.message);

      const { error: betError } = await supabase.from('bets').insert({ 
        event_id: eventId, 
        user_id: currentUser.id, 
        amount: amountInKnuts, 
        choice 
      });

      if (betError) {
        await supabase.from('users').update({ balance: oldBalance }).eq('id', currentUser.id);
        throw new Error("Fehler beim Speichern der Wette: " + betError.message);
      }

      const { error: transError } = await supabase.from('transactions').insert({
        sender_id: currentUser.id,
        receiver_id: null,
        amount: amountInKnuts,
        note: noteText
      });

      if (transError) {
         console.error("Transaktion konnte nicht gespeichert werden:", transError);
         await refreshData();
         throw new Error("Fehler beim Speichern im Verlauf.");
      }

      addNotification("Wette erfolgreich platziert!", "success");
      await refreshData();

    } catch (e: any) {
      setCurrentUser(prev => prev ? { ...prev, balance: oldBalance } : null);
      setTransactions(prev => prev.filter(t => t.id !== tempTransaction.id));
      addNotification(e.message, "error");
    }
  };

  const handleCreateBetEvent = async (title: string, optionA: string, optionB: string) => {
    if (!currentUser) return;
    try {
      const { error } = await supabase.from('betting_events').insert({
        title, option_a: optionA, option_b: optionB, status: BettingEventStatus.OPEN, created_by: currentUser.id
      });
      if (error) throw error;
      addNotification("Wett-Event erstellt.", "success");
      await refreshData();
    } catch (e: any) {
      addNotification(e.message, "error");
    }
  };

  const handleResolveBetEvent = async (eventId: string, winner: 'A' | 'B') => {
    if (!currentUser) return;
    try {
      const { data: allBets, error: fetchError } = await supabase
        .from('bets')
        .select('*')
        .eq('event_id', eventId);
      
      if (fetchError) throw fetchError;

      const betsList = allBets || [];
      const totalPool = betsList.reduce((sum, b) => sum + b.amount, 0);
      const winningBets = betsList.filter(b => b.choice === winner);
      const winningPool = winningBets.reduce((sum, b) => sum + b.amount, 0);

      const event = bettingEvents.find(e => e.id === eventId);
      const winnerName = winner === 'A' ? event?.option_a : event?.option_b;

      if (winningPool > 0) {
        let errorCount = 0;
        for (const bet of winningBets) {
          const share = bet.amount / winningPool;
          const payout = Math.floor(share * totalPool); 

          if (payout > 0) {
            const { data: winnerUser } = await supabase.from('users').select('balance').eq('id', bet.user_id).single();
            
            if (winnerUser) {
              const newBalance = winnerUser.balance + payout;
              await supabase.from('users').update({ balance: newBalance }).eq('id', bet.user_id);
              
              await supabase.from('transactions').insert({
                sender_id: currentUser.id, 
                receiver_id: bet.user_id,
                amount: payout,
                note: `Wettgewinn: ${event?.title} (${winnerName})`
              });
            }
          }
        }
      }

      const { error: updateError } = await supabase
        .from('betting_events')
        .update({ status: BettingEventStatus.RESOLVED, winner: winner })
        .eq('id', eventId);
      
      if (updateError) throw updateError;

      addNotification(`Wette aufgelöst! Gewinner ausgezahlt.`, "success");
      await refreshData();

    } catch (e: any) {
      addNotification("Fehler beim Auflösen: " + e.message, "error");
    }
  };

  const handleToggleBetEventStatus = async (eventId: string, newStatus: BettingEventStatus) => {
    try {
      const { error } = await supabase.from('betting_events').update({ status: newStatus }).eq('id', eventId);
      if (error) throw error;
      addNotification(`Status auf ${newStatus} geändert.`, "info");
      await refreshData();
    } catch (e: any) {
      addNotification(e.message, "error");
    }
  };

  const handleDeleteBetEvent = async (eventId: string) => {
    if (!window.confirm("Dieses Event wirklich löschen?")) return;
    try {
      const { error } = await supabase.from('betting_events').delete().eq('id', eventId);
      if (error) throw error;
      addNotification("Event gelöscht.", "info");
      await refreshData();
    } catch (e: any) {
      addNotification(e.message, "error");
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      // Protokollierung von Kontostands-Änderungen durch Admin
      const oldUser = users.find(u => u.id === userId);
      if (oldUser && updates.balance !== undefined && updates.balance !== oldUser.balance) {
          const diff = updates.balance - oldUser.balance;
          const absDiff = Math.abs(diff);
          
          const adminId = currentUser?.id || null;
          
          // Wir versuchen, die Transaktion korrekt zu loggen.
          // Bei einer Abbuchung (diff < 0) wäre der User der Sender und Admin der Empfänger.
          // Falls RLS dies verbietet (weil auth.uid() != sender_id), fangen wir den Fehler ab, damit das Update trotzdem durchgeht.
          
          const transactionPayload = {
              sender_id: diff > 0 ? adminId : userId,
              receiver_id: diff > 0 ? userId : adminId,
              amount: absDiff,
              note: `Admin-Korrektur: ${diff > 0 ? 'Gutschrift' : 'Abbuchung'}`
          };
          
          const { error: logError } = await supabase.from('transactions').insert(transactionPayload);
          
          if (logError) {
              console.error("Transaktions-Log fehlgeschlagen (evtl. RLS Rechte):", logError);
              // Fallback: Wenn wir als User nicht senden dürfen, loggen wir es als "System-Nachricht" vom Admin an den User mit spezieller Notiz.
              // Dies ist besser als gar kein Log.
              if (diff < 0) {
                  await supabase.from('transactions').insert({
                      sender_id: adminId,
                      receiver_id: userId,
                      amount: absDiff,
                      note: `Admin-Korrektur: MANUELLE ABBUCHUNG (-${absDiff} Knuts)`
                  });
              }
          }
      }

      const { error } = await supabase.from('users').update(updates).eq('id', userId);
      if (error) throw error;
      
      addNotification("Benutzer erfolgreich aktualisiert.", "success");
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
      addNotification("Profil aktualisiert.", "success");
      await refreshData();
    } catch (e: any) {
      addNotification(e.message, "error");
    }
  };

  const handleUpdatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      addNotification("Passwort geändert.", "success");
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
        onCreateEvent={handleCreateBetEvent}
        onResolveEvent={handleResolveBetEvent}
        onToggleEventStatus={handleToggleBetEventStatus}
        onDeleteEvent={handleDeleteBetEvent}
      />
      <NotificationCenter notifications={notifications} onRemove={removeNotification} />
    </div>
  );
};

export default App;
