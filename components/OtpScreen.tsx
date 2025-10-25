import React, { useState } from 'react';

interface OtpScreenProps {
  email: string;
  onVerify: (email: string, token: string) => void;
  onBack: () => void;
  error: string | null;
}

const OtpScreen: React.FC<OtpScreenProps> = ({ email, onVerify, onBack, error }) => {
  const [token, setToken] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token) {
      onVerify(email, token);
    }
  };

  const commonInputStyles = "w-full p-4 bg-[#FFFFFF21] border border-[#FFFFFF59] rounded-2xl focus:ring-2 focus:ring-white focus:outline-none transition-shadow tracking-widest text-center";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-[3.25rem] font-black text-center mb-8 leading-tight">
          Bestätigung
        </h1>
        <div className="bg-[#FFFFFF21] rounded-3xl p-8 border border-[#FFFFFF59]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-[2.25rem] font-bold text-center leading-tight">Code eingeben</h2>
            <p className="text-center opacity-80">
              Wir haben einen Bestätigungscode an <strong>{email}</strong> gesendet.
            </p>
            <div>
              <label htmlFor="otp-token" className="block mb-2 text-sm font-medium opacity-80">Bestätigungscode</label>
              <input
                type="text"
                id="otp-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className={commonInputStyles}
                placeholder="123456"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button type="submit" className="w-full text-black bg-white hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-300 font-bold rounded-full text-base px-5 text-center transition-colors duration-300 h-[3.75rem]">
              Konto bestätigen
            </button>
            <p className="text-sm text-center">
              Falsche E-Mail-Adresse?{' '}
              <button onClick={onBack} className="font-bold text-white hover:underline" type="button">
                Zurück gehen
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OtpScreen;