import { Outlet } from 'react-router-dom';
import Header from './Header';
import MobileNav from './MobileNav';
import ArchiveDrawer from './ArchiveDrawer';
import AgentInput from '../agent/AgentInput';
import { useAgent } from '../../hooks/useAgent';

export default function Layout() {
  const { sendMessage, isProcessing, lastResponse } = useAgent();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Sticky AI Input - floats over content */}
      <div className="sticky top-16 z-30 px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto">
        <AgentInput
          onSend={sendMessage}
          isProcessing={isProcessing}
          lastResponse={lastResponse}
        />
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-6">
        <Outlet />
      </main>
      <MobileNav />
      <ArchiveDrawer />
    </div>
  );
}
