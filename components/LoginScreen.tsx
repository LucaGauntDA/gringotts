import React, { useState } from 'react';
import { House } from '../types';
import { InfoIcon, EyeIcon, EyeSlashIcon } from './icons';

interface LoginScreenProps {
  onLogin: (identifier: string, password: string) => void;
  onRegister: (name: string, house: House, password: string, email: string) => void;
  error: string | null;
}

const houseDetails = {
    [House.Gryffindor]: { color: "border-red-500", label: "Gryffindor" },
    [House.Slytherin]: { color: "border-green-500", label: "Slytherin" },
    [House.Hufflepuff]: { color: "border-yellow-400", label: "Hufflepuff" },
    [House.Ravenclaw]: { color: "border-blue-500", label: "Ravenclaw" },
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister, error }) => {
  const [isRegistering, setIsRegistering] = useState(true);

  // States for both forms
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [house, setHouse] = useState<House | null>(null);
  const [localError, setLocalError] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!house) {
      setLocalError('Bitte wähle ein Haus aus.');
      return;
    }
    if (name && password && email) {
      onRegister(name, house, password, email);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (email && password) {
      onLogin(email, password); // `email` state holds the identifier
    }
  };

  const clearForm = () => {
    setName('');
    setPassword('');
    setShowPassword(false);
    setEmail('');
    setHouse(null);
    setLocalError('');
  };

  const commonInputStyles = "w-full p-4 bg-[#FFFFFF21] border border-[#FFFFFF59] rounded-2xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow";

  return (
    <>
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowInfoModal(false)}>
            <div className="bg-[#2a2a2a] rounded-3xl p-8 border border-[#FFFFFF59] max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold mb-4">Warum du deine E-Mail angeben musst</h3>
                <p className="opacity-80 mb-6">
                    Deine E-Mail-Adresse wird für die Anmeldung benötigt. Bitte gib deine echte E-Mail-Adresse an. Sie wird sicher in <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-white font-semibold underline">Supabase</a> gespeichert. In der Regel erhältst du keine Bestätigungs-E-Mail. Falls doch, klicke bitte auf den Link darin oder gib den Code in dem dann erscheinenden Fenster ein.
                </p>
                <button onClick={() => setShowInfoModal(false)} className="w-full text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base px-5 text-center h-12">
                    Verstanden!
                </button>
            </div>
        </div>
      )}
      <div className="min-h-screen flex items-center justify-center p-4 pt-24 md:pt-28">
        <div className="w-full max-w-md mx-auto">
          <h1 className="text-4xl sm:text-[3.25rem] font-black text-center mb-8 leading-tight">
            Willkommen bei Gringotts
          </h1>
          <div className="bg-[#FFFFFF21] rounded-3xl p-6 sm:p-8 border border-[#FFFFFF59]">
            {isRegistering ? (
              <form onSubmit={handleRegister} className="space-y-6">
                <h2 className="text-3xl sm:text-[2.25rem] font-bold text-center leading-tight">Neues Konto</h2>
                <div>
                  <label htmlFor="name-reg" className="block mb-2 text-sm font-medium opacity-80">Name</label>
                  <input
                    type="text"
                    id="name-reg"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={commonInputStyles}
                    placeholder="Name"
                    required
                  />
                </div>
                 <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="email-reg" className="text-sm font-medium opacity-80">E-Mail</label>
                    <button type="button" onClick={() => setShowInfoModal(true)} aria-label="Informationen zur E-Mail-Nutzung">
                        <InfoIcon className="w-5 h-5 opacity-70 hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                  <input
                    type="email"
                    id="email-reg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={commonInputStyles}
                    placeholder="E-Mail"
                    required
                  />
                </div>
                 <div>
                  <label htmlFor="password-reg" className="block mb-2 text-sm font-medium opacity-80">Passwort</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password-reg"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={commonInputStyles}
                      placeholder="Passwort"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/70 hover:text-white"
                      aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium opacity-80">Haus</label>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.values(House).map((h) => (
                      <button type="button" key={h} onClick={() => setHouse(h)} className={`p-4 rounded-2xl border-2 transition-all duration-200 text-center font-bold ${house === h ? `${houseDetails[h].color} bg-white/10` : 'border-transparent bg-[#FFFFFF21] hover:bg-white/10'}`}>
                          {houseDetails[h].label}
                      </button>
                    ))}
                  </div>
                </div>
                {(localError || error) && <p className="text-red-400 text-sm text-center">{localError || error}</p>}
                <button type="submit" className="w-full text-black bg-white hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-300 font-bold rounded-full text-base px-5 text-center transition-colors duration-300 h-[3.75rem]">
                  Registrieren
                </button>
                <p className="text-sm text-center">
                  Schon ein Konto?{' '}
                  <button onClick={() => { setIsRegistering(false); clearForm(); }} className="font-bold text-white hover:underline" type="button">
                    Hier einloggen
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <h2 className="text-3xl sm:text-[2.25rem] font-bold text-center leading-tight">Einloggen</h2>
                <div>
                  <label htmlFor="email-login" className="block mb-2 text-sm font-medium opacity-80">E-Mail</label>
                   <input
                    type="email"
                    id="email-login"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={commonInputStyles}
                    placeholder="E-Mail"
                    required
                  />
                </div>
                 <div>
                  <label htmlFor="password-login" className="block mb-2 text-sm font-medium opacity-80">Passwort</label>
                   <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password-login"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={commonInputStyles}
                      placeholder="Passwort"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/70 hover:text-white"
                      aria-label={showPassword ? "Passwort ausblenden" : "Passwort anzeigen"}
                    >
                      {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <button type="submit" className="w-full text-black bg-white hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-300 font-bold rounded-full text-base px-5 text-center transition-colors duration-300 h-[3.75rem]">
                  Einloggen
                </button>
                <p className="text-sm text-center">
                  Noch kein Konto?{' '}
                  <button onClick={() => { setIsRegistering(true); clearForm(); }} className="font-bold text-white hover:underline" type="button">
                    Jetzt registrieren
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginScreen;