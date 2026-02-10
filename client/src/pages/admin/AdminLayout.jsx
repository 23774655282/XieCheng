import { Outlet, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppContext } from "../../context/AppContext";
import { NavLink } from "react-router-dom";

function AdminLayout() {
    const { isPlatformAdmin, navigate } = useAppContext();

    useEffect(() => {
        if (isPlatformAdmin === false) {
            navigate("/");
        }
    }, [isPlatformAdmin, navigate]);

    if (!isPlatformAdmin) return null;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow py-3 px-4 flex items-center justify-between">
                <span className="font-bold text-lg">管理后台 — 酒店审核</span>
                <NavLink to="/" className="text-blue-600 text-sm">返回首页</NavLink>
            </header>
            <div className="flex flex-1">
                <aside className="w-56 bg-gray-200 p-4">
                    <NavLink
                        to="/admin"
                        end
                        className={({ isActive }) =>
                            `block p-2 rounded mb-2 ${isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-300"}`
                        }
                    >
                        酒店审核/发布/下线
                    </NavLink>
                </aside>
                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AdminLayout;
