// Reset password page that allows users to set a new password using the reset token from email
"use client";
import { egyptianError } from '@/lib/egyptianError';
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/lib/api";
import StaggeredFade from "../scrollMotion/StaggeredFade";
import { Suspense } from "react";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const emailParam = searchParams.get("email");
        const tokenParam = searchParams.get("token");
        
        if (emailParam) setEmail(emailParam);
        if (tokenParam) setToken(tokenParam);

        if (!emailParam || !tokenParam) {
            setError("لينك تغيير الباسورد مش مظبوط. اطلب لينك جديد.");
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword !== confirmPassword) {
            setError("الباسوردين مش زي بعض.");
            return;
        }

        if (newPassword.length < 12) {
            setError("الباسورد لازم يكون 12 حرف على الأقل.");
            return;
        }

        setLoading(true);

        try {
            await resetPassword({ email, verificationGrant: token, newPassword });
            setSuccess("الباسورد اتغيّر بنجاح. بنحوّلك لتسجيل الدخول...");
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } catch (err: unknown) {
            const errorMessage = egyptianError(err, "معرفناش نغيّر الباسورد. ممكن صلاحية اللينك تكون خلصت.");
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <StaggeredFade>
            <div className="flex justify-center items-center h-screen overflow-hidden" style={{ height: '100vh', maxHeight: '100vh' }}>
                <div className="w-full max-w-md p-8 space-y-6 bg-white/5 border border-[#bfa68a] rounded-2xl shadow-lg backdrop-blur-lg transform -translate-y-[25%]">
                    <h1 className="text-4xl font-playfair text-center text-[#F9F6F2]">حدد باسورد جديد</h1>
                    <p className="text-[#bfa68a] mt-2 text-sm text-center">
                        اكتب الباسورد الجديد تحت.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="باسورد جديد"
                                className="w-full h-10 px-4 rounded-md border border-[#bfa68a] text-[#bfa68a] bg-transparent placeholder-[#bfa68a]/70 focus:outline-none"
                                required
                                disabled={loading || !email || !token}
                                minLength={12}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="اكتب الباسورد الجديد تاني"
                                className="w-full h-10 px-4 rounded-md border border-[#bfa68a] text-[#bfa68a] bg-transparent placeholder-[#bfa68a]/70 focus:outline-none"
                                required
                                disabled={loading || !email || !token}
                                minLength={12}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {success && <p className="text-sm text-green-500">{success}</p>}
                        <button 
                            type="submit" 
                            disabled={loading || !email || !token}
                            className="w-full py-2 font-semibold text-[#1e1512] bg-gradient-to-r from-[#bfa68a] to-[#f0e6d2] rounded-xl hover:opacity-90 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "بنغيّر الباسورد..." : "غيّر الباسورد"}
                        </button>
                    </form>
                    <p className="text-sm text-center text-[#bfa68a]">
                        <Link href="/login" className="underline hover:text-[#F9F6F2] cursor-pointer">
                            ارجع لتسجيل الدخول
                        </Link>
                    </p>
                </div>
            </div>
        </StaggeredFade>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen">بنحمّل...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}

