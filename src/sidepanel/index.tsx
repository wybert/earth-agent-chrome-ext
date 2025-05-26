import React from 'react';
import { createRoot } from 'react-dom/client';
import { ChatUI } from '../components/Chat';
import '../assets/styles/globals.css';

// Simple error boundary component
class ChatErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Chat component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI when Chat component fails
      return (
        <div className="p-4 border rounded-md bg-destructive/10 text-destructive">
          <h3 className="font-bold mb-2 text-base">Something went wrong with the chat component</h3>
          <p className="text-base">Please try reloading the extension or check the console for more details.</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 text-base"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  // Ensure the app doesn't crash if the CSS isn't loaded
  React.useEffect(() => {
    // Check if the CSS is properly loaded
    const styleCheck = document.createElement('div');
    styleCheck.className = 'text-primary';
    document.body.appendChild(styleCheck);
    
    const styles = window.getComputedStyle(styleCheck);
    const hasStyles = styles.color !== 'rgb(0, 0, 0)';
    
    if (!hasStyles) {
      console.warn('CSS may not be properly loaded. Check the imports and paths.');
    }
    
    document.body.removeChild(styleCheck);
  }, []);

  return (
    <div className="container px-2 py-4 flex flex-col h-full max-w-[98%] mx-auto">
      {/* <div className="header mb-2">
        <h1 className="text-xl font-bold">Earth Engine AI Assistant</h1>
      </div> */}
      <div className="content flex-1 w-full">
        <ChatErrorBoundary>
          <ChatUI />
        </ChatErrorBoundary>
      </div>
    </div>
  );
};

// Make sure the root element exists before mounting
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } else {
    console.error('Root element not found. Make sure the HTML has an element with id="root"');
  }
}); 