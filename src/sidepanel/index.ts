// Types
interface Message {
  type: string;
  payload?: any;
}

class SidePanel {
  private port!: chrome.runtime.Port;
  private contentElement: HTMLElement;

  constructor() {
    this.contentElement = document.getElementById('content') as HTMLElement;
    this.initializePort();
    this.setupEventListeners();
  }

  private initializePort() {
    // Connect to the background script
    this.port = chrome.runtime.connect({ name: 'sidepanel' });
    
    this.port.onMessage.addListener((message: Message) => {
      console.log('Received message:', message);
      // Handle incoming messages
    });

    this.port.onDisconnect.addListener(() => {
      console.log('Disconnected from background script');
      // Handle disconnection (e.g., try to reconnect)
    });
  }

  private setupEventListeners() {
    // Add event listeners for UI interactions here
    console.log('Setting up event listeners');
  }

  // Method to send messages to the background script
  private sendMessage(message: Message) {
    this.port.postMessage(message);
  }
}

// Initialize the side panel when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new SidePanel();
}); 