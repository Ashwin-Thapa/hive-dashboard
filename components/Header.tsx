import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="flex flex-col items-center text-center p-4 space-y-2">
        <img src="/images/logo.jpg" alt="Bwise Le Organica Logo" className="h-20 w-auto object-contain" />
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800">Hive Monitoring Dashboard</h1>
            <p className="text-md text-gray-500">A Bwise Le Organica Project</p>
        </div>
    </header>
  );
};

export default Header;