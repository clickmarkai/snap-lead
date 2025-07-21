import { useState, useRef } from 'react';
import { CameraCapture } from '@/components/CameraCapture';
import { LeadsDashboard } from '@/components/LeadsDashboard';
import { SyrupPhotoUpload } from '@/components/SyrupPhotoUpload';
import { Navigation } from '@/components/Navigation';
import logoImage from '@/assets/logo.png';
import packageJson from '../../package.json';

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
    // DELIFRU Mobile Design Layout - Dark Blue Background
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #081629 0%, #0a1d3e 50%, #0c2347 100%)' }}>
      {/* DELIFRU Header Branding */}
      <div className="flex-shrink-0 text-center py-8 lg:py-12">
        <img src={logoImage} alt="DELIFRU Logo" className="mx-auto w-48 h-auto" />
      </div>

      {/* Main Content Container */}
      <div className="flex-1 flex items-center justify-center px-4 lg:px-8">
        {/* Main Content */}
        <div className="w-full max-w-md lg:max-w-xl">
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
      
      {/* Footer */}
      <div className="text-center py-4 space-y-1">
        <div className="text-xs text-muted-foreground/60">
          POWERED BY CLICKMARK AI
        </div>
        <div className="text-xs text-muted-foreground">
          v{packageJson.version}
        </div>
      </div>
    </div>
  );
};

export default Index;
