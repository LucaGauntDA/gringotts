
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
};

const houseBgColors: { [key: string]: string } = {
  Gryffindor: 'bg-red-900',
  Hufflepuff: 'bg-yellow-800',
  Ravenclaw: 'bg-blue-900',
  Slytherin: 'bg-green-900',
};

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-[#121212]/90 backdrop-blur-xl p-4 border-b border-white/5 fixed top-0 left-0 right-0 z-30">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-[1.5rem] md:text-[2.5rem] font-black tracking-widest uppercase text-white/90">
          Gringotts
        </h1>
        {currentUser && (
          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
              <p className="font-semibold text-sm">{currentUser.name}</p>
              <p className={`text-[10px] px-2 py-0.5 rounded-full inline-block border uppercase tracking-widest ${houseColors[currentUser.house]}`}>
                {currentUser.house}
              </p>
            </div>

            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border border-white/20 ${houseBgColors[currentUser.house]}`}>
              {getInitials(currentUser.name)}
            </div>

            <button
              onClick={onLogout}
              className="bg-white/10 hover:bg-white/20 text-white h-10 w-10 rounded-full transition-colors flex items-center justify-center"
              aria-label="Ausloggen"
            >
              <LogoutIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
