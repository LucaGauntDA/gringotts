import React, { useState, useEffect, useCallback } from 'react';
import type { User, Transaction } from './types';
import { House } from './types';
import LoginScreen from './components/LoginScreen';
import OtpScreen from './components/OtpScreen';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel';
import Header from './components/Header';
import LoadingScreen from './components/LoadingScreen';
import { supabase } from './supabaseClient';
import type { AuthSession } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['da-hauspokal-orga@outlook.com'];
const ADMIN_NAMES = ['Kingsley'];

const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailForVerification, setEmailForVerification] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
     if (!session?.user) {
        setCurrentUser(null);
        setUsers([]);
        setTransactions([]);
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
        const query = currentUserData.is_admin
            ? supabase.from('transactions').select('*, sender:users!sender_id(id, name, house), receiver:users!receiver_id(id, name, house)')
            : supabase.rpc('get_user_transactions');
        
        const { data: transData, error: transError } = await query;
        if (transError) throw transError;
        setTransactions(transData || []);
    } else {
        setTransactions([]);
    }
  }, []);


  useEffect(() => {
    const initialLoad = async () => {
        setLoading(true);
        try {
            const dataPromise = refreshData();
            // Wait for at least 3 seconds to show the loading screen
            const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
            await Promise.all([dataPromise, timeoutPromise]);
        } catch (error: any) {
            console.error("Error loading initial data:", error);
        } finally {
            setLoading(false);
        }
    };
    
    initialLoad();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession);
        refreshData();
    });

    return () => subscription.unsubscribe();
  }, [refreshData]);

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

      // Profile is created by a database trigger.
      // We check if the registered email is one of the special admin emails or names and grant admin rights.
      const isAdminByEmail = ADMIN_EMAILS.includes(email.toLowerCase());
      const isAdminByName = ADMIN_NAMES.map(n => n.toLowerCase()).includes(name.trim().toLowerCase());

      if (isAdminByEmail || isAdminByName) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ is_admin: true })
          .eq('id', data.user.id);
        
        if (updateError) {
          // This might fail if the trigger hasn't run yet, or due to RLS, but it's our best shot from the client.
          console.error('Error granting admin rights:', updateError.message);
        }
      }
      
      setEmailForVerification(email);

    } catch (error: any) {
      if (error.message.includes("User already registered")) {
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
      setAuthError(error.message || 'Ungültiger oder abgelaufener Code.');
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
        setAuthError('E-Mail oder Passwort ist falsch.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setTransactions([]);
    setUsers([]);
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
        throw new Error(error.message || 'Überweisung fehlgeschlagen.');
    }
    await refreshData();
  };

  // --- Admin Functions ---
  const handleUpdateBalance = async (userId: string, newBalanceInKnuts: number) => {
    if (!currentUser?.is_admin) return;
    const { error } = await supabase.from('users').update({ balance: newBalanceInKnuts }).eq('id', userId);
    if (error) console.error("Balance update failed:", error); else await refreshData();
  };

  const handleUpdateUser = async (userId: string, data: { name: string; house: House }) => {
    if (!currentUser?.is_admin) return;
    const { error } = await supabase.from('users').update(data).eq('id', userId);
    if (error) console.error("User update failed:", error); else await refreshData();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!currentUser?.is_admin || currentUser.id === userId) return;
    // Assuming cascade delete is set up in Supabase for transactions
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) console.error("User delete failed:", error); else await refreshData();
  };

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    if (!currentUser?.is_admin || currentUser.id === userId) return;
    const { error } = await supabase.from('users').update({ is_admin: !currentAdminStatus }).eq('id', userId);
    if (error) console.error("Admin toggle failed:", error); else await refreshData();
  };

  const handleAdminCreateTransaction = async (senderId: string, receiverId: string, amountInKnuts: number) => {
     if (!currentUser?.is_admin) return;
     const { error } = await supabase.rpc('send_money', {
        sender_id_in: senderId,
        receiver_id_in: receiverId,
        amount_in: amountInKnuts,
    });
    if (error) {
        console.error("Admin transaction failed:", error);
        throw new Error(error.message || 'Überweisung fehlgeschlagen.');
    }
    await refreshData();
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!currentUser?.is_admin) return;
    const { error } = await supabase.from('transactions').delete().eq('id', transactionId);
    if (error) console.error("Transaction delete failed:", error); else await refreshData();
  };
  
  const isAdmin = !!currentUser?.is_admin;

  if (loading) {
    return <LoadingScreen />;
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
        ) : isAdmin ? (
          <AdminPanel 
            currentUser={currentUser}
            users={users} 
            transactions={transactions} 
            onUpdateBalance={handleUpdateBalance}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onToggleAdmin={handleToggleAdmin}
            onAdminCreateTransaction={handleAdminCreateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        ) : (
          <Dashboard
            currentUser={currentUser}
            users={users}
            transactions={transactions}
            onSendMoney={handleSendMoney}
          />
        )}
      </main>
    </div>
  );
};

export default App;
