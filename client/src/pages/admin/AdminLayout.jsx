import { Outlet, useNavigate, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { CiMenuFries } from "react-icons/ci";
import { IoClose } from "react-icons/io5";

function AdminLayout() {
    const { isPlatformAdmin, navigate } = useAppContext();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (isPlatformAdmin === false) {
            navigate("/");
        }
    }, [isPlatformAdmin, navigate]);

    if (!isPlatformAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow shrink-0 h-14 sm:h-auto sm:py-3 px-3 sm:px-4 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen((o) => !o)}
                        className="p-2.5 rounded-lg hover:bg-gray-100 md:hidden shrink-0"
                        aria-label="打开菜单"
                    >
                        <CiMenuFries size={22} />
                    </button>
                    <button type="button" onClick={() => navigate(-1)} className="hidden sm:flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800 shrink-0">返回</button>
                    <NavLink to="/" className="text-sm font-medium px-2.5 py-2 rounded-md bg-black text-white hover:bg-gray-800 shrink-0 whitespace-nowrap">返回首页</NavLink>
                </div>
                <span className="font-bold text-base sm:text-lg truncate ml-2">管理后台</span>
            </header>
            <div className="flex flex-1 relative">
                {/* 移动端遮罩 */}
                <div
                    aria-hidden
                    onClick={() => setSidebarOpen(false)}
                    className={`fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                />
                {/* 侧栏：移动端抽屉，桌面端常驻 */}
                <aside
                    className={`fixed left-0 top-14 bottom-0 w-56 max-w-[85vw] bg-gray-200 p-4 shadow-xl z-50 flex flex-col transition-transform duration-200 ease-out md:static md:top-0 md:!translate-x-0 md:!max-w-none md:w-56 md:shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
                >
                    <div className="flex items-center justify-between mb-3 md:mb-2">
                        <span className="text-gray-600 font-medium text-sm">菜单</span>
                        <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-300 md:hidden" aria-label="关闭菜单">
                            <IoClose size={20} />
                        </button>
                    </div>
                    <nav className="flex flex-col gap-1">
                        <NavLink
                            to="/admin/merchant-applications"
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-2 p-3 rounded-lg min-h-[44px] ${isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-300 active:bg-gray-400"}`
                            }
                        >
                            预审核（执照审核）
                        </NavLink>
                        <NavLink
                            to="/admin"
                            end
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-2 p-3 rounded-lg min-h-[44px] ${isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-300 active:bg-gray-400"}`
                            }
                        >
                            再审核（酒店信息）
                        </NavLink>
                        <NavLink
                            to="/admin/room-adds"
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center gap-2 p-3 rounded-lg min-h-[44px] ${isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-300 active:bg-gray-400"}`
                            }
                        >
                            房间上架申请
                        </NavLink>
                    </nav>
                </aside>
                <main className="flex-1 min-w-0 p-3 sm:p-6 overflow-auto" onClick={() => setSidebarOpen(false)}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;
