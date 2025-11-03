import React, { useState, useEffect, useCallback } from 'react';
import type { User, Transaction, MoneyRequest } from './types';
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
import { currencyToKnuts, knutsToCanonical } from './utils';

const ORIGINAL_KING_EMAIL = 'luca.lombino@icloud.com';
const KING_EMAILS = [ORIGINAL_KING_EMAIL, 'da-hauspokal-orga@outlook.com'];

const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [moneyRequests, setMoneyRequests] = useState<MoneyRequest[]>([]);
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

    const userIsKing = KING_EMAILS.includes(session?.user?.email ?? '');
    setIsKing(userIsKing);

     if (!session?.user) {
        setCurrentUser(null);
        setUsers([]);
        setTransactions([]);
        setGlobalTransactions([]);
        setMoneyRequests([]);
        setIsKing(false);
        return;
    }

    // Fetch all users from the new view
    const { data: usersData, error: usersError } = await supabase
        .from('users_with_email')
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

        const { data: requestsData, error: requestsError } = await supabase
            .from('money_requests')
            .select('*, requester:users!requester_id(id, name, house), requestee:users!requestee_id(id, name, house)')
            .or(`requester_id.eq.${currentUserData.id},requestee_id.eq.${currentUserData.id}`)
            .order('created_at', { ascending: false });
        if (requestsError) throw requestsError;
        setMoneyRequests(requestsData || []);
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
      let errorMessage = 'Verbindung fehlgeschlagen. Bitte prüfe deine Internetverbindung und versuche es erneut.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string') {
        errorMessage = (error as any).message;
      }
      
      // Prevent "[object Object]" from ever being displayed
      if (errorMessage === '[object Object]') {
          errorMessage = 'Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.';
      }
      
      setConnectionError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [refreshData]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConnectionError("Supabase ist nicht konfiguriert. Bitte trage die Zugangsdaten in 'supabaseClient.ts' ein.");
      setLoading(false);
      return;
    }

    fetchDataWithRetry();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // When auth state changes, refetch all data.
      fetchDataWithRetry();
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchDataWithRetry]);

  const handleLogin = async (identifier: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password: password,
    });
    if (error) setAuthError(error.message);
  };

  const handleRegister = async (name: string, house: House, password: string, email: string) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          house: house,
          balance: 0,
        },
      },
    });

    if (error) {
      setAuthError(error.message);
    } else if (data.user && !data.session) {
      // User created, but needs email verification
      setEmailForVerification(email);
    }
  };
  
  const handleVerifyOtp = async (email: string, token: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup'
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setEmailForVerification(null);
      // The onAuthStateChange listener will handle fetching data
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      setLoading(false);
    } else {
      // Clear all state on logout
      setSession(null);
      setCurrentUser(null);
      setUsers([]);
      setTransactions([]);
      setMoneyRequests([]);
      setGlobalTransactions([]);
      setIsKing(false);
      setLoading(false);
    }
  };
  
  const handleSendMoney = async (receiverIds: string[], amount: { g: number; s: number; k: number }, note?: string) => {
    if (!currentUser) throw new Error("Benutzer nicht eingeloggt.");
    
    const amountInKnuts = currencyToKnuts({
      galleons: amount.g,
      sickles: amount.s,
      knuts: amount.k
    });
    const totalAmount = amountInKnuts * receiverIds.length;
    
    if (currentUser.balance < totalAmount) {
      throw new Error("Nicht genügend Guthaben.");
    }

    // The function 'send_money_to_multiple' does not exist in the database.
    // We will call the existing 'send_money' function for each receiver individually.
    for (const receiverId of receiverIds) {
      const { error } = await supabase.rpc('send_money', {
        sender_id_in: currentUser.id,
        receiver_id_in: receiverId,
        amount_in: amountInKnuts,
        note_in: `${note || ''}|~|${JSON.stringify(amount)}`
      });
      
      if (error) {
        // If one transaction fails, we stop and report the error.
        // Note that previous transactions in the loop have already succeeded.
        // This is not an atomic operation.
        throw error;
      }
    }
    
    await refreshData();
  };

  const handleUpdateUser = async (userId: string, updates: { name: string; house: House; balance: number }) => {
    if (!isKing || !currentUser) throw new Error("Keine Berechtigung.");
    
    // 1. Fetch the user's current state to get the old balance for logging
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;
    if (!targetUser) throw new Error("Benutzer nicht gefunden.");
    
    const oldBalance = targetUser.balance;

    // 2. Update the user's details in the 'users' table
    const { error: updateError } = await supabase
      .from('users')
      .update({
        name: updates.name,
        house: updates.house,
        balance: updates.balance,
      })
      .eq('id', userId);

    if (updateError) throw updateError;
    
    // 3. If the balance was changed, create a transaction log entry
    if (updates.balance !== oldBalance) {
      const changeAmount = Math.abs(updates.balance - oldBalance);
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          sender_id: currentUser.id,
          receiver_id: userId,
          amount: changeAmount, // Use the absolute change to satisfy the DB constraint
          note: `ADMIN_BALANCE_CHANGE::${currentUser.id}::${userId}::${oldBalance}::${updates.balance}`
        });

      if (transactionError) throw transactionError;
    }
    
    await refreshData();
  };

  const handleSoftDeleteUser = async (userId: string) => {
      if (!isKing) throw new Error("Keine Berechtigung.");
      const { error } = await supabase
          .from('users')
          .update({ is_deleted: true })
          .eq('id', userId);

      if (error) throw error;
      await refreshData();
  };

  const handleRestoreUser = async (userId: string) => {
      if (!isKing) throw new Error("Keine Berechtigung.");
      const { error } = await supabase
          .from('users')
          .update({ is_deleted: false })
          .eq('id', userId);
      if (error) throw error;
      await refreshData();
  };

  const handleCreateRequest = async (requesteeIds: string[], amount: { g: number; s: number; k: number }, note?: string) => {
    if (!currentUser) throw new Error("Benutzer nicht eingeloggt.");
    
    // FIX: Map the amount object to the shape expected by currencyToKnuts
    const amountInKnuts = currencyToKnuts({
      galleons: amount.g,
      sickles: amount.s,
      knuts: amount.k
    });

    const requests = requesteeIds.map(requesteeId => ({
      requester_id: currentUser.id,
      requestee_id: requesteeId,
      amount: amountInKnuts,
      note: note,
      status: 'pending'
    }));
    
    const { error } = await supabase.from('money_requests').insert(requests);
    if (error) throw error;

    await refreshData();
  };
  
  const handleAcceptRequest = async (request: MoneyRequest) => {
    if (!currentUser) throw new Error("Benutzer nicht eingeloggt.");
    if (currentUser.balance < request.amount) throw new Error("Nicht genügend Guthaben.");

    // Use the RPC function to handle the transaction and request update atomically
    const { error } = await supabase.rpc('accept_money_request', {
      p_request_id: request.id,
      p_requester_id: request.requester_id,
      p_requestee_id: request.requestee_id,
      p_amount: request.amount,
      p_note: `Anfrage von ${request.requester?.name || 'Unbekannt'}: ${request.note || ''}`
    });

    if (error) throw error;
    
    await refreshData();
  };

  const handleRejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('money_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);
    if (error) throw error;
    await refreshData();
  };

  const handleUpdateProfile = async (updates: { name?: string; house?: House; }) => {
    if (!currentUser) throw new Error("Benutzer nicht eingeloggt.");
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', currentUser.id);
    if (error) throw error;
    await refreshData();
  };

  const handleUpdatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };


  if (loading) {
    return <LoadingScreen />;
  }
  
  if (connectionError) {
    return <ConnectionErrorScreen message={connectionError} onRetry={fetchDataWithRetry} />;
  }
  
  if (currentUser?.is_deleted) {
    return <AccountDeletedScreen />;
  }

  if (emailForVerification) {
    return <OtpScreen email={emailForVerification} onVerify={handleVerifyOtp} onBack={() => setEmailForVerification(null)} error={authError} />;
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} error={authError} />;
  }

  return (
    <div className="bg-[#121212] text-white min-h-screen">
      <Header currentUser={currentUser} onLogout={handleLogout} />
      <main>
        <Dashboard
          currentUser={currentUser}
          users={users}
          transactions={transactions}
          moneyRequests={moneyRequests}
          onSendMoney={handleSendMoney}
          isKing={isKing}
          kingEmails={KING_EMAILS}
          globalTransactions={globalTransactions}
          onUpdateUser={handleUpdateUser}
          onSoftDeleteUser={handleSoftDeleteUser}
          onRestoreUser={handleRestoreUser}
          onCreateRequest={handleCreateRequest}
          onAcceptRequest={handleAcceptRequest}
          onRejectRequest={handleRejectRequest}
          onUpdateProfile={handleUpdateProfile}
          onUpdatePassword={handleUpdatePassword}
        />
      </main>
    </div>
  );
};

// FIX: Export the App component as a default export.
export default App;