import React from 'react';

const AccountDeletedScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#121212] flex flex-col items-center justify-center z-50 animate-fadeIn p-4">
      <div className="text-center bg-[#FFFFFF21] rounded-3xl p-8 border border-[#FFFFFF59] max-w-lg w-full">
        <h2 className="text-3xl font-bold text-yellow-400 mb-4">Kontozugriff gesperrt</h2>
        <p className="text-white/80 mb-8">
          Dein Gringotts-Konto wurde gelöscht. Wenn du glaubst, dass dies ein Fehler ist, oder dein Konto wiederherstellen möchtest, wende dich bitte an Lusa-Luca per WhatsApp.
        </p>
         <button
          onClick={() => window.location.reload()}
          className="w-full max-w-xs mx-auto text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base px-5 text-center transition-colors duration-300 h-[3.75rem]"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
};

export default AccountDeletedScreen;
