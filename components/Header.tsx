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

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  return (
    <header className="bg-[#121212] p-4 border-b border-[#FFFFFF59] fixed top-0 left-0 right-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-[2rem] md:text-[3.25rem] font-black tracking-wider uppercase">
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