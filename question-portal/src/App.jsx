import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Questions from './pages/Questions';
import QuestionEditor from './pages/QuestionEditor';

const AUTH_KEY = 'gp_portal_auth';

export default function App() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem(AUTH_KEY));

  function handleLogin() {
    sessionStorage.setItem(AUTH_KEY, '1');
    setAuthed(true);
  }

  function handleLogout() {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  }

  if (!authed) return <Login onLogin={handleLogin} />;

  return (
    <Routes>
      <Route path="/" element={<Questions onLogout={handleLogout} />} />
      <Route path="/questions/new" element={<QuestionEditor onLogout={handleLogout} />} />
      <Route path="/questions/:id/edit" element={<QuestionEditor onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
