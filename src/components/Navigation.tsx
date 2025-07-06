import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Users, Menu, X, Droplets } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationProps {
  currentView: 'camera' | 'leads' | 'syrup';
  onViewChange: (view: 'camera' | 'leads' | 'syrup') => void;
}

export const Navigation = ({ currentView, onViewChange }: NavigationProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: 'camera' as const,
      label: 'Capture',
      icon: Camera,
    },
    // Hidden for customer-facing app
    // {
    //   id: 'leads' as const,
    //   label: 'Leads',
    //   icon: Users,
    // },
    // {
    //   id: 'syrup' as const,
    //   label: 'Syrup Bottles',
    //   icon: Droplets,
    // },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2 bg-card rounded-lg p-1 border-2 border-primary/30">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant={currentView === item.id ? 'default' : 'ghost'}
              onClick={() => onViewChange(item.id)}
              className="gap-2 nav-button"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="gap-2 nav-button"
        >
          {isMobileMenuOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
          Menu
        </Button>

        {isMobileMenuOpen && (
          <div className="absolute top-16 left-4 right-4 bg-card rounded-lg border-2 border-primary/30 shadow-lg p-2 z-50">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    variant={currentView === item.id ? 'default' : 'ghost'}
                    onClick={() => {
                      onViewChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className="justify-start gap-2 nav-button"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};