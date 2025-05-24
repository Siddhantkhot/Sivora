import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-sunset bg-gradient-animated">
      <div className="p-10 rounded-2xl glass text-center max-w-lg mx-auto">
        <h1 className="text-8xl font-bold bg-gradient-to-r from-primary-DEFAULT to-secondary-DEFAULT text-transparent bg-clip-text">404</h1>
        <p className="text-2xl text-gray-700 mt-4 font-semibold">Page Not Found</p>
        <p className="text-gray-600 mt-2">The page you are looking for doesn't exist or has been moved.</p>
        
        <div className="mt-8 flex justify-center">
          <Link to="/" className="px-6 py-3 bg-gradient-primary-secondary text-white font-medium rounded-lg shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
