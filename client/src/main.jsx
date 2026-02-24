import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import { PerfProvider } from './context/PerfContext.jsx';

createRoot(document.getElementById('root')).render(
  <>
    <BrowserRouter>
      <AppProvider>
        <PerfProvider>
          <App />
        </PerfProvider>
      </AppProvider>
    </BrowserRouter>
  </>
);
