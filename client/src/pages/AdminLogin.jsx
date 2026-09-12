
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem("adminToken", data.accessToken); // JWT
                navigate("/admin/dashboard");
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError("Connection failed");
        }
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
            <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md">
                <h1 className="text-2xl font-bold mb-6 text-center text-orange-500 uppercase tracking-widest">Admin Access</h1>

                {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 text-sm rounded">{error}</div>}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-orange-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-orange-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded transition"
                    >
                        Login
                    </button>
                </form>
            </div>
        </div>
    );
}
