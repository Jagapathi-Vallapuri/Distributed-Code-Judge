package com.project.code_judge.Exception;

public class SubmissionQueueException extends RuntimeException {
    public SubmissionQueueException(String message) {
        super(message);
    }

    public SubmissionQueueException(String message, Throwable cause) {
        super(message, cause);
    }
}

