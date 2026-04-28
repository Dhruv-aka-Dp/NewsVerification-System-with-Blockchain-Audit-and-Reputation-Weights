import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '../hooks/useTheme';
import DashboardApp from './DashboardApp';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <DashboardApp />
    </ThemeProvider>
  </React.StrictMode>
);
