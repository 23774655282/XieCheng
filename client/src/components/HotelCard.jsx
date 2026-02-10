import { Link } from 'react-router-dom'
import { assets } from '../assets/assets.js'
import { FaLocationArrow } from 'react-icons/fa'

function HotelCard({ room, idx }) {
  return (
    <Link
      to={`/rooms/${room._id}`}
      key={room._id}
      className="rounded-lg shadow-lg hover:shadow-2xl transition-shadow bg-white overflow-hidden"
    >
      <div className="relative">
        <img
          src={room.images[0]}
          alt={room.hotel.name}
          className="w-full h-48 object-cover"
        />
        <span className="absolute top-3 left-3 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">
          Best Seller
        </span>
      </div>
      <div className="p-4 pt-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-playfair text-xl font-medium text-gray-800">
            {room.hotel.name}
          </p>
          <div className="flex items-center gap-1 text-yellow-500 text-sm">
            <img src={assets.starIconFilled} alt="" className="w-4 h-4" /> 4.5
          </div>
        </div>
        <div className="flex items-center text-gray-500 text-sm mb-3 gap-1">
          <FaLocationArrow/>
          <span>{room.hotel.address}</span>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="text-lg font-semibold text-gray-900">
            ${room.pricePerNight}
            <span className="text-xs text-gray-500 font-normal"> /night</span>
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium transition">
            Book Now
          </button>
        </div>
      </div>
    </Link>
  )
}

export default HotelCard