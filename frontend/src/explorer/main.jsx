import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from '../hooks/useTheme';
import ExplorerApp from './ExplorerApp';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ExplorerApp />
    </ThemeProvider>
  </React.StrictMode>
);
