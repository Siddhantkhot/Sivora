import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiMessageCircle } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message);
    }
  };

  const [animateForm, setAnimateForm] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    setTimeout(() => setAnimateForm(true), 100);
  }, []);

  return (
    <div className="flex flex-col md:flex-row justify-center items-center min-h-screen bg-ui-bg bg-no-repeat bg-cover">

      {/* Right side login form */}
      <div className={`w-full md:w-1/2 p-8 flex justify-center items-center transition-all duration-700 ease-out ${animateForm ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="w-full max-w-md p-6 space-y-8 bg-gray-900 rounded-2xl shadow-2xl backdrop-blur-sm ">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-white transform hover:scale-105 transition-transform duration-300 shadow-lg">
                <FiMessageCircle className="h-10 w-10" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-pink-500 text-transparent bg-clip-text ">Welcome Back</h1>
            <p className="mt-2 text-gray-400">Sign in to continue your conversations</p>
          </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-sm animate-pulse" role="alert">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="block sm:inline">{error}</span>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div className="group">
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1 group-focus-within:text-primary-DEFAULT transition-colors duration-200">
                Email Address
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-red-400 group-focus-within:text-primary-DEFAULT transition-colors duration-200" />
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
                  <FiLock className="h-5 w-5 text-blue-600 group-focus-within:text-primary-DEFAULT transition-colors duration-200" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="pl-10 w-full px-4 py-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-light focus:border-transparent transition-all duration-200 bg-gray-50 hover:bg-white"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              {/* <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-DEFAULT focus:ring-primary-light border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-primary-DEFAULT hover:text-primary-dark transition-colors duration-200">
                  Forgot password?
                </a>
              </div> */}
            </div>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 px-4 bg-gradient-to-r from-sky-500 from-10% via-blue-500 via-30% to-red-700  font-medium rounded-xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex justify-center items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary-DEFAULT hover:text-primary-dark transition-colors duration-200">
              Sign up now
            </Link>
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
