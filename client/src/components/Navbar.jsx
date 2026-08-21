import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const Navbar = () => {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
        toast.success("Successfully logged out.");
    };
    return (
        <div className="bg-slate-950 text-slate-100 font-sans sticky top-0 z-50 ">
            <header className="bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <span className="font-bold text-lg text-white tracking-tight">Finance Coach AI</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-full border border-slate-700/50 text-xs text-slate-300">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <span>{user?.email}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold border border-slate-700/80 transition-all duration-200 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </header>
        </div>
    )
}

export default Navbar
