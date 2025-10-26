import React, { useState, useEffect, useCallback } from 'react';
import type { User, Transaction } from './types';
import { House } from './types';
import LoginScreen from './components/LoginScreen';
import OtpScreen from './components/OtpScreen';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import ConnectionErrorScreen from './components/ConnectionErrorScreen';
import AccountDeletedScreen from './components/AccountDeletedScreen';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';
import { formatCurrency } from './utils';

const KING_EMAIL = 'luca.lombino@icloud.com';

const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [emailForVerification, setEmailForVerification] = useState<string | null>(null);
  const [isKing, setIsKing] = useState(false);
  const [globalTransactions, setGlobalTransactions] = useState<Transaction[]>([]);

  const refreshData = useCallback(async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if(sessionError) throw sessionError;

    const userIsKing = session?.user?.email === KING_EMAIL;
    setIsKing(userIsKing);

     if (!session?.user) {
        setCurrentUser(null);
        setUsers([]);
        setTransactions([]);
        setGlobalTransactions([]);
        setIsKing(false);
        return;
    }

    // Fetch all users
    const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');
    if (usersError) throw usersError;
    setUsers(usersData || []);

    const currentUserData = usersData?.find(u => u.id === session.user.id) || null;
    
    if (currentUserData?.is_deleted) {
      // Set current user with a flag to show the deleted screen, but don't let them access dashboard
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
    } else {
        setTransactions([]);
    }

    if (userIsKing) {
      const { data: globalTransData, error: globalTransError } = await supabase
          .from('transactions')
          .select('*, sender:users!sender_id(id, name, house), receiver:users!receiver_id(id, name, house)')
          .order('created_at', { ascending: false });
      
      if (globalTransError) throw globalTransError;
      setGlobalTransactions(globalTransData || []);
    } else {
        setGlobalTransactions([]);
    }
  }, []);
  
  const initialLoad = useCallback(async () => {
    setLoading(true);
    setConnectionError(null);

    if (!isSupabaseConfigured) {
        setConnectionError('Die Supabase-Zugangsdaten fehlen! Bitte öffne die Datei `supabaseClient.ts` und trage deine Supabase URL und deinen anon key ein. Du findest diese Werte in deinem Supabase-projekt unter "Project Settings" > "API".');
        setLoading(false);
        return;
    }

    try {
        const dataPromise = refreshData();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 1500));
        await Promise.all([dataPromise, timeoutPromise]);
    } catch (error: any) {
        console.error("Error loading initial data:", error);
        if (error.message.includes('Failed to fetch')) {
             setConnectionError('Verbindung zum Server fehlgeschlagen. Bitte überprüfe deine Internetverbindung und stelle sicher, dass deine Supabase-Zugangsdaten in `supabaseClient.ts` korrekt sind.');
        } else {
             setConnectionError(`Ein unerwarteter Fehler ist aufgetreten: ${error.message}`);
        }
    } finally {
        setLoading(false);
    }
  }, [refreshData]);


  useEffect(() => {
    initialLoad();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        if(newSession) {
            refreshData().catch(error => {
                 if (error.message.includes('Failed to fetch')) {
                    setConnectionError('Verbindung zum Server verloren. Bitte überprüfe deine Internetverbindung.');
                 }
            });
        } else {
            // Handles logout
            setCurrentUser(null);
            setUsers([]);
            setTransactions([]);
            setGlobalTransactions([]);
            setIsKing(false);
        }
    });

    return () => subscription.unsubscribe();
  }, [initialLoad, refreshData]);

  const handleRegister = async (name: string, house: House, password: string, email: string) => {
    setAuthError(null);
    try {
      if (password.length < 6) {
        throw new Error("Das Passwort muss mindestens 6 Zeichen lang sein.");
      }
      
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            name: name.trim(),
            house: house,
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error("Registrierung fehlgeschlagen, bitte versuche es erneut.");
      
      setEmailForVerification(email);

    } catch (error: any) {
      if (error.message.includes("Failed to fetch")) {
        setAuthError("Verbindung zum Server fehlgeschlagen. Bitte überprüfe deine Internetverbindung und die Supabase-Konfiguration.");
      } else if (error.message.includes("User already registered")) {
        setAuthError("Ein Nutzer mit dieser E-Mail-Adresse existiert bereits.");
      } else {
        setAuthError(error.message || 'Registrierung fehlgeschlagen.');
      }
    }
  };

  const handleVerifyOtp = async (email: string, token: string) => {
    setAuthError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup',
      });
      if (error) throw error;
      setEmailForVerification(null);
    } catch (error: any) {
      if (error.message.includes("Failed to fetch")) {
          setAuthError("Verbindung zum Server fehlgeschlagen. Bitte überprüfe deine Internetverbindung.");
      } else {
          setAuthError(error.message || 'Ungültiger oder abgelaufener Code.');
      }
    }
  };


  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
        });
        if (signInError) throw signInError;
        // onAuthStateChange will handle the session update and data refresh
    } catch (error: any) {
        if (error.message.includes("Failed to fetch")) {
            setAuthError("Verbindung zum Server fehlgeschlagen. Bitte überprüfe deine Internetverbindung.");
        } else if (error.message.includes("Invalid login credentials")) {
            setAuthError("Falsche E-Mail-Adresse oder falsches Passwort.");
        } else {
            setAuthError(error.message || 'Einloggen fehlgeschlagen.');
        }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will clear the state
  };

  const handleSendMoney = async (receiverIds: string[], amountInKnuts: number, note?: string) => {
    if (!currentUser) throw new Error("Nicht eingeloggt.");
    if (amountInKnuts <= 0) throw new Error("Betrag muss positiv sein.");
    if (receiverIds.length === 0) throw new Error("Kein Empfänger ausgewählt.");

    const totalAmount = amountInKnuts * receiverIds.length;
    if (totalAmount > currentUser.balance) {
      throw new Error("Nicht genügend Guthaben.");
    }

    // Use an RPC function to ensure atomic transaction
    for (const receiverId of receiverIds) {
        const { error } = await supabase.rpc('send_money', {
            amount_in: amountInKnuts,
            note_in: note || '',
            receiver_id_in: receiverId,
            sender_id_in: currentUser.id,
        });

        if (error) {
            console.error('Transaction error:', error);
            throw new Error(`Transaktion an ${users.find(u => u.id === receiverId)?.name || 'Unbekannt'} fehlgeschlagen: ${error.message}`);
        }
    }
    
    // Refresh data after successful transactions
    await refreshData();
  };

  const handleUpdateUser = async (userId: string, updates: { name: string; house: House; balance: number }) => {
    if (!isKing) throw new Error("Nur der King kann Nutzerdaten ändern.");

    const originalUser = users.find(u => u.id === userId);
    if (!originalUser) throw new Error("Nutzer nicht gefunden.");

    const { error } = await supabase
      .from('users')
      .update({ name: updates.name, house: updates.house, balance: updates.balance })
      .eq('id', userId);

    if (error) throw error;

    // Check if balance was changed and log a special transaction if so
    if (originalUser.balance !== updates.balance && currentUser) {
        const note = `ADMIN_BALANCE_CHANGE::${currentUser.id}::${updates.balance}`;
        await supabase.from('transactions').insert({
            sender_id: currentUser.id, // The King is the "sender" of the change
            receiver_id: userId,
            amount: 0, // No actual money transfer, just a log
            note: note,
        });
    }

    await refreshData();
  };

  const handleSoftDeleteUser = async (userId: string) => {
    if (!isKing) throw new Error("Nur der King kann Nutzer löschen.");
    const { error } = await supabase
        .from('users')
        .update({ is_deleted: true })
        .eq('id', userId);
    if (error) throw error;
    await refreshData();
  };

  const handleRestoreUser = async (userId: string) => {
    if (!isKing) throw new Error("Nur der King kann Nutzer wiederherstellen.");
    const { error } = await supabase
        .from('users')
        .update({ is_deleted: false })
        .eq('id', userId);
    if (error) throw error;
    await refreshData();
  };


  if (loading) {
    return <LoadingScreen />;
  }
  
  if (connectionError) {
    return <ConnectionErrorScreen message={connectionError} onRetry={initialLoad} />;
  }

  if (currentUser?.is_deleted) {
      return <AccountDeletedScreen />;
  }

  return (
    <>
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <main className="min-h-screen">
         {!session ? (
            emailForVerification ? (
                 <OtpScreen 
                    email={emailForVerification}
                    onVerify={handleVerifyOtp}
                    onBack={() => {
                        setEmailForVerification(null);
                        setAuthError(null);
                    }}
                    error={authError}
                 />
            ) : (
                <LoginScreen
                    onLogin={handleLogin}
                    onRegister={handleRegister}
                    error={authError}
                />
            )
         ) : currentUser ? (
          <Dashboard
            currentUser={currentUser}
            users={users}
            transactions={transactions}
            onSendMoney={handleSendMoney}
            isKing={isKing}
            globalTransactions={globalTransactions}
            onUpdateUser={handleUpdateUser}
            onSoftDeleteUser={handleSoftDeleteUser}
            onRestoreUser={handleRestoreUser}
          />
        ) : (
            // This state can happen briefly while currentUser is being fetched after session is set.
            <div className="flex justify-center items-center h-screen">
                <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        )}
      </main>
    </>
  );
};

export default App;
