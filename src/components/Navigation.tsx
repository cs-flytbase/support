import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const NavLink = ({ href, children, className = '' }: NavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href || pathname?.startsWith(`${href}/`);
  
  return (
    <Link 
      href={href} 
      className={`px-4 py-2 rounded-md transition-colors ${isActive 
        ? 'bg-blue-100 text-blue-800 font-medium' 
        : 'text-gray-700 hover:bg-gray-100'} ${className}`}
    >
      {children}
    </Link>
  );
};

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <nav className="bg-white shadow-sm px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-blue-600">Support</Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          <NavLink href="/conversations">Conversations</NavLink>
          <NavLink href="/calls">Calls</NavLink>
          <NavLink href="/customers">Customers</NavLink>
          <NavLink href="/issues">Issues</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </div>
        
        {/* User Button and Mobile Menu Toggle */}
        <div className="flex items-center space-x-4">
          <UserButton afterSignOutUrl="/sign-in" />
          
          {/* Mobile Menu Button */}
          <button 
            type="button" 
            className="md:hidden text-gray-600 hover:text-gray-900 focus:outline-none"
            onClick={toggleMobileMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-col space-y-2">
            <NavLink href="/conversations" className="block w-full">Conversations</NavLink>
            <NavLink href="/calls" className="block w-full">Calls</NavLink>
            <NavLink href="/customers" className="block w-full">Customers</NavLink>
            <NavLink href="/issues" className="block w-full">Issues</NavLink>
            <NavLink href="/settings" className="block w-full">Settings</NavLink>
          </div>
        </div>
      )}
    </nav>
  );
}
