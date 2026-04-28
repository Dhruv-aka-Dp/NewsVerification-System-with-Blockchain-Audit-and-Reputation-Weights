import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ErrorBoundary } from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ItemDetail from './pages/ItemDetail';
import Submit from './pages/Submit';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <div className="win-desktop">
              <Navbar />
              <div className="app-container">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/item/:id" element={<ItemDetail />} />
                  <Route path="/submit" element={<Submit />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Routes>
              </div>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
