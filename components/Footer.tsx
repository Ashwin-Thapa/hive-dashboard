import React from 'react';

interface FooterProps {
    onHistoryClick: () => void;
}

const Footer: React.FC<FooterProps> = ({ onHistoryClick }) => {
    return (
        <footer className="flex flex-col items-center p-6 mt-8 space-y-4 text-center border-t border-gray-200">
            <button
                onClick={onHistoryClick}
                className="bg-bwise-yellow/80 text-slate-900 font-bold py-2 px-4 rounded-lg hover:bg-bwise-yellow transition-colors duration-200"
            >
                View Full Hive History
            </button>
            <p className="text-sm text-gray-600">
                Bwise a Project by Le Organica (2024)
            </p>
        </footer>
    );
};

export default Footer;