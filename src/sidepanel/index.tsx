import React from 'react';
import { createRoot } from 'react-dom/client';
import { Chat } from '../components/Chat';
import { ConsoleLogButton } from '../components/ui';

const App = () => {
  return (
    <div className="container p-4">
      <div className="header mb-4">
        <h1 className="text-2xl font-bold">Earth Engine AI Assistant</h1>
      </div>
      <div className="content flex-1">
        <Chat />
        <div className="mt-6">
          <ConsoleLogButton />
        </div>
      </div>
      <div className="footer mt-4 pt-4 border-t">
        <p className="text-sm text-muted-foreground">Ready to assist with Earth Engine</p>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 