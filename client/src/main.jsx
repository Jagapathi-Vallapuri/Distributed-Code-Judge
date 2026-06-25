import { StrictMode } from "react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import "katex/dist/katex.min.css";
import App from "./App.jsx";
import AuthPage from "./AuthPage.jsx";
import { clearStoredAuth, getStoredAuth, setStoredAuth } from "./auth";
import { getAuthSession } from "./api";
import SubmissionHistoryPage from "./SubmissionHistoryPage.jsx";

const RequireAuth = ({ children }) => {
    const [authState, setAuthState] = useState({ loading: true, authenticated: false });

    useEffect(() => {
        let isMounted = true;

        const verifySession = async () => {
            try {
                const session = await getAuthSession();
                if (!isMounted) return;

                if (session?.authenticated) {
                    if (!getStoredAuth()?.username && session?.principal) {
                        setStoredAuth({ username: session.principal });
                    }
                    setAuthState({ loading: false, authenticated: true });
                    return;
                }

                clearStoredAuth();
                setAuthState({ loading: false, authenticated: false });
            } catch (error) {
                if (!isMounted) return;
                clearStoredAuth();
                setAuthState({ loading: false, authenticated: false });
            }
        };

        verifySession();

        return () => {
            isMounted = false;
        };
    }, []);

    if (authState.loading) {
        return null;
    }

    if (!authState.authenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={
                        <RequireAuth>
                            <App />
                        </RequireAuth>
                    }
                />
                <Route
                    path="/history"
                    element={
                        <RequireAuth>
                            <SubmissionHistoryPage />
                        </RequireAuth>
                    }
                />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);
