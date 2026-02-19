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
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800">← 返回</button>
                    <NavLink to="/" className="text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800">返回首页</NavLink>
                </div>
                <span className="font-bold text-lg">管理后台 — 酒店审核</span>
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
                    <NavLink
                        to="/admin/merchant-applications"
                        className={({ isActive }) =>
                            `block p-2 rounded mb-2 ${isActive ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-300"}`
                        }
                    >
                        商户申请审核
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
