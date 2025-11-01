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

            console.log(" Attempting to", isSignin ? "sign in" : "sign up");
            
            const response = await fetch(`http://localhost:3001${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            console.log(" Response data:", data);

            if (!response.ok) {
                setError(data.message || "Something went wrong");
                setLoading(false);
                return;
            }

            if (isSignin) {
                // Validate token before storing
                if (!data.token) {
                    console.error(" No token in response:", data);
                    setError("Server didn't return authentication token");
                    setLoading(false);
                    return;
                }

                
                const tokenParts = data.token.split('.');
                if (tokenParts.length !== 3) {
                    console.error(" Invalid token format:", data.token);
                    console.error("Token parts:", tokenParts.length);
                    setError("Invalid token format received from server");
                    setLoading(false);
                    return;
                }

                console.log(" Valid JWT token received");
                console.log(" Token preview:", data.token.substring(0, 50) + "...");
                
                // Store the token
                localStorage.setItem("token", data.token);
                console.log(" Token saved to localStorage");
                
                
                const savedToken = localStorage.getItem("token");
                if (savedToken === data.token) {
                    console.log(" Token verified in localStorage");
                } else {
                    console.error(" Token mismatch after saving!");
                }
                
                // Navigate to canvas
                router.push("/canvas");
            } else {
                // After successful signup, redirect to signin
                console.log(" Signup successful, redirecting to signin");
                router.push("/signin");
            }
        } catch (err) {
            console.error(" Request failed:", err);
            setError("Failed to connect to server");
            setLoading(false);
        }
    };

    return (
        <div className="w-screen h-screen flex justify-center items-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="p-8 m-2 bg-gray-800 rounded-xl shadow-2xl w-96 border border-gray-700">
                <h2 className="text-3xl font-bold mb-6 text-center text-white">
                    {isSignin ? "Sign In" : "Sign Up"}
                </h2>

                {!isSignin && (
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                )}

                <div className="p-2">
                    <input
                        type="text"
                        placeholder="Email/Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                <div className="p-2">
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>

                {error && (
                    <div className="p-3 m-2 bg-red-900/50 border border-red-500 rounded-lg">
                        <p className="text-red-300 text-sm text-center">{error}</p>
                    </div>
                )}

                <div className="pt-4 p-2">
                    <button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg p-3 transition-all shadow-lg hover:shadow-xl disabled:bg-gray-600 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                            </span>
                        ) : (
                            isSignin ? "Sign In" : "Sign Up"
                        )}
                    </button>
                </div>

                <div className="pt-2 text-center">
                    <a
                        href={isSignin ? "/signup" : "/signin"}
                        className="text-blue-400 hover:text-blue-300 hover:underline text-sm transition-colors"
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