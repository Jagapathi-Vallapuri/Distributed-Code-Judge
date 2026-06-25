import axios from "axios";
import { clearStoredAuth } from "./auth";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
    withXSRFToken: true,
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
});

let csrfReadyPromise = null;

const readCookie = (name) => {
    if (typeof document === "undefined") return null;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
};

const ensureCsrfToken = async () => {
    if (!csrfReadyPromise) {
        csrfReadyPromise = api.get("/auth/csrf").catch((error) => {
            csrfReadyPromise = null;
            throw error;
        });
    }
    return csrfReadyPromise;
};

const isAuthExemptRequest = (url = "") => {
    return ["/auth/login", "/auth/register", "/auth/google", "/auth/logout", "/auth/csrf"].some((path) =>
        url.includes(path)
    );
};

const redirectToLogin = () => {
    if (typeof window === "undefined") return;
    const pathname = window.location.pathname;
    if (pathname === "/login" || pathname === "/register") return;
    window.location.replace("/login");
};

api.interceptors.request.use(async (config) => {
    const method = (config.method || "get").toLowerCase();
    const shouldPrimeCsrf = ["post", "put", "patch", "delete"].includes(method)
        && config.url !== "/auth/csrf";

    if (shouldPrimeCsrf) {
        await ensureCsrfToken();
        const token = readCookie("XSRF-TOKEN");
        if (token) {
            config.headers = config.headers || {};
            config.headers["X-XSRF-TOKEN"] = token;
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const requestUrl = error?.config?.url || "";

        if (status === 401 && !isAuthExemptRequest(requestUrl)) {
            clearStoredAuth();
            redirectToLogin();
        }

        return Promise.reject(error);
    }
);

export const getAuthSession = async () => {
    try {
        const res = await api.get("/auth/me");
        return res.data;
    } catch (error) {
        console.error("Error fetching auth session:", error);
        throw error;
    }
};

export const getProblems = async () => {
    try {
        const res = await api.get("/problems/");
        return res.data;
    } catch (error) {
        console.error("Error fetching problems:", error);
        throw error;
    }
};

export const submitCode = async (submission) => {
    try {
        const res = await api.post("/submissions", submission);
        return res.data;

    } catch (error) {
        console.error("Error submitting code:", error);
        throw error;
    }
};

export const getSubmissionStatus = async (submissionId) => {
    try {
        const res = await api.get(`/submissions/${submissionId}`);
        return res.data;
    } catch (error) {
        console.error("Error fetching submission status:", error);
        throw error;
    }
};

export const getProblemDetails = async (problemId) => {
    try {
        const res = await api.get(`/problems/${problemId}`);
        return res.data;
    } catch (error) {
        console.error("Error fetching problem details:", error);
        throw error;
    }
};

export const registerUser = async (payload) => {
    try {
        const res = await api.post("/auth/register", payload);
        return res.data;
    } catch (error) {
        console.error("Error registering user:", error);
        throw error;
    }
};

export const loginUser = async (payload) => {
    try {
        const res = await api.post("/auth/login", payload);
        return res.data;
    } catch (error) {
        console.error("Error logging in:", error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        const res = await api.post("/auth/logout");
        return res.data;
    } catch (error) {
        console.error("Error logging out:", error);
        throw error;
    }
};

export const googleLogin = async (token) => {
    try {
        const res = await api.post("/auth/google", { token });
        return res.data;
    } catch (error) {
        console.error("Error with google login:", error);
        throw error;
    }
};
