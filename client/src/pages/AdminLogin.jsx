
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import FooterLogos from "../components/FooterLogos";
import { API_URL } from "../utils/api";

export default function AdminLogin() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
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
        <div className="min-h-screen bg-black text-white flex flex-col justify-between font-sans">
            <div className="h-4" />

            <div className="w-full max-w-md p-8 bg-white/5 border border-white/10 rounded-xl backdrop-blur-md mx-auto my-auto shadow-2xl">
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
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 rounded transition cursor-pointer"
                    >
                        Login
                    </button>
                </form>
            </div>

            {/* Footer */}
            <footer className="w-full border-t border-white/10 bg-[#0d0707] px-6 py-4">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400 font-mono">
                    <div>G-Prime Administration Portal • GRIET</div>
                    <FooterLogos />
                </div>
            </footer>
        </div>
    );
}

