import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-11/12 md:w-3/4 lg:w-1/2 max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-800 transition-colors text-2xl"
                aria-label="Close modal"
            >
                &times;
            </button>
        </div>
        <div className="overflow-y-auto">
            {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;