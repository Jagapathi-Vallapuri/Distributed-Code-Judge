package com.project.code_judge.Exception;

public class TestCaseUploadException extends RuntimeException {
    public TestCaseUploadException(String message) {
        super(message);
    }

    public TestCaseUploadException(String message, Throwable cause) {
        super(message, cause);
    }
}

