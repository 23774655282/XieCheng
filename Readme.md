# 🏨 Hotel Booking System

A full-stack hotel booking platform built with React, Node.js, Express, MongoDB, and integrated with Clerk authentication and Stripe payments.

## ✨ Features

### 🔐 Authentication & User Management
- **Clerk Authentication**: Seamless user registration and login
- **Role-based Access**: Different interfaces for regular users and hotel owners
- **User Profiles**: Manage user information and booking history

### 🏨 Hotel Management
- **Hotel Registration**: Hotel owners can register their properties
- **Room Management**: Add, edit, and manage hotel rooms
- **Availability Control**: Toggle room availability status
- **Dashboard Analytics**: View booking statistics and revenue

### 🔍 Room Discovery
- **Advanced Search**: Filter rooms by type, price range, and destination
- **Sorting Options**: Sort by price (low to high, high to low) and newest listings
- **Real-time Availability**: Check room availability for specific dates
- **Detailed Room Views**: High-quality images, amenities, and specifications

### 📅 Booking System
- **Date Selection**: Interactive check-in/check-out date picker
- **Guest Management**: Specify number of guests
- **Availability Checking**: Real-time room availability verification
- **Booking Confirmation**: Instant booking confirmation with details

### 💳 Payment Integration
- **Multiple Payment Methods**: Pay at hotel or online via Stripe
- **Secure Payments**: Stripe integration for secure online transactions
- **Payment Status Tracking**: Track payment status for each booking

### 📱 Responsive Design
- **Mobile-First**: Fully responsive design for all devices
- **Modern UI**: Clean, intuitive interface built with Tailwind CSS
- **Interactive Components**: Smooth animations and transitions

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
   ```bash
   git clone https://github.com/pratham40/Hotel-Booking.git
   cd hotel-booking
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Variables**

   Create a `.env` file in the server directory:
   ```env
   # Database
   MONGO_URI="your_mongodb_connection_string"
   PORT=3000
   
   # Clerk Authentication
   CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   CLERK_SECRET_KEY="your_clerk_secret_key"
   CLERK_WEBHOOK_SECRET="your_clerk_webhook_secret"
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME="your_cloudinary_cloud_name"
   CLOUDINARY_API_KEY="your_cloudinary_api_key"
   CLOUDINARY_API_SECRET="your_cloudinary_api_secret"
   
   # Stripe
   STRIPE_SECRET_KEY="your_stripe_secret_key"
   ```

   Create a `.env` file in the client directory:
   ```env
   VITE_BACKEND_URL="http://localhost:3000"
   VITE_CURRENCY="$"
   VITE_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
   ```

4. **Run the application**
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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Pratham40**
- GitHub: [@pratham40](https://github.com/pratham40)

## 🙏 Acknowledgments

- Clerk for authentication services
- Stripe for payment processing
- Cloudinary for image management
- MongoDB for database services
- Vercel for hosting solutions

---

⭐ If you found this project helpful, please give it a star on GitHub!