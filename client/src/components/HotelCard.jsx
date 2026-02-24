import { Link } from 'react-router-dom'
import { assets } from '../assets/assets.js'
import { FaLocationArrow } from 'react-icons/fa'

function HotelCard({ room, idx }) {
  return (
    <Link
      to={`/rooms/${room._id}`}
      key={room._id}
      className="group rounded-lg shadow-lg hover:shadow-2xl transition-shadow bg-white overflow-hidden h-full flex flex-col"
    >
      <div className="relative flex-shrink-0 overflow-hidden">
        <img
          src={room.images[0]}
          alt={room.hotel.name}
          className="w-full h-44 object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="p-4 pt-5 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="font-playfair text-xl font-medium text-gray-800 truncate">
            {room.hotel.name}
          </p>
          <div className="flex items-center gap-0.5 text-yellow-500">
            {Array.from({ length: room.hotel?.starRating ?? 0 }, (_, i) => (
              <img key={i} src={assets.starIconFilled} alt="" className="w-4 h-4" />
            ))}
          </div>
        </div>
        <div className="flex items-center text-gray-500 text-sm mb-3 gap-1 min-h-0 overflow-hidden">
          <FaLocationArrow className="flex-shrink-0" />
          <span className="truncate">{room.hotel.address}</span>
        </div>
        <div className="flex items-center justify-between mt-auto pt-2">
          <p className="text-lg font-semibold text-gray-900">
            {(room.promoDiscount != null && room.promoDiscount > 0)
              ? Math.round(room.pricePerNight * (1 - room.promoDiscount / 100))
              : room.pricePerNight} 元
            <span className="text-xs text-gray-500 font-normal">/晚</span>
          </p>
          <button className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded font-medium transition">
            立即预订
          </button>
        </div>
      </div>
    </Link>
  )
}

export default HotelCard