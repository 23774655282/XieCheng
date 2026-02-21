import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CiMenuFries } from 'react-icons/ci';
import { IoClose } from 'react-icons/io5';
import { useAppContext } from '../context/AppContext';

// Icon Component
const BookIcons = () => <i className="fa-solid fa-book"></i>;

const NavBar = () => {
    const navLinks = [
        { name: '首页', path: '/' },
        { name: '酒店', path: '/rooms' },
        { name: '关于', path: '/about' },
    ];

    const [isScrolled, setIsScrolled] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const location = useLocation();

    const { isAuthenticated, navigate, isOwner, isPlatformAdmin, role, setShowHotelReg, logout, userInfo } = useAppContext();

    // Scroll and Route-based Navbar style
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 10 || location.pathname !== '/') {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };


        handleScroll(); // Run on mount & on route change

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [location.pathname]);

    // 不在首页和酒店详情页显示返回按钮（酒店详情页有自己的返回按钮）
    const showBackButton = location.pathname !== '/' && !location.pathname.startsWith('/hotels/');
    const isLoginPath = location.pathname === '/login';
    // 全部房间页的返回固定回首页，其他页返回上一级
    const handleBack = () => (location.pathname === '/rooms' ? navigate('/') : navigate(-1));

    return (
        <nav className={`fixed top-0 left-0 w-full flex items-center justify-between px-4 md:px-16 lg:px-24 xl:px-32 z-50 transition-all duration-500 ${isScrolled ? 'bg-white/80 shadow-md backdrop-blur-lg py-3 md:py-4 text-gray-700' : 'bg-black/20 backdrop-blur-sm py-4 md:py-6 text-white'}`}>

            <div className="flex items-center gap-3">
            {showBackButton && (
                <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                >
                    返回
                </button>
            )}
            {/* Logo */}
            <Link to="/" aria-label="首页" className={`font-bold text-lg whitespace-nowrap transition-all duration-300 ${isScrolled ? 'text-gray-800' : 'text-white'}`}>
                易宿酒店预订平台
            </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4 lg:gap-8">
                {navLinks.map((link, index) => (
                    <Link
                        key={index}
                        to={link.path}
                        className={`group flex flex-col items-center ${isScrolled ? 'text-gray-700' : 'text-white'}`}
                    >
                        {link.name}
                        <span className={`h-0.5 w-0 group-hover:w-full transition-all duration-300 ${isScrolled ? 'bg-gray-700' : 'bg-white'}`} />
                    </Link>
                ))}

                {isAuthenticated && isPlatformAdmin && (
                    <button
                        onClick={() => navigate("/admin")}
                        className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all ${isScrolled ? 'text-black border-black' : 'text-white border-white'}`}
                    >
                        管理后台
                    </button>
                )}
                {isAuthenticated && (
                    <button
                        onClick={() => {
                            if (isOwner) navigate("/owner");
                            else setShowHotelReg(true);
                        }}
                        className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all ${isScrolled ? 'text-black border-black' : 'text-white border-white'}`}
                    >
                        {isOwner ? "商户中心" : "入驻酒店"}
                    </button>
                )}
            </div>

            {/* Desktop Right Side */}
            <div className="hidden md:flex items-center gap-3">
                {isAuthenticated && (
                    <>
                        <button
                            onClick={() => navigate("/profile")}
                            className={`flex items-center gap-2 border px-3 py-1.5 rounded-full cursor-pointer transition-all ${isScrolled ? 'text-gray-700 border-gray-700 hover:bg-gray-100' : 'text-white border-white hover:bg-white/10'}`}
                        >
                            {userInfo?.avatar ? (
                                <img src={userInfo.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                                <span className="w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                                    {(userInfo?.username || '用')[0]}
                                </span>
                            )}
                            <span className="text-sm font-medium max-w-[80px] truncate">{userInfo?.username || ''}</span>
                        </button>
                        <button
                            onClick={logout}
                            className={`border px-4 py-1 text-sm font-light rounded-full cursor-pointer transition-all ${isScrolled ? 'text-gray-700 border-gray-700 hover:bg-gray-100' : 'text-white border-white hover:bg-white/10'}`}
                        >
                            退出登录
                        </button>
                    </>
                )}
                {!isAuthenticated && !isLoginPath && (
                    <button
                        onClick={() => navigate("/login")}
                        className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-500 ${isScrolled ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-800 hover:bg-white/90'}`}
                    >
                        登录
                    </button>
                )}
            </div>

            {/* Mobile Left Side Login / Logout (仅在非登录页显示) */}
            <div className="flex items-center gap-2 md:hidden">
                {!isLoginPath && (
                    isAuthenticated ? (
                        <button
                            onClick={logout}
                            className="px-3 py-1.5 rounded-md bg-black text-white text-xs font-medium"
                        >
                            退出登录
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="px-3 py-1.5 rounded-md bg-black text-white text-xs font-medium"
                        >
                            登录
                        </button>
                    )
                )}
                {/* Mobile Menu Button */}
                <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="打开菜单">
                    <CiMenuFries className={`h-4 ${isScrolled ? 'invert' : ''}`} />
                </button>
            </div>

            {/* Mobile Menu */}
            <div className={`fixed top-0 left-0 w-full h-screen bg-white flex flex-col items-center justify-center gap-6 text-gray-800 text-base font-medium transition-transform duration-500 ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                
                <button onClick={() => setIsMenuOpen(false)} aria-label="关闭菜单" className="absolute top-4 right-4">
                    <IoClose className="h-6.5" />
                </button>

                {showBackButton && (
                    <button
                        type="button"
                        onClick={() => { setIsMenuOpen(false); handleBack(); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                    >
                        返回
                    </button>
                )}

                {isAuthenticated && (
                    <button
                        onClick={() => { setIsMenuOpen(false); navigate("/profile"); }}
                        className="flex items-center gap-2 border px-4 py-2 rounded-full"
                    >
                        {userInfo?.avatar ? (
                            <img src={userInfo.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <span className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-sm font-medium">
                                {(userInfo?.username || '用')[0]}
                            </span>
                        )}
                        <span>{userInfo?.username || ''}</span>
                    </button>
                )}

                {navLinks.map((link, index) => (
                    <Link
                        key={index}
                        to={link.path}
                        onClick={() => setIsMenuOpen(false)}
                        className="hover:text-black transition-colors duration-200"
                    >
                        {link.name}
                    </Link>
                ))}

                {isAuthenticated ? (
                    <>
                        {isPlatformAdmin && (
                            <button
                                onClick={() => { setIsMenuOpen(false); navigate("/admin"); }}
                                className="border px-4 py-1 text-sm font-light rounded-full"
                            >
                                管理后台
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsMenuOpen(false);
                                if (isOwner) navigate("/owner");
                                else setShowHotelReg(true);
                            }}
                            className="border px-4 py-1 text-sm font-light rounded-full"
                        >
                            {isOwner ? "商户中心" : "入驻酒店"}
                        </button>
                    </>
                ) : (
                    <></>
                )}
            </div>
        </nav>
    );
};

export default NavBar;
