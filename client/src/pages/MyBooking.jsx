import React, { useEffect, useState } from 'react';
import Title from '../components/Title';
import { FaLocationArrow } from 'react-icons/fa';
import { CiUser } from 'react-icons/ci';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

function MyBooking() {

    const {axios,getToken,user} = useAppContext();

    const [bookings, setBookings] = useState([]);

    async function fetchBookings() {
        try {
            const token  = await getToken();
            const {data} = await axios.get("/api/bookings/user",{
                headers:{
                    Authorization:`Bearer ${token}`
                }
            })

            if (data.success) {
                toast.success("user booking fetched successfully")
                setBookings(data.bookings)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message);
        }
    }

    async function handlePayment(bookingId) {
        try{
            const token = await getToken();
            const {data} = await axios.post('api/bookings/stripe-payment', {
                bookingId
            },{
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (data.success) {
                window.location.href = data.url;
            }else{
                toast.error(data.message || "Failed to initiate payment. Please try again."); 
            }
        } catch (error) {
            toast.error("Payment failed. Please try again later.");
            console.error("Payment error:", error);
        }
    }

    useEffect(()=>{
        if (user) {
            fetchBookings();
        }
    },[user])

    return (
        <div className="px-4 py-20 md:px-16 lg:px-24 xl:px-32 bg-gray-50 min-h-screen">
    <Title
        title="My Booking"
        subtitle="Manage your bookings and view your reservation details."
        align="left"
        className="pt-28 md:pt-36 mb-16"
    />

    {/* Table Headers */}
    <div className="hidden lg:grid grid-cols-12 gap-4 text-sm font-semibold text-gray-500 uppercase border-b pb-4">
        <div className="col-span-5">Hotels</div>
        <div className="col-span-3">Date & Time</div>
        <div className="col-span-2">Payment</div>
    </div>

    <div className="space-y-8 mt-8">
        {bookings.map((booking) => (
            <div
                key={booking._id}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5 flex flex-col lg:flex-row gap-6"
            >
                {/* Hotel Info */}
                <div className="flex flex-1 gap-5">
                    <img
                        src={booking.room.images[0]}
                        alt="room"
                        className="w-32 h-24 object-cover rounded-lg shadow-sm"
                    />
                    <div className="flex flex-col justify-between text-gray-700">
                        <p className="text-lg font-semibold text-gray-900 leading-snug">
                            {booking.hotel.name}
                            <span className="text-sm font-normal text-gray-500"> — {booking.room.roomType}</span>
                        </p>
                        <div className="flex items-center text-sm gap-2 mt-1">
                            <FaLocationArrow size={14} className="text-gray-500" />
                            <span>{booking.hotel.address}</span>
                        </div>
                        <div className="flex items-center text-sm gap-2 mt-1">
                            <CiUser size={16} className="text-gray-500" />
                            <span>{booking.guests} Guest{booking.guests > 1 ? 's' : ''}</span>
                        </div>
                        <p className="text-sm mt-2">
                            Total Price: <span className="font-semibold text-gray-900">${booking.totalPrice}</span>
                        </p>
                    </div>
                </div>

                {/* Check-in / Check-out */}
                <div className="flex flex-col justify-between gap-4 min-w-[150px] text-sm text-gray-700">
                    <div>
                        <p className="font-semibold text-gray-800 mb-1">Check In</p>
                        <p>{new Date(booking.checkInDate).toDateString()}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 mb-1">Check Out</p>
                        <p>{new Date(booking.checkOutDate).toDateString()}</p>
                    </div>
                </div>

                {/* Payment Section */}
                <div className="flex flex-col justify-between items-start lg:items-end gap-4 min-w-[130px]">
                    <span
                        className={`${
                            booking.isPaid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                        } px-3 py-1 rounded-full text-sm font-medium`}
                    >
                        {booking.isPaid ? 'Paid' : 'Not Paid'}
                    </span>
                    {!booking.isPaid && (
                        <button
                        onClick={()=>handlePayment(booking._id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm shadow transition">
                            Pay Now
                        </button>
                    )}
                </div>
            </div>
        ))}
    </div>
</div>

    );
}

export default MyBooking;
