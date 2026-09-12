import { useState } from 'react';
import Login from "./pages/Login";
import Contest from "./pages/Contest";
import AnimatedShaderHero from "./components/ui/animated-shader-hero";

function App() {
  const [session, setSession] = useState(null);

  return (
    <AnimatedShaderHero>
      <div className="relative min-h-screen">
        {!session ? (
          <Login onJoin={setSession} showBackground={false} />
        ) : (
          <Contest session={session} />
        )}
      </div>
    </AnimatedShaderHero>
  );
}

export default App;
