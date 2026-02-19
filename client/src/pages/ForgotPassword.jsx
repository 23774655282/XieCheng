import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import loginBg from "../assets/login_bg.jpg";
import toast from "react-hot-toast";

const STEPS = [
  { key: "account", title: "填写账号" },
  { key: "verify", title: "验证" },
  { key: "reset", title: "重置密码" },
];

function ForgotPassword() {
  const { navigate, axios } = useAppContext();
  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState("");

  async function handleRequestCode(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/forgot-password/request", { phone: phone.trim() });
      if (data.success) {
        toast.success(data.message || "验证码已发送");
        if (data.devCode) setDevCode(data.devCode);
        setStep(1);
      } else {
        toast.error(data.message || "发送失败");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "发送失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/forgot-password/verify", { phone: phone.trim(), code: code.trim() });
      if (data.success) {
        toast.success("验证通过");
        setStep(2);
      } else {
        toast.error(data.message || "验证失败");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "验证失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("两次密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("密码至少6位");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/forgot-password/reset", {
        phone: phone.trim(),
        code: code.trim(),
        newPassword: newPassword.trim(),
      });
      if (data.success) {
        toast.success("密码重置成功");
        navigate("/login", { replace: true });
      } else {
        toast.error(data.message || "重置失败");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "重置失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `url(${loginBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative z-10 w-full max-w-md rounded-xl shadow-lg p-8 bg-white">
        <h1 className="text-2xl font-bold text-center mb-6">重置密码</h1>

        {/* 进度条 */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= step ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {i + 1}
              </div>
              <span className={`ml-2 text-sm hidden sm:inline ${i <= step ? "text-gray-800" : "text-gray-500"}`}>
                {s.title}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${i < step ? "bg-gray-800" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: 填写账号 */}
        {step === 0 && (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">账号</label>
              <input
                type="tel"
                className="w-full border border-gray-200 rounded-lg p-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="手机号"
                required
              />
              <p className="text-xs text-gray-500 mt-1">境外手机请输入国家码-手机号，如852-18616666666</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-full text-sm font-medium disabled:opacity-50 transition-all"
            >
              {loading ? "发送中..." : "下一步，验证"}
            </button>
          </form>
        )}

        {/* Step 1: 验证 */}
        {step === 1 && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">手机号</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50"
                value={phone}
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-700">验证码</label>
              <input
                type="text"
                className="w-full border border-gray-200 rounded-lg p-2"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码"
                maxLength={6}
                required
              />
              {devCode && (
                <p className="text-xs text-amber-600 mt-1">开发模式验证码：{devCode}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-full text-sm font-medium disabled:opacity-50 transition-all"
            >
              {loading ? "验证中..." : "下一步，重置密码"}
            </button>
          </form>
        )}

        {/* Step 2: 重置密码 */}
        {step === 2 && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-gray-700">新密码</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg p-2"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-700">确认密码</label>
              <input
                type="password"
                className="w-full border border-gray-200 rounded-lg p-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                minLength={6}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-full text-sm font-medium disabled:opacity-50 transition-all"
            >
              {loading ? "重置中..." : "完成"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-6">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-gray-600 hover:text-gray-800 cursor-pointer underline"
          >
            返回登录
          </button>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
