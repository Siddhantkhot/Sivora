    # MERN Chat Application

A full-stack real-time chat application built with the MERN stack (MongoDB, Express.js, React, Node.js) and Socket.IO.

## Features

- User authentication (JWT-based login and registration)
- Real-time messaging using Socket.IO
- MongoDB database for data storage
- Clean, responsive UI using TailwindCSS
- Private 1-on-1 messaging
- Group chat functionality
- File sharing (images, documents, audio)
- Typing indicators
- Read receipts
- Online/offline status
- User search

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.IO for real-time communication
- JWT for authentication
- Bcrypt for password hashing
- Multer for file uploads

### Frontend
- React (with Vite as build tool)
- TailwindCSS for styling
- Socket.IO client
- React Router for navigation
- Context API for state management
- Axios for API requests
- React Toastify for notifications
- Date-fns for date formatting

## Project Structure

```
mern-chat-app/
├── backend/                # Express server
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # API routes
│   ├── socket/             # Socket.IO handlers
│   ├── uploads/            # Uploaded files
│   ├── .env                # Environment variables
│   ├── package.json        # Backend dependencies
│   └── server.js           # Server entry point
│
├── frontend/               # React client (Vite)
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React Context providers
│   │   ├── pages/          # Page components
│   │   ├── App.jsx         # Main App component
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Global styles with Tailwind
│   ├── index.html          # HTML template
│   ├── package.json        # Frontend dependencies
│   ├── tailwind.config.js  # Tailwind configuration
│   └── vite.config.js      # Vite configuration
│
└── README.md               # Project documentation
```

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation and Setup

### Clone the repository

```bash
git clone <repository-url>
cd mern-chat-app
```

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/mern-chat
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

4. Start the backend server:
```bash
npm run dev
```

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the frontend development server:
```bash
npm run dev
```

4. The application will be available at `http://localhost:5173`

## Usage

1. Register a new account or login with existing credentials
2. Search for users to start a private chat
3. Create group chats with multiple users
4. Send messages, share files, and enjoy real-time communication

## License

MIT

## Author

Siddhant Khot
