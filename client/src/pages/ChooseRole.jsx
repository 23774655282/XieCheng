import { useAppContext } from "../context/AppContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

/** 大作业要求：注册时选择角色 - 商户(上传/编辑酒店) 或 管理员(审核/发布/下线) */
function ChooseRole() {
    const { user, role, setRole: setRoleAPI, navigate } = useAppContext();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate("/");
            return;
        }
        if (role && role !== "user") {
            if (role === "admin") navigate("/admin", { replace: true });
            else navigate("/owner", { replace: true });
        }
    }, [user, role, navigate]);

    const handleChoose = async (roleChoice) => {
        setLoading(true);
        try {
            const ok = await setRoleAPI(roleChoice);
            if (ok) {
                toast.success("角色设置成功");
                if (roleChoice === "admin") navigate("/admin", { replace: true });
                else navigate("/owner", { replace: true });
            } else {
                toast.error("设置失败，请重试");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!user || role !== "user") return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
                <h1 className="text-2xl font-bold text-center mb-2">选择您的角色</h1>
                <p className="text-gray-600 text-center text-sm mb-6">注册后请选择身份，仅可设置一次</p>
                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={() => handleChoose("merchant")}
                        disabled={loading}
                        className="w-full py-4 px-4 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 font-medium disabled:opacity-50"
                    >
                        商户 — 上传/编辑酒店信息
                    </button>
                    <button
                        type="button"
                        onClick={() => handleChoose("admin")}
                        disabled={loading}
                        className="w-full py-4 px-4 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 font-medium disabled:opacity-50"
                    >
                        管理员 — 审核/发布/下线酒店
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChooseRole;
