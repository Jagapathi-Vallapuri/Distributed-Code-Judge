package com.project.code_judge.Exception;

public class InvalidTestCaseFormatException extends RuntimeException {
    public InvalidTestCaseFormatException(String message) {
        super(message);
    }

    public InvalidTestCaseFormatException(String message, Throwable cause) {
        super(message, cause);
    }
}

