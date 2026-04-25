
import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { User } from '../types';
import { Plus, LogOut, User as UserIcon, LayoutDashboard, FileText, Send, Inbox, Archive, MessageSquare } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onQuickAdd: () => void;
}

const NavItem: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white'
        }`
      }
    >
      {children}
    </NavLink>
  );
};

export const Header: React.FC<HeaderProps> = ({ user, onLogout, onQuickAdd }) => {
  const [isProfileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-slate-800/50 backdrop-blur-sm shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
              <span>RMS</span>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <NavItem to="/dashboard"><LayoutDashboard size={18} />Dashboard</NavItem>
              <NavItem to="/documents/issuance"><FileText size={18} />Issuances</NavItem>
              <NavItem to="/documents/released"><Send size={18} />Released</NavItem>
              <NavItem to="/documents/received"><Inbox size={18} />Received</NavItem>
              <NavItem to="/documents/all"><Archive size={18}/>All Documents</NavItem>
              <NavItem to="/chat"><MessageSquare size={18}/>AI Chat</NavItem>
            </nav>
          </div>

          {/* Actions and Profile */}
          <div className="flex items-center gap-4">
            <button
              onClick={onQuickAdd}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 transition-all transform hover:scale-105"
            >
              <Plus size={16} />
              Quick Add
            </button>
            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen(!isProfileOpen)} className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800">
                {user.photoURL ? (
                  <img className="w-full h-full rounded-full object-cover" src={user.photoURL} alt="User profile" />
                ) : (
                  <UserIcon className="text-slate-500 dark:text-slate-400" />
                )}
              </button>
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50">
                  <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
