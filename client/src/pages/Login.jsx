import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import loginBg from "../assets/login_bg.jpg";

function Login() {
  const { navigate, axios, fetchUser } = useAppContext();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/login", { phone, password });
      if (data.success) {
        localStorage.setItem("token", data.token);
        await fetchUser();
        const role = data.user?.role || "user";
        if (role === "admin") {
          navigate("/admin", { replace: true });
        } else if (role === "merchant") {
          navigate("/owner", { replace: true });
        } else {
          // 普通订酒店用户：登录后直接回首页
          navigate("/", { replace: true });
        }
      } else {
        alert(data.message || "登录失败");
      }
    } catch (e) {
      alert("登录失败");
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
        className="relative z-10 bg-white/65 backdrop-blur-sm rounded-xl shadow-lg p-8 w-full max-w-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-center mb-2">登录</h1>
        <div>
          <label className="block text-sm mb-1">手机号</label>
          <input
            type="tel"
            className="w-full border rounded p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">密码</label>
          <input
            type="password"
            className="w-full border rounded p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? "登录中..." : "登录"}
        </button>
        <p className="text-center text-sm text-gray-600">
          还没有账号？{" "}
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-blue-600 underline"
          >
            去注册
          </button>
        </p>
      </form>
    </div>
  );
}

export default Login;

