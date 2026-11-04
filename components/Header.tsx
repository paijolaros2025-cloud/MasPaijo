
import React from 'react';
import { Image as ImageIcon } from './icons';

interface Props {
  onOpenImageGenerator: () => void;
}

const Header: React.FC<Props> = ({ onOpenImageGenerator }) => {
  return (
    <header className="bg-gradient-to-r from-teal-500 to-emerald-500 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="https://i.imghippo.com/files/nrnU9752iR.png" 
            alt="Logo MIN 1 Banyuwangi" 
            className="h-12 w-12 mr-4 bg-white p-1 rounded-full shadow-sm"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-xl md:text-2xl font-bold text-white">
            SuperApp Kisi Soal
          </h1>
        </div>
        <button
          onClick={onOpenImageGenerator}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors text-sm font-medium"
        >
          <ImageIcon className="w-5 h-5" />
          <span className="hidden sm:inline">Buat Gambar</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
