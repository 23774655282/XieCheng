import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import loginBg from "../assets/login_bg.jpg";
import toast from "react-hot-toast";

const MODE_PASSWORD = "password";
const MODE_CODE = "code";

function Login() {
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { navigate, axios, fetchUser } = useAppContext();
  const [mode, setMode] = useState(MODE_PASSWORD);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [devCode, setDevCode] = useState("");

  useEffect(() => {
    if (codeCountdown <= 0) return;
    const t = setInterval(() => setCodeCountdown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [codeCountdown]);

  async function handleSubmitPassword(e) {
    e.preventDefault();
    setErrorMsg("");
    const p = String(phone ?? "").trim();
    const pw = String(password ?? "").trim();
    if (!p || !pw) {
      const msg = "请输入手机号和密码";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/login", { phone: p, password: pw });
      if (data.success) {
        localStorage.setItem("token", data.token);
        await fetchUser();
        const role = data.user?.role || "user";
        if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
          navigate(redirectTo, { replace: true });
        } else if (role === "admin") navigate("/admin", { replace: true });
        else navigate("/", { replace: true });
      } else {
        const msg = data.message || "登录失败";
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (e) {
      const msg = e.response?.data?.message || "登录失败";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendCode(e) {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("请输入手机号");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/login/send-code", { phone: phone.trim() });
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

  async function handleSubmitCode(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/login/by-code", { phone: phone.trim(), code: code.trim() });
      if (data.success) {
        localStorage.setItem("token", data.token);
        await fetchUser();
        const role = data.user?.role || "user";
        if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
          navigate(redirectTo, { replace: true });
        } else if (role === "admin") navigate("/admin", { replace: true });
        else navigate("/", { replace: true });
      } else {
        toast.error(data.message || "登录失败");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "登录失败");
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
      <div className="relative z-10 w-full max-w-md rounded-xl shadow-lg p-8 space-y-4 bg-white">
        <h1 className="text-2xl font-bold text-center mb-4">登录</h1>

        {/* 切换：密码登录 / 验证码登录 */}
        <div className="flex border-b border-gray-200 mb-4">
          <button
            type="button"
            onClick={() => setMode(MODE_PASSWORD)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === MODE_PASSWORD ? "text-gray-800 border-b-2 border-gray-800" : "text-gray-500"
            }`}
          >
            密码登录
          </button>
          <button
            type="button"
            onClick={() => setMode(MODE_CODE)}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === MODE_CODE ? "text-gray-800 border-b-2 border-gray-800" : "text-gray-500"
            }`}
          >
            验证码登录
          </button>
        </div>

        {/* 手机号：共用 */}
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

        {mode === MODE_PASSWORD ? (
          <form onSubmit={handleSubmitPassword} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">密码</label>
              <div className="relative">
                <input
                  type="password"
                  className="w-full border border-gray-200 rounded-lg p-2 pr-24"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="登录密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  忘记密码
                </button>
              </div>
            </div>
            <div className="min-h-[1.25rem] flex items-center">
              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-full text-sm font-medium disabled:opacity-50 transition-all"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmitCode} className="space-y-4">
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
              {devCode && <p className="text-xs text-amber-600 mt-1">开发模式验证码：{devCode}</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-2.5 rounded-full text-sm font-medium disabled:opacity-50 transition-all"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          还没有账号？{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-blue-600 underline cursor-pointer"
          >
            去注册
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;

