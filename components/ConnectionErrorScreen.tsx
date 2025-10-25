import React from 'react';

interface ConnectionErrorScreenProps {
  message: string;
  onRetry: () => void;
}

const ConnectionErrorScreen: React.FC<ConnectionErrorScreenProps> = ({ message, onRetry }) => {
  return (
    <div className="fixed inset-0 bg-[#121212] flex flex-col items-center justify-center z-50 animate-fadeIn p-4">
      <div className="text-center bg-[#FFFFFF21] rounded-3xl p-8 border border-[#FFFFFF59] max-w-lg w-full">
        <h2 className="text-3xl font-bold text-red-400 mb-4">Verbindungsfehler</h2>
        <p className="text-white/80 mb-8">{message}</p>
        <button
          onClick={onRetry}
          className="w-full max-w-xs mx-auto text-black bg-white hover:bg-gray-200 font-bold rounded-full text-base px-5 text-center transition-colors duration-300 h-[3.75rem]"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
};

export default ConnectionErrorScreen;
