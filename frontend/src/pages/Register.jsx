import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiUser, FiMessageCircle } from 'react-icons/fi';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  
  const { register, loading } = useAuth();
  
  const [animateForm, setAnimateForm] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    setTimeout(() => setAnimateForm(true), 100);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    // Register user
    const result = await register(username, email, password);
    if (!result.success) {
      setError(result.message);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-center items-center min-h-screen bg-ui-bg bg-cover bg-no-repeat">
     

      {/* Right side register form */}
      <div className={`w-full md:w-1/2 p-6 flex justify-center items-center transition-all duration-700 ease-out ${animateForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="w-full max-w-md p-6 space-y-8 bg-gray-900 rounded-2xl shadow-2xl backdrop-blur-sm ">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500  transform hover:scale-105 transition-transform duration-300 shadow-lg">
              <FiMessageCircle className="h-10 w-10" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text">Create Account</h1>
          <p className="mt-2 text-gray-600">Sign up to start your conversations</p>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm" role="alert">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="group">
              <label htmlFor="username" className="block text-sm font-medium text-white mb-1 group-focus-within:text-primary-DEFAULT transition-colors duration-200">
                Username
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-red-400 group-focus-within:text-primary-DEFAULT transition-colors duration-200" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="pl-10 w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            
            <div className="group">
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1 group-focus-within:text-primary-DEFAULT transition-colors duration-200">
                Email Address
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-yellow-600 group-focus-within:text-primary-DEFAULT transition-colors duration-200" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10 w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            
            <div className="group">
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1 group-focus-within:text-primary-DEFAULT transition-colors duration-200">
                Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-green-600 group-focus-within:text-primary-DEFAULT transition-colors duration-200" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="pl-10 w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="group">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-1 group-focus-within:text-primary-DEFAULT transition-colors duration-200">
                Confirm Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="h-5 w-5 text-blue-600 group-focus-within:text-primary-DEFAULT transition-colors duration-200" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="pl-10 w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-4 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-red-500  font-medium rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex justify-center items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Sign up'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-3">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary-DEFAULT hover:text-primary-dark transition-colors duration-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
     {/* Left side decorative panel - only visible on md screens and up */}
     {/* <div className="hidden md:flex md:w-1/2 h-screen bg-gradient-to-br from-primary-light to-secondary-light p-8 justify-center items-center">
        <div className="max-w-md text-white">
          <div className="animate-bounce-slow mb-6">
            <FiMessageCircle className="h-20 w-20 text-white/90" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Join our community today</h1>
          <p className="text-xl opacity-80">Create an account and start connecting with friends and family.</p>
        </div>
      </div> */}
    </div>
  );
};

export default Register;
