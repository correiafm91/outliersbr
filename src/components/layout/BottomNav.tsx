
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, PlusSquare, Heart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const BottomNav: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Search, path: '/explore', label: 'Explore' },
    { icon: PlusSquare, path: '/create', label: 'Create' },
    { icon: Heart, path: '/notifications', label: 'Activity' },
    { icon: User, path: '/profile', label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-black/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-all duration-200",
                isActive ? "text-primary" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              )}
            >
              <item.icon className={cn(
                "h-6 w-6",
                isActive ? "scale-110" : "scale-100"
              )} />
              <span className="text-xs mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
