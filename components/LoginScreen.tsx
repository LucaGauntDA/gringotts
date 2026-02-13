
import React, { useState } from 'react';
import { House } from '../types';
import { EyeIcon, EyeSlashIcon } from './icons';

interface LoginScreenProps {
  onLogin: (identifier: string, password: string) => void;
  onRegister: (name: string, house: House, password: string, email: string) => void;
  error: string | null;
  isLoading?: boolean;
}

const houseDetails = {
    [House.Gryffindor]: { color: "border-red-500", label: "Gryffindor" },
    [House.Slytherin]: { color: "border-green-500", label: "Slytherin" },
    [House.Hufflepuff]: { color: "border-yellow-400", label: "Hufflepuff" },
    [House.Ravenclaw]: { color: "border-blue-500", label: "Ravenclaw" },
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onRegister, error, isLoading = false }) => {
  // Geändert auf false, damit standardmäßig der Login-Screen angezeigt wird
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [house, setHouse] = useState<House | null>(null);
  const [localError, setLocalError] = useState('');

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
    if (email && password) {
      onLogin(email, password);
    }
  };

  const commonInputStyles = "w-full p-4 bg-white/5 border border-white/20 rounded-2xl focus:ring-2 focus:ring-white/60 focus:bg-white/10 focus:border-white/40 focus:outline-none transition-all duration-300";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-24">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-4xl font-black text-center mb-8 leading-tight tracking-widest uppercase opacity-90">
          Gringotts
        </h1>
        <div className="bg-[#1c1c1c]/60 backdrop-blur-2xl rounded-3xl p-8 border border-white/20 shadow-2xl min-h-[400px] flex flex-col justify-center">
          {isLoading ? (
            <div className="space-y-6 animate-pulse w-full">
              <div className="h-8 bg-white/10 rounded-lg w-1/3 mx-auto mb-8"></div>
              <div className="h-14 bg-white/5 rounded-2xl w-full border border-white/5"></div>
              <div className="h-14 bg-white/5 rounded-2xl w-full border border-white/5"></div>
              <div className="h-14 bg-white/10 rounded-full w-full mt-6"></div>
              <div className="h-4 bg-white/5 rounded w-1/2 mx-auto mt-4"></div>
            </div>
          ) : isRegistering ? (
            <form onSubmit={handleRegister} className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-center">Konto erstellen</h2>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={commonInputStyles} placeholder="Dein Name" required />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={commonInputStyles} placeholder="E-Mail" required />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={commonInputStyles} placeholder="Passwort" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 opacity-70">
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(House).map((h) => (
                  <button type="button" key={h} onClick={() => setHouse(h)} className={`p-3 rounded-xl border-2 transition-all font-bold text-sm ${house === h ? `${houseDetails[h].color} bg-white/10` : 'border-transparent bg-white/5 hover:bg-white/10'}`}>
                      {houseDetails[h].label}
                  </button>
                ))}
              </div>
              {(localError || error) && <p className="text-red-400 text-sm text-center">{localError || error}</p>}
              <button type="submit" className="w-full bg-white text-black py-4 rounded-full font-bold hover:bg-gray-200 transition-all">Konto erstellen</button>
              <button onClick={() => setIsRegistering(false)} className="w-full text-sm opacity-60 hover:opacity-100" type="button">Bereits ein Konto? Login</button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6 animate-fadeIn">
              <h2 className="text-2xl font-bold text-center">Login</h2>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={commonInputStyles} placeholder="E-Mail" required />
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={commonInputStyles} placeholder="Passwort" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 opacity-70">
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <button type="submit" className="w-full bg-white text-black py-4 rounded-full font-bold hover:bg-gray-200 transition-all">Einloggen</button>
              <button onClick={() => setIsRegistering(true)} className="w-full text-sm opacity-60 hover:opacity-100" type="button">Noch kein Konto? Registrieren</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
