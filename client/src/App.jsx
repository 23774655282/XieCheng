import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import NavBar from './components/NavBar'
import Home from './pages/Home';
import Footer from './components/Footer';
import AllRooms from './pages/AllRooms';
import SmartSearchResults from './pages/SmartSearchResults';
import AiHotelChat from './pages/AiHotelChat';
import TravelMap from './pages/TravelMap';
import RoomDetail from './pages/RoomDetail';
import HotelDetail from './pages/HotelDetail';
import MyBooking from './pages/MyBooking';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import HotelReg from './components/HotalReg';
import Layout from './pages/hotelOwner/Layout';
import AdminLayout from './pages/admin/AdminLayout';
import AuditHotels from './pages/admin/AuditHotels';
import MerchantApplications from './pages/admin/MerchantApplications';
import ApplyMerchant from './pages/ApplyMerchant';
import HotelInfo from './pages/hotelOwner/HotelInfo';
import NotFound from './components/NotFound';
import About from './pages/About';
import AddRoom from './pages/hotelOwner/AddRoom';
import EditRoom from './pages/hotelOwner/EditRoom';
import Dashboard from './pages/hotelOwner/Dashboard';
import ListRoom from './pages/hotelOwner/ListRoom';
import { useAppContext } from './context/AppContext';
import Loader from './components/Loader';
import PaySuccess from './pages/PaySuccess';



function App() {

  const location = useLocation();
  const isOwnerPath = location.pathname.includes('owner');
  const isAdminPath = location.pathname.includes('admin');

  const {showHotelReg} = useAppContext();

  return (
      <div>
        {!isOwnerPath && !isAdminPath && <NavBar/>}
        {showHotelReg && <HotelReg/>}
        <div className='w-full h-full'>
          <Routes>
            <Route path='/' element={<Home/>}/>
            <Route path='/login' element={<Login/>}/>
            <Route path='/register' element={<Register/>}/>
            <Route path='/forgot-password' element={<ForgotPassword/>}/>
            <Route path='/rooms' element={<AllRooms/>}/>
            <Route path='/rooms/smart-results' element={<SmartSearchResults/>}/>
            <Route path='/ai-hotel' element={<AiHotelChat/>}/>
            <Route path='/travel-map' element={<TravelMap/>}/>
            <Route path='/rooms/:id' element={<RoomDetail />}/>
            <Route path='/hotels/:id' element={<HotelDetail />}/>
            <Route path='/my-bookings' element= {<MyBooking/>}/>
            <Route path='/about' element={<About/>}/>
            <Route path='/loader/:nextUrl' element={<Loader />} />
            <Route path='/pay-success' element={<PaySuccess />} />
            <Route path='/apply-merchant' element={<ApplyMerchant/>} />
            <Route path='/owner' element={<Layout/>}>
              <Route index element={<Dashboard/>} />
              <Route path='hotel-info' element={<HotelInfo/>} />
              <Route path='add-room' element={<AddRoom/>} />
              <Route path='edit-room/:roomId' element={<EditRoom/>} />
              <Route path='list-rooms' element={<ListRoom/>} />
            </Route>
            <Route path='/admin' element={<AdminLayout/>}>
              <Route index element={<AuditHotels/>} />
              <Route path='merchant-applications' element={<MerchantApplications/>} />
            </Route>
            <Route path='*' element={<NotFound/>}/>

          </Routes>
        </div>
        {!isOwnerPath && !isAdminPath && <Footer/>}
      </div>
  )
}

export default App
