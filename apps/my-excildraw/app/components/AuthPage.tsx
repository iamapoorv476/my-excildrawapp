"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";


export function AuthPage({ isSignin }: { isSignin: boolean }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async () => {
        setError("");
        setLoading(true);

        try {
            const endpoint = isSignin ? "/signin" : "/signup";
            const body = isSignin
                ? { username, password }
                : { username, password, name };

            const response = await fetch(`http://localhost:3001${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Something went wrong");
                setLoading(false);
                return;
            }

            if (isSignin) {
                
                localStorage.setItem("token", data.token);
             
                router.push("/canvas");
            } else {
                
                router.push("/signin");
            }
        } catch (err) {
            setError("Failed to connect to server");
            setLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex justify-center items-center bg-gray-100">
            <div className="p-8 m-2 bg-white rounded-lg shadow-lg w-96">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    {isSignin ? "Sign In" : "Sign Up"}
                </h2>

                {!isSignin && (
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}

                <div className="p-2">
                    <input
                        type="text"
                        placeholder="Email/Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="p-2">
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {error && (
                    <div className="p-2 text-red-500 text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="pt-4 p-2">
                    <button
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded p-3 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Loading..." : isSignin ? "Sign In" : "Sign Up"}
                    </button>
                </div>

                <div className="pt-2 text-center">
                    <a
                        href={isSignin ? "/signup" : "/signin"}
                        className="text-blue-500 hover:underline text-sm"
                    >
                        {isSignin
                            ? "Don't have an account? Sign up"
                            : "Already have an account? Sign in"}
                    </a>
                </div>
            </div>
        </div>
    );
}