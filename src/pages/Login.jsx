import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../core/firebase";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [err,setErr]=useState("");
  const [busy,setBusy]=useState(false);
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      await signInWithEmailAndPassword(auth,email,password);
      nav("/");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4">Sign in</h1>
        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}
        <label className="block mb-3">
          <span className="text-sm">Email</span>
          <input className="mt-1 w-full border rounded px-3 py-2"
                 value={email} onChange={e=>setEmail(e.target.value)} />
        </label>
        <label className="block mb-4">
          <span className="text-sm">Password</span>
          <input type="password" className="mt-1 w-full border rounded px-3 py-2"
                 value={password} onChange={e=>setPassword(e.target.value)} />
        </label>
        <button disabled={busy} className="w-full bg-black text-white py-2 rounded">
          {busy ? "Signing in..." : "Login"}
        </button>
        <p className="text-sm mt-3">No account? <Link to="/register" className="text-blue-600">Register</Link></p>
      </form>
    </div>
  );
}
