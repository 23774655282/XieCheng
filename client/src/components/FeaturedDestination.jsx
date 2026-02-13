import { useAppContext } from '../context/AppContext';
import HotelCard from './HotelCard'
import Title from './Title'

function FeaturedDestination() {

  const { rooms,navigate } = useAppContext();

  return rooms.length > 0 && (
    <div className='flex flex-col items-center px-6 bg-slate-50 py-12 md:py-14'>
      <Title title="精选目的地" subtitle="发现我们为您精选的下一站住宿" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-6xl mx-auto">
            {rooms.slice(0, 6).map((room, index) => (
                <div key={room._id} className="h-full min-h-[320px]">
                    <HotelCard room={room} index={index} />
                </div>
            ))}
        </div>
        <div className='mt-10'>
            <button onClick={()=>{navigate("/rooms"); scrollTo(0,0)}} className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-all duration-300'>
                查看全部
            </button>
          </div>
    </div>
  )
}

export default FeaturedDestination