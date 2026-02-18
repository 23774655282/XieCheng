import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import loginBg from "../assets/login_bg.jpg";
import toast from "react-hot-toast";

function Register() {
  const { navigate, axios, fetchUser } = useAppContext();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [devCode, setDevCode] = useState("");

  useEffect(() => {
    if (codeCountdown <= 0) return;
    const t = setInterval(() => setCodeCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [codeCountdown]);

  const allFilled = Boolean(
    username.trim() && phone.trim() && password.trim() && code.trim()
  );

  async function handleSendCode(e) {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("请先填写手机号");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/register/send-code", {
        phone: phone.trim(),
      });
      if (data.success) {
        toast.success(data.message || "验证码已发送");
        if (data.devCode) setDevCode(data.devCode);
        setCodeCountdown(60);
      } else {
        toast.error(data.message || "发送失败");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "发送失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allFilled) return;
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/register", {
        username: username.trim(),
        phone: phone.trim(),
        password,
        code: code.trim(),
      });
      if (data.success) {
        localStorage.setItem("token", data.token);
        await fetchUser();
        navigate("/", { replace: true });
      } else {
        toast.error(data.message || "注册失败");
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "注册失败";
      toast.error(msg);
      console.error("Register error:", e);
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
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-xl shadow-lg p-8 space-y-4 bg-white"
      >
        <h1 className="text-2xl font-bold text-center mb-2">注册</h1>
        <div>
          <label className="block text-sm mb-1">用户名</label>
          <input
            type="text"
            className="w-full border border-gray-200 rounded-lg p-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入用户名"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">手机号</label>
          <input
            type="tel"
            className="w-full border border-gray-200 rounded-lg p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入手机号"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">验证码</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-200 rounded-lg p-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入验证码"
              maxLength={6}
              required
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading || codeCountdown > 0}
              className="shrink-0 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {codeCountdown > 0 ? `${codeCountdown}s` : "获取验证码"}
            </button>
          </div>
          {devCode && (
            <p className="text-xs text-amber-600 mt-1">开发模式验证码：{devCode}</p>
          )}
        </div>
        <div>
          <label className="block text-sm mb-1">密码</label>
          <input
            type="password"
            className="w-full border border-gray-200 rounded-lg p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            minLength={6}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading || !allFilled}
          className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "注册中..." : "注册"}
        </button>
        <p className="text-center text-sm text-gray-600">
          已有账号？{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-blue-600 underline cursor-pointer"
          >
            去登录
          </button>
        </p>
        <p className="text-center text-xs text-gray-500 mt-2">
          想成为商户？注册后可在个人中心申请成为商户
        </p>
      </form>
    </div>
  );
}

export default Register;
