import { useState } from "react";
import IntroSection from "../components/IntroSection";
import HeroSection from "../components/HeroSection";
import AnimatedShaderHero from "../components/ui/animated-shader-hero";

export default function Login({ onJoin, showBackground = true }) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin() {
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (res.ok) {
        if (onJoin) {
          onJoin(data);
        } else {
          window.location.href = "/contest";
        }
      } else {
        alert(data.error);
      }
    } catch {
      alert("Connection error");
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <div className="text-white font-['Space_Grotesk']">
      <IntroSection />
      <HeroSection
        onJoin={{
          token,
          setToken,
          handleJoin,
          loading,
        }}
      />
    </div>
  );

  if (!showBackground) {
    return content;
  }

  return (
    <AnimatedShaderHero
      className="!h-auto !min-h-screen !overflow-y-auto"
      contentClassName="!relative !h-auto !min-h-screen"
    >
      {content}
    </AnimatedShaderHero>
  );
}