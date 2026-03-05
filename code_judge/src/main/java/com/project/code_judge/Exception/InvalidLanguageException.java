package com.project.code_judge.Exception;

public class InvalidLanguageException extends RuntimeException {
    public InvalidLanguageException(String message) {
        super(message);
    }

    public InvalidLanguageException(String message, Throwable cause) {
        super(message, cause);
    }
}

