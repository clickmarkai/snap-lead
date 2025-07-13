import { useState, useRef } from 'react';
import { CameraCapture } from '@/components/CameraCapture';
import { LeadsDashboard } from '@/components/LeadsDashboard';
import { SyrupPhotoUpload } from '@/components/SyrupPhotoUpload';
import { Navigation } from '@/components/Navigation';
import logoImage from '@/assets/logo.png';

const Index = () => {
  const [currentView, setCurrentView] = useState<'camera' | 'leads' | 'syrup'>('camera');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const leadsDashboardRef = useRef<{ refreshLeads: () => void } | null>(null);

  const handleLeadSaved = () => {
    // Trigger refresh of leads dashboard
    setRefreshTrigger(prev => prev + 1);
    
    // Keep customer on camera view for next capture
    // setCurrentView('leads'); // Hidden for customer-facing app
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 lg:px-8 py-8 lg:py-12">
        <div className="space-y-8 lg:space-y-12">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center justify-center sm:justify-start">
              <img 
                src={logoImage} 
                alt="Snap Lead Export Logo" 
                className="h-20 lg:h-24 w-auto max-w-full rounded-lg object-contain"
              />
            </div>
            {/* Navigation hidden for customer-facing app */}
            {/* <Navigation currentView={currentView} onViewChange={setCurrentView} /> */}
          </div>

          {/* Main Content */}
          <div className="relative">
            {currentView === 'camera' && (
              <CameraCapture 
                onPhotoTaken={(photoData) => {
                  // Photo captured successfully
                }}
                onLeadSaved={handleLeadSaved}
              />
            )}
            {currentView === 'leads' && <LeadsDashboard key={refreshTrigger} />}
            {currentView === 'syrup' && <SyrupPhotoUpload />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
