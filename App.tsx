import React, { useState, useEffect, useCallback } from 'react';
import type { User, Transaction } from './types';
import { House } from './types';
import LoginScreen from './components/LoginScreen';
import OtpScreen from './components/OtpScreen';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import ConnectionErrorScreen from './components/ConnectionErrorScreen';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';

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
    setCurrentUser(currentUserData);
    
    if (currentUserData) {
        const { data: transData, error: transError } = await supabase
            .from('transactions')
            .select('*, sender:users!sender_id(id, name, house), receiver:users!receiver_id(id, name, house)')
            .or(`sender_id.eq.${currentUserData.id},receiver_id.eq.${currentUserData.id}`);
        
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
    } catch (error: any) {
        if (error.message.includes("Failed to fetch")) {
            setAuthError("Verbindung zum Server fehlgeschlagen. Bitte überprüfe deine Internetverbindung und die Supabase-Konfiguration.");
        } else {
            setAuthError('E-Mail oder Passwort ist falsch.');
        }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange will handle state cleanup
    setEmailForVerification(null);
  };

  const handleSendMoney = async (receiverId: string, amountInKnuts: number) => {
    if (!currentUser) return;
    
    const { error } = await supabase.rpc('send_money', {
        sender_id_in: currentUser.id,
        receiver_id_in: receiverId,
        amount_in: amountInKnuts,
    });
    
    if (error) {
        console.error("Transaction failed:", error);
        if (error.message.includes('Failed to fetch')) {
             throw new Error('Verbindung zum Server fehlgeschlagen.');
        }
        throw new Error(error.message || 'Überweisung fehlgeschlagen.');
    }
    await refreshData();
  };

  if (loading) {
    return <LoadingScreen />;
  }
  
  if (connectionError) {
    return <ConnectionErrorScreen message={connectionError} onRetry={initialLoad} />;
  }

  return (
    <div className="bg-[#121212] min-h-screen">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <main>
        {!currentUser ? (
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
            <LoginScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} />
          )
        ) : (
          <Dashboard
            currentUser={currentUser}
            users={users}
            transactions={transactions}
            onSendMoney={handleSendMoney}
            isKing={isKing}
            globalTransactions={globalTransactions}
          />
        )}
      </main>
    </div>
  );
};

export default App;