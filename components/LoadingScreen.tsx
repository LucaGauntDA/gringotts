import React from 'react';

const poemLines = [
  "Fremder, komm du nur herein,",
  "Hab Acht jedoch und bläu’s dir ein,",
  "Wer der Sünde Gier will dienen",
  "Und will nehmen, nicht verdienen,",
  "Der wird voller Pein verlieren.",
  "Wenn du suchst in diesen Hallen",
  "Einen Schatz, dem du verfallen,",
  "Dieb, sei gewarnt und sage dir,",
  "Mehr als Gold harrt deiner hier.",
];

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#121212] flex flex-col items-center justify-center z-50 animate-fadeIn">
      <div className="text-center p-8">
        <div className="font-aboreto text-lg md:text-xl text-[rgba(255,255,255,0.9)] whitespace-pre-wrap leading-relaxed">
          {poemLines.join('\n')}
        </div>
        <div className="mt-12 flex justify-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
