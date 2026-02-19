# 🏨 Hotel Booking System



## 🛠️ Tech Stack

### Frontend
- **React 19.1.0** - Modern React with latest features
- **Vite** - Fast build tool and development server
- **Tailwind CSS 4.1.7** - Utility-first CSS framework
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client for API requests
- **React Hot Toast** - Beautiful toast notifications
- **React Icons** - Icon library
- **Clerk React** - Authentication solution

### Backend
- **Node.js** - JavaScript runtime
- **Express 5.1.0** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Clerk Express** - Server-side authentication
- **Cloudinary** - Image storage and management
- **Stripe** - Payment processing
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing
- **Nodemailer** - Email service (configured but commented out)

## 📁 Project Structure

```
hotel-booking/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   ├── context/        # React context for state management
│   │   ├── assets/         # Images, icons, and static assets
│   │   └── main.jsx        # Application entry point
│   ├── public/             # Public assets
│   └── package.json        # Frontend dependencies
│
├── server/                 # Backend Node.js application
│   ├── controllers/        # Route controllers
│   ├── models/             # MongoDB schemas
│   ├── routes/             # API routes
│   ├── middlewares/        # Custom middleware
│   ├── config/             # Database configuration
│   ├── uploads/            # File upload directory
│   └── server.js           # Server entry point
│
└── README.md               # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB database
- Clerk account for authentication
- Cloudinary account for image storage
- Stripe account for payments

### Installation

1. **Clone the repository**


2. **安装依赖，最先做**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```


4. **启动项目**
   ```bash
   # Start the server (from server directory)
   npm start
   
   # Start the client (from client directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`

## 📋 API Endpoints

### Authentication
- `POST /api/clerk/webhook` - Clerk webhook for user management

### Users
- `GET /api/users` - Get current user data
- `POST /api/users/store-recent-search` - Store recent search cities

### Hotels
- `POST /api/hotels` - Register a new hotel (requires authentication)

### Rooms
- `GET /api/rooms` - Get all available rooms
- `POST /api/rooms` - Create a new room (requires authentication)
- `GET /api/rooms/owner` - Get rooms for hotel owner (requires authentication)
- `POST /api/rooms/toogle-avalibility` - Toggle room availability (requires authentication)

### Bookings
- `POST /api/bookings/check-availability` - Check room availability
- `POST /api/bookings/book` - Create a new booking (requires authentication)
- `GET /api/bookings/user` - Get user bookings (requires authentication)
- `GET /api/bookings/hotel` - Get hotel bookings for dashboard (requires authentication)
- `POST /api/bookings/stripe-payment` - Process Stripe payment (requires authentication)

## 🏗️ Database Schema

### User Model
```javascript
{
  _id: String,           // Clerk user ID
  username: String,      // User's full name
  email: String,         // User's email
  avatar: String,        // Profile image URL
  role: String,          // 'user' or 'admin'
  recentSerachCities: Array  // Recent search history
}
```

### Hotel Model
```javascript
{
  name: String,          // Hotel name
  address: String,       // Hotel address
  contact: String,       // Contact number
  owner: String,         // Reference to User ID
  city: String,          // Hotel city
  createdAt: Date,
  updatedAt: Date
}
```

### Room Model
```javascript
{
  hotel: String,         // Reference to Hotel ID
  roomType: String,      // Room type (Single Bed, Double Bed, etc.)
  pricePerNight: Number, // Price per night
  amenties: Array,       // List of amenities
  images: Array,         // Array of image URLs
  isAvailable: Boolean,  // Availability status
  createdAt: Date,
  updatedAt: Date
}
```

### Booking Model
```javascript
{
  user: String,          // Reference to User ID
  room: String,          // Reference to Room ID
  hotel: String,         // Reference to Hotel ID
  checkInDate: Date,     // Check-in date
  checkOutDate: Date,    // Check-out date
  totalPrice: Number,    // Total booking price
  guests: Number,        // Number of guests
  status: String,        // 'pending', 'confirmed', 'cancelled'
  paymentMethod: String, // Payment method
  isPaid: Boolean,       // Payment status
  createdAt: Date,
  updatedAt: Date
}
```

## 🎨 Key Features Breakdown

### For Regular Users
- Browse and search hotels
- Filter by room type, price, and location
- View detailed room information
- Check availability for specific dates
- Make bookings with flexible payment options
- View booking history and status
- Secure online payments via Stripe

### For Hotel Owners
- Register hotel property
- Add and manage rooms
- Upload room images
- Set pricing and amenities
- Toggle room availability
- View booking dashboard
- Track revenue and booking statistics

## 🔒 Security Features
- **Authentication**: Clerk-based secure authentication
- **Authorization**: Role-based access control
- **Data Validation**: Server-side validation for all inputs
- **Secure Payments**: Stripe integration for secure transactions
- **CORS Protection**: Configured for secure cross-origin requests

## 🚀 Deployment

### Frontend (Vercel)
The client includes a `vercel.json` configuration for easy deployment to Vercel.

### Backend (Various Options)
The server includes a `Dockerfile` for containerized deployment and can be deployed to:
- Heroku
- Railway
- DigitalOcean
- AWS
- Google Cloud Platform

