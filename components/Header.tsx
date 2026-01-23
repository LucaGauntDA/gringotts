
import React from 'react';
import type { User } from '../types';
import { LogoutIcon } from './icons';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
}

const houseColors: { [key: string]: string } = {
  Gryffindor: 'border-red-600 text-red-400',
  Hufflepuff: 'border-yellow-400 text-yellow-300',
  Ravenclaw: 'border-blue-600 text-blue-400',
  Slytherin: 'border-green-600 text-green-400',
  Niffler: 'border-yellow-500 text-yellow-500 font-black tracking-tighter shadow-[0_0_15px_rgba(212,175,55,0.4)]',
};

const houseBgColors: { [key: string]: string } = {
  Gryffindor: 'bg-red-900',
  Hufflepuff: 'bg-yellow-800',
  Ravenclaw: 'bg-blue-900',
  Slytherin: 'bg-green-900',
  Niffler: 'bg-gradient-to-br from-[#d4af37] to-[#8a6d3b]',
};

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isNiffler = currentUser?.house === 'Niffler';

  return (
    <header className="bg-[#121212]/80 backdrop-blur-xl p-4 border-b border-white/10 fixed top-0 left-0 right-0 z-30">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className={`text-[2rem] md:text-[3.25rem] font-black tracking-wider uppercase ${isNiffler ? 'niffler-gold' : ''}`}>
          Gringotts
        </h1>
        {currentUser && (
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
              <p className="font-semibold">{currentUser.name}</p>
              <p className={`text-sm px-2 py-0.5 rounded-full inline-block border ${houseColors[currentUser.house]}`}>
                {currentUser.house}
              </p>
            </div>

            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white/50 ${houseBgColors[currentUser.house]} ${isNiffler ? 'animate-pulse' : ''}`}>
              {getInitials(currentUser.name)}
            </div>

            <button
              onClick={onLogout}
              className="bg-white hover:bg-gray-200 text-black font-bold h-12 w-12 rounded-full transition-colors duration-300 flex items-center justify-center"
              aria-label="Ausloggen"
            >
              <LogoutIcon className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
