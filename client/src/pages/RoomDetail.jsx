import  { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { facilityIcons, roomCommonData } from '../assets/assets';
import { FaLocationArrow } from 'react-icons/fa';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

function RoomDetail() {
    const { id } = useParams();
    const {rooms,getToken,axios,navigate} = useAppContext(); 
    const [room, setRoom] = useState(null);
    const [mainImage, setMainImage] = useState(null);

    const [checkInDate,setCheckInDate] = useState(null);

    const [guests, setGuests] = useState(1);

    const [isAvailable, setIsAvailable] = useState(false)


    const [checkOutDate, setCheckOutDate] = useState(null);



    console.log(rooms)

    useEffect(() => {
        const selectedRoom = rooms.find((r) => r._id === id);
        if (selectedRoom) {
            setRoom(selectedRoom);
            setMainImage(selectedRoom.images?.[0]);
            return;
        }
        // 分页后可能不在 context 中，按 id 拉取
        axios.get(`/api/rooms/${id}`).then(({ data }) => {
            if (data.success && data.room) {
                setRoom(data.room);
                setMainImage(data.room.images?.[0]);
            }
        }).catch(() => {});
    }, [rooms, id]);


    async function checkAvailability() {
        try {
            if (checkInDate >= checkOutDate) {
                toast.error("Check In Date should be less than Check Out Date");
                return;
            }

            const {data} = await axios.post("/api/bookings/check-availability",{
                room:id,
                checkInDate,
                checkOutDate
            })

            console.log(data)

            if (data.success) {
                if (data.isAvail) {
                    setIsAvailable(true);
                    toast.success("room is available")
                }else{
                    setIsAvailable(false)
                    toast.error("room not available")
                }
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error("error in availability")
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const token = await getToken();
        try {
            if (!isAvailable) {
                return checkAvailability();
            }else{
                const {data} = await axios.post("/api/bookings/book",{
                    room:id,
                    checkInDate,
                    checkOutDate,
                    guests,
                    paymentMethod:"Pay At Hotel"
                },{
                    headers:{
                        Authorization:`Bearer ${token}`
                    }
                })

                if (data.success) {
                    toast.success(data.message)
                    navigate("/my-bookings")
                    scrollTo(0,0)
                }else{
                    toast.error(data.message)
                }
            }
        } catch (error) {
            toast.error("Error booking room")
        }
    }

    return room && (
        <div className='pt-28 md:pt-36 px-4 md:px-16 lg:px-24 xl:px-32 mb-16'>

            {/* Room Title */}
            <div className="mb-6">
                <h1 className='text-2xl md:text-3xl font-bold text-gray-800'>
                    {room.hotel.name}
                    <span className='text-lg font-medium text-gray-600'> - {room.roomType} Room</span>
                </h1>
                <p className='text-green-600 font-semibold mt-2'>20% OFF</p>
            </div>

            {/* Location */}
            <div className="flex items-center text-sm text-gray-500 mb-8 gap-2">
                <FaLocationArrow className='text-gray-500' />
                <span>{room.hotel.address}</span>
            </div>

            {/* Images */}
            <div className="flex flex-col lg:flex-row gap-4 mb-10">
                <div className="flex-1">
                    <img src={mainImage} alt="Main Room" className="rounded-xl object-cover w-full h-64 md:h-96 shadow" />
                </div>
                <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto">
                    {room.images.length > 1 && room.images.map((image, index) => (
                        <img
                            key={index}
                            onClick={() => setMainImage(image)}
                            src={image}
                            alt={`Room ${index}`}
                            className="w-24 h-20 rounded-lg object-cover cursor-pointer border hover:scale-105 transition"
                        />
                    ))}
                </div>
            </div>

            {/* Room Description */}
            <div className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                    Experience the luxury of our {room.roomType} room at {room.hotel.name}
                </h2>

                <div className="flex flex-wrap gap-4 mb-4">
                    {room.amenties.map((item, index) => (
                        <div key={index} className='flex items-center gap-2 border px-3 py-2 rounded-full text-sm shadow-sm'>
                            <img src={facilityIcons[item]} alt={item} className='w-5 h-5' />
                            <span>{item}</span>
                        </div>
                    ))}
                </div>

                <p className="text-xl font-bold text-gray-800">${room.pricePerNight} <span className="text-sm text-gray-500">/ night</span></p>
            </div>

            {/* Booking Form */}
            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl shadow-md p-6 mb-12">
                <h3 className='text-lg font-semibold mb-4 text-gray-800'>Book Now</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col">
                        <label htmlFor="checkInDate" className="text-sm text-gray-600 mb-1">Check-in Date</label>
                        <input type="date" id="checkInDate" required className="border rounded-lg p-2 outline-none"
                        onChange={(e)=>setCheckInDate(e.target.value)}
                        value={checkInDate}
                        min={checkInDate}
                        
                        />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="checkOutDate" className="text-sm text-gray-600 mb-1">Check-out Date</label>
                        <input
                            type="date"
                            id="checkOutDate"
                            required
                            className="border rounded-lg p-2 outline-none"
                            onChange={(e) => setCheckOutDate(e.target.value)}
                            value={checkOutDate}
                            min={new Date().toISOString().split("T")[0]}
                            />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="guests" className="text-sm text-gray-600 mb-1">Guests</label>
                        <input type="number" id="guests" required className="border rounded-lg p-2 outline-none"
                         placeholder='1' 
                        onChange={(e)=>setGuests(e.target.value)}
                        value={guests} />
                    </div>
                </div>
                <button type='submit' className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition">
                    {isAvailable ? "Book now" : "Check Availability"}
                </button>
            </form>

            {/* Room Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {roomCommonData.map((spec, index) => (
                    <div key={index} className="flex items-start gap-4 bg-white rounded-xl shadow p-4">
                        <img src={spec.icon} alt={`${spec.title}-icon`} className="w-10 h-10" />
                        <div>
                            <h3 className="font-semibold text-gray-800">{spec.title}</h3>
                            <p className="text-sm text-gray-600">{spec.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Room Story */}
            <div className="bg-gray-50 p-6 rounded-xl shadow mb-8">
                <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                    Discover comfort and elegance in every corner of our thoughtfully designed room. Whether you're traveling for business or leisure, enjoy top-notch amenities, spacious interiors, and attentive service. Book now to experience a memorable stay tailored to your needs.
                </p>
            </div>

            {/* Contact Button */}
            <div className="text-center">
                <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition">
                    Contact Now
                </button>
            </div>
        </div>
    );
}

export default RoomDetail;
