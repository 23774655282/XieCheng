import { useAppContext } from '../context/AppContext';
import HotelCard from './HotelCard'
import { SkeletonFeaturedDestination } from './Skeleton'
import { usePerf } from '../context/PerfContext'

function FeaturedDestination() {

  const { rooms, roomsLoading } = useAppContext();
  const { isUnoptimizedMode } = usePerf();

  if (roomsLoading) {
    if (isUnoptimizedMode) return <div className="flex flex-col items-center px-6 md:px-16 bg-slate-50 py-12 md:py-14"><p className="text-gray-500">加载中…</p></div>;
    return <SkeletonFeaturedDestination />;
  }
  if (rooms.length === 0) return null;

  return (
    <div className='flex flex-col items-center px-6 md:px-16 bg-slate-50 py-12 md:py-14'>
      <div className="w-full max-w-6xl mx-auto flex flex-col items-start text-left mb-12 md:mb-16">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-gray-800" style={{ fontFamily: 'system-ui, sans-serif' }}>
          精选目的地
        </h2>
        <p className="text-gray-600 mt-2 text-sm md:text-base tracking-wide">发现我们为您精选的下一站住宿</p>
      </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
            {rooms.slice(3, 6).map((room, index) => (
                <div key={room._id} className="h-full min-h-[320px]">
                    <HotelCard room={room} index={index} />
                </div>
            ))}
        </div>
    </div>
  );
}

export default FeaturedDestination