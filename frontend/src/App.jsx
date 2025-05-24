import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import NotFound from './pages/NotFound';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import CallInterface from './components/CallInterface';
import IncomingCallNotification from './components/IncomingCallNotification';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <Routes>
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/login" />
        } />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/chat" /> : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/chat" /> : <Register />
        } />
        <Route path="/chat" element={
          <ProtectedRoute>
            <Chat/>
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Call-related components */}
      {isAuthenticated && (
        <>
          <CallInterface />
          <IncomingCallNotification />
        </>
      )}
      
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
