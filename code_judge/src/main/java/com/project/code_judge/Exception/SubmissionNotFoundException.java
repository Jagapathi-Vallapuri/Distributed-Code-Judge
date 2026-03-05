package com.project.code_judge.Exception;

public class SubmissionNotFoundException extends RuntimeException {
    public SubmissionNotFoundException(String message) {
        super(message);
    }

    public SubmissionNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}

