import { useState } from "react";
import { useAppContext } from "../context/AppContext";
import loginBg from "../assets/login_bg.jpg";

function Register() {
  const { navigate, axios, fetchUser } = useAppContext();
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post("/api/auth/register", { username, phone, password });
      if (data.success) {
        localStorage.setItem("token", data.token);
        await fetchUser();
        // 注册成功后：普通用户直接回首页（如需成为商户/管理员，再从“入驻酒店”入口去选角色）
        navigate("/", { replace: true });
      } else {
        alert(data.message || "注册失败");
      }
    } catch (e) {
      alert("注册失败");
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
        <h1 className="text-2xl font-bold text-center mb-2">注册</h1>
        <div>
          <label className="block text-sm mb-1">用户名</label>
          <input
            type="text"
            className="w-full border rounded p-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
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
          {loading ? "注册中..." : "注册"}
        </button>
        <p className="text-center text-sm text-gray-600">
          已有账号？{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-blue-600 underline"
          >
            去登录
          </button>
        </p>
      </form>
    </div>
  );
}

export default Register;

