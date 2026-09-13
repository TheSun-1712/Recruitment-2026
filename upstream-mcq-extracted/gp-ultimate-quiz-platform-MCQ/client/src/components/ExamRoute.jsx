import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ExamRoute({ children }) {
    const rawSession = sessionStorage.getItem('examSession');

    if (!rawSession) {
        return <Navigate to="/login" replace />;
    }

    try {
        const session = JSON.parse(rawSession);
        if (!session.jwt || !session.candidateId) {
            sessionStorage.removeItem('examSession');
            return <Navigate to="/login" replace />;
        }
    } catch (e) {
        sessionStorage.removeItem('examSession');
        return <Navigate to="/login" replace />;
    }

    return children;
}
