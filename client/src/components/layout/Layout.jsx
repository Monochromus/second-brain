import { Outlet } from 'react-router-dom';
import Header from './Header';
import AgentInput from '../agent/AgentInput';
import { useAgent } from '../../hooks/useAgent';

export default function Layout() {
  const { sendMessage, isProcessing, lastResponse } = useAgent();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AgentInput
          onSend={sendMessage}
          isProcessing={isProcessing}
          lastResponse={lastResponse}
        />
        <Outlet />
      </main>
    </div>
  );
}
