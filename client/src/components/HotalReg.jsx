import { assets, cities } from "../assets/assets";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { useAppContext } from "../context/AppContext";
import { useState } from "react";
import toast from "react-hot-toast";

function HotelReg() {
  const { setShowHotelReg,axios,getToken,setIsOwner } = useAppContext();


  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [starRating, setStarRating] = useState(3);
  const [openTime, setOpenTime] = useState("");
  const [nearbyAttractions, setNearbyAttractions] = useState("");
  const [promotions, setPromotions] = useState("");


  async function handleSubmit(e) {
    e.preventDefault();
    const token = await getToken();
    try {
      const { data } = await axios.post(`/api/hotels/`, {
        name,
        nameEn,
        contact,
        address,
        city,
        starRating,
        openTime: openTime || undefined,
        nearbyAttractions: nearbyAttractions ? nearbyAttractions.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        promotions: promotions ? promotions.split("\n").map((s) => s.trim()).filter(Boolean) : [],
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      console.log(data)

      if (data?.success) {
        toast.success("提交成功，等待管理员审核");
        setShowHotelReg(false);
        setIsOwner(true);
      } else {
        toast.error(data?.message || "Failed to register hotel. Please try again.");
        setShowHotelReg(false);
        setIsOwner(false); 
      }
    } catch (error) {
      console.error("Error registering hotel:", error);
      toast.error("Failed to register hotel. Please try again.");
    }
  }


  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="w-11/12 md:w-2/3 lg:w-1/2 bg-white rounded-lg p-6 flex flex-col md:flex-row relative">
        {/* Close Button */}
        <IoIosCloseCircleOutline
          className="absolute top-3 right-3 text-2xl cursor-pointer text-gray-700 hover:text-red-500 transition"
          onClick={() => setShowHotelReg(false)}
        />

        {/* Left Image Section */}
        <div className="hidden md:flex md:w-1/2 items-center justify-center p-4">
          <img
            src={assets.regImage}
            alt="Register Hotel"
            className="w-full h-auto rounded-xl object-cover"
          />
        </div>

        {/* Right Form Section */}
        <form onSubmit={handleSubmit} className="w-full md:w-1/2 flex flex-col gap-4 p-4">
          {/* Heading */}
          <div className="text-center md:text-left">
            <p className="text-2xl font-bold">Register Your Hotel</p>
            <p className="text-sm text-gray-600">
              Please fill in the details below to register your hotel.
            </p>
          </div>

          {/* Hotel Name */}
          <div>
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-700">酒店名（中文） *</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="酒店名称" className="w-full p-2 border border-gray-300 rounded-md" required />
          </div>
          <div>
            <label htmlFor="nameEn" className="block mb-2 text-sm font-medium text-gray-700">酒店名（英文）</label>
            <input id="nameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} type="text" placeholder="Hotel Name (English)" className="w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">星级</label>
            <select value={starRating} onChange={(e) => setStarRating(Number(e.target.value))} className="w-full p-2 border border-gray-300 rounded-md">
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} 星</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">开业时间</label>
            <input type="date" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
          </div>

          {/* Contact Number */}
          <div>
            <label
              htmlFor="contact"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Contact Number
            </label>
            <input
              id="contact"
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Contact Number"
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="address"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Address
            </label>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block mb-2 text-sm font-medium text-gray-700">城市 *</label>
            <select id="city" value={city} onChange={(e) => setCity(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" required>
              <option value="">选择城市</option>
              {cities.map((c, index) => <option key={index} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">附近景点/交通/商场（每行一个）</label>
            <textarea value={nearbyAttractions} onChange={(e) => setNearbyAttractions(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md h-20" placeholder="可选" />
          </div>
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">优惠说明（每行一个，如：节日8折）</label>
            <textarea value={promotions} onChange={(e) => setPromotions(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md h-20" placeholder="可选" />
          </div>

          {/* Submit Button */}
          <button className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-300">
            Register Hotel
          </button>
        </form>
      </div>
    </div>
  );
}

export default HotelReg;
