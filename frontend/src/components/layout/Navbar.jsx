import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Plus, Compass, User, LogOut, LogIn, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const displayName = profile?.display_name || user?.username || 'Traveler';
  const avatarUrl = profile?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-sand-200 shadow-warm-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo / Brand */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus-visible:ring-offset-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-terracotta-600 flex items-center justify-center text-white shadow-warm-sm group-hover:bg-terracotta-700 transition-colors">
              <Compass className="w-5 h-5 transition-transform group-hover:rotate-45 duration-300" />
            </div>
            <div>
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-sand-950 block leading-tight">
                TripPlanner
              </span>
              <span className="text-[11px] font-medium tracking-wide uppercase text-terracotta-700 block">
                Earthy Itineraries
              </span>
            </div>
          </Link>

          {/* Navigation & User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <Link to="/">
                  <Button
                    variant={location.pathname === '/' ? 'secondary' : 'ghost'}
                    size="sm"
                    leftIcon={<MapPin className="w-4 h-4 text-terracotta-600" />}
                  >
                    My Trips
                  </Button>
                </Link>

                <Link to="/trips/generate">
                  <Button
                    variant={location.pathname === '/trips/generate' ? 'secondary' : 'ghost'}
                    size="sm"
                    leftIcon={<Sparkles className="w-4 h-4 text-terracotta-600" />}
                    className="hidden sm:inline-flex"
                  >
                    AI Planner
                  </Button>
                  <Button
                    variant={location.pathname === '/trips/generate' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="sm:hidden p-2"
                    aria-label="AI Planner"
                  >
                    <Sparkles className="w-4 h-4 text-terracotta-600" />
                  </Button>
                </Link>

                <Link to="/trips/new">
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus className="w-4 h-4" />}
                    className="hidden sm:inline-flex"
                  >
                    Plan a Trip
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="sm:hidden p-2"
                    aria-label="Plan a Trip"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </Link>

                {/* User Dropdown */}
                <div className="relative ml-1 sm:ml-2">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-full sm:rounded-xl hover:bg-sand-100 border border-sand-200 transition-colors focus:outline-none focus:ring-2 focus:ring-terracotta-500/30"
                    aria-label="User menu"
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                        }}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-sand-300"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-terracotta-100 text-terracotta-800 font-bold text-xs flex items-center justify-center border border-terracotta-200">
                        {initials}
                      </div>
                    )}
                    <span className="hidden md:inline text-xs font-semibold text-sand-800 max-w-[120px] truncate">
                      {displayName}
                    </span>
                  </button>

                  {isUserMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white border border-sand-200 rounded-2xl shadow-warm-lg py-1.5 z-30 animate-in fade-in zoom-in-95">
                        <div className="px-3 py-2 border-b border-sand-100">
                          <p className="text-xs font-semibold text-sand-900 truncate">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-sand-500 font-mono truncate">
                            @{user?.username}
                          </p>
                        </div>

                        <Link
                          to="/profile"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-sand-700 hover:bg-sand-100 hover:text-sand-900 transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-sand-500" />
                          Profile & Account
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-sand-100 mt-1"
                        >
                          <LogOut className="w-3.5 h-3.5 text-red-500" />
                          Log Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<LogIn className="w-4 h-4 text-terracotta-600" />}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="primary" size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
