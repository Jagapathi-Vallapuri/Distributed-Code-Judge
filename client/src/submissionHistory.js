const STORAGE_KEY = "submissionHistory";

const readJson = (value) => {
    try {
        return JSON.parse(value);
    } catch (error) {
        return [];
    }
};

export const getSubmissionHistory = () => {
    if (typeof window === "undefined") return [];

    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? readJson(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
};

export const setSubmissionHistory = (history) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
};

export const upsertSubmissionHistoryEntry = (entry) => {
    const history = getSubmissionHistory();
    const index = history.findIndex((item) => item.id === entry.id);
    const nextEntry = {
        ...history[index],
        ...entry,
        updatedAt: entry.updatedAt || new Date().toISOString(),
    };

    if (index >= 0) {
        history[index] = nextEntry;
    } else {
        history.unshift({
            ...nextEntry,
            submittedAt: entry.submittedAt || nextEntry.updatedAt,
        });
    }

    setSubmissionHistory(history);
    return history;
};

export const clearSubmissionHistory = () => {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem(STORAGE_KEY);
};
