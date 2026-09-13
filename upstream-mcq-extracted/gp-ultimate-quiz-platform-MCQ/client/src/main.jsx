import '@fontsource/space-grotesk/300.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/700.css';
import 'material-symbols/outlined.css';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { loader } from '@monaco-editor/react';
import { Navigate } from "react-router-dom";
import App from './App.jsx'
import CandidateLogin from './pages/CandidateLogin.jsx'
import ExamRoute from './components/ExamRoute.jsx'
import ExamPage from './pages/ExamPage.jsx'
import AdminLogin from './pages/AdminLogin.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ExamConfig from './pages/ExamConfig.jsx'
import ShiftManager from './pages/ShiftManager.jsx'
import QuestionBank from './pages/QuestionBank.jsx'
import WeightagePreset from './pages/WeightagePreset.jsx'
import PaperGenerator from './pages/PaperGenerator.jsx'
import TokenManager from './pages/TokenManager.jsx'
import ResultsDashboard from './pages/ResultsDashboard.jsx'
import AdminSampleInputs from './pages/AdminSampleInputs.jsx'
import GradingConfig from './pages/GradingConfig.jsx'
import './index.css'
import AnimatedShaderHero from './components/ui/animated-shader-hero.jsx';

// Point Monaco Editor to local files instead of the CDN (works offline on LAN)
loader.config({ paths: { vs: `${import.meta.env.BASE_URL}node_modules/monaco-editor/min/vs` } });

// Eagerly initialize Monaco as soon as the app boots so it is already cached
// by the time any user navigates to a contest page — eliminates "Loading..." delay.
loader.init().catch(() => { /* silently ignore — fallback handled by Editor component */ });

const router = createBrowserRouter([
    {
        path: "/",
        element: <CandidateLogin />
    },
    {
        path: "/login",
        element: <CandidateLogin />
    },
    {
        path: "/exam",
        element: (
            <ExamRoute>
                <ExamPage />
            </ExamRoute>
        )
    },
    {
        path: "/ani",
        element: <AnimatedShaderHero />
    },
    {
        path: "/app",
        element: <App />
    },
    {
        path: "/admin",
        element: <Navigate to="/admin/dashboard" replace />
    },
    {
        path: "/admin/login",
        element: <AdminLogin />
    },
    {
        path: "/admin/dashboard",
        element: <AdminDashboard />
    },
    {
        path: "/admin/exam",
        element: <ExamConfig />
    },
    {
        path: "/admin/shifts",
        element: <ShiftManager />
    },
    {
        path: "/admin/questions",
        element: <QuestionBank />
    },
    {
        path: "/admin/weightage",
        element: <WeightagePreset />
    },
    {
        path: "/admin/generate",
        element: <PaperGenerator />
    },
    {
        path: "/admin/tokens",
        element: <TokenManager />
    },
    {
        path: "/admin/results",
        element: <ResultsDashboard />
    },
    {
        path: "/admin/sample-inputs",
        element: <AdminSampleInputs />
    },
    {
        path: "/admin/grading",
        element: <GradingConfig />
    }
]);

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
)
