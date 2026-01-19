import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 border-t border-slate-700 py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-sm text-gray-400">
        <div>
          <span>Created by </span>
          <span className="font-semibold text-white">Smart Factory</span>
        </div>
        <div>
          <span>Contact: </span>
          <a href="mailto:contact@smartfactory.io" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            contact@smartfactory.io
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
