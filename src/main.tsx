import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AppProvider } from './context/AppContext';
import { DetectionProvider } from './context/DetectionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <DetectionProvider>
        <App />
      </DetectionProvider>
    </AppProvider>
  </StrictMode>
);
