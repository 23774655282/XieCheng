import { lazy, Suspense } from 'react';
import { Route, Routes, useLocation, Navigate } from 'react-router-dom';
import './App.css';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import HotelReg from './components/HotalReg';
import { PerfConsoleLogger } from './components/PerfConsoleLogger';
import { PerfActivator } from './components/PerfActivator';
import { useAppContext } from './context/AppContext';

const Home = lazy(() => import('./pages/Home'));
const AllRooms = lazy(() => import('./pages/AllRooms'));
const SmartSearchResults = lazy(() => import('./pages/SmartSearchResults'));
const AiHotelChat = lazy(() => import('./pages/AiHotelChat'));
const TravelMap = lazy(() => import('./pages/TravelMap'));
const RoomDetail = lazy(() => import('./pages/RoomDetail'));
const HotelDetail = lazy(() => import('./pages/HotelDetail'));
const MyBooking = lazy(() => import('./pages/MyBooking'));
const PersonalCenter = lazy(() => import('./pages/PersonalCenter'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Layout = lazy(() => import('./pages/hotelOwner/Layout'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AuditHotels = lazy(() => import('./pages/admin/AuditHotels'));
const MerchantApplications = lazy(() => import('./pages/admin/MerchantApplications'));
const PendingRoomAdds = lazy(() => import('./pages/admin/PendingRoomAdds'));
const ApplyMerchant = lazy(() => import('./pages/ApplyMerchant'));
const HotelInfo = lazy(() => import('./pages/hotelOwner/HotelInfo'));
const NotFound = lazy(() => import('./components/NotFound'));
const About = lazy(() => import('./pages/About'));
const AddRoom = lazy(() => import('./pages/hotelOwner/AddRoom'));
const EditRoom = lazy(() => import('./pages/hotelOwner/EditRoom'));
const Dashboard = lazy(() => import('./pages/hotelOwner/Dashboard'));
const ListRoom = lazy(() => import('./pages/hotelOwner/ListRoom'));
const HotelReauditDetail = lazy(() => import('./pages/hotelOwner/HotelReauditDetail'));
const Loader = lazy(() => import('./components/Loader'));
const PaySuccess = lazy(() => import('./pages/PaySuccess'));

const PageFallback = () => (
  <div className="min-h-[50vh] flex items-center justify-center" aria-hidden>
    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin" />
  </div>
);



function App() {

  const location = useLocation();
  const isOwnerPath = location.pathname.includes('owner');
  const isAdminPath = location.pathname.includes('admin');

  const {showHotelReg} = useAppContext();

  return (
      <div className="min-h-screen flex flex-col min-w-0">
        <PerfActivator />
        <PerfConsoleLogger />
        {!isOwnerPath && !isAdminPath && <NavBar/>}
        {showHotelReg && <HotelReg/>}
        <div className='w-full flex-1 min-h-0 min-w-0'>
          <Suspense fallback={<PageFallback />}>
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
            <Route path='/profile' element={<PersonalCenter/>}/>
            <Route path='/about' element={<About/>}/>
            <Route path='/loader/:nextUrl' element={<Loader />} />
            <Route path='/pay-success' element={<PaySuccess />} />
            <Route path='/apply-merchant' element={<ApplyMerchant/>} />
            <Route path='/owner' element={<Layout/>}>
              <Route index element={<Dashboard/>} />
              <Route path='list-rooms' element={<Navigate to="/owner/hotel-info" replace />} />
              <Route path='hotel-info' element={<HotelInfo/>} />
              <Route path='hotels/:hotelId/rooms' element={<ListRoom/>} />
              <Route path='hotels/:hotelId/supplement' element={<HotelReauditDetail/>} />
              <Route path='hotels/:hotelId/add-room' element={<AddRoom/>} />
              <Route path='add-room' element={<AddRoom/>} />
              <Route path='edit-room/:roomId' element={<EditRoom/>} />
            </Route>
            <Route path='/admin' element={<AdminLayout/>}>
              <Route index element={<AuditHotels/>} />
              <Route path='merchant-applications' element={<MerchantApplications/>} />
              <Route path='room-adds' element={<PendingRoomAdds/>} />
            </Route>
            <Route path='*' element={<NotFound/>}/>

          </Routes>
          </Suspense>
        </div>
        {!isOwnerPath && !isAdminPath && <Footer/>}
      </div>
  )
}

export default App
