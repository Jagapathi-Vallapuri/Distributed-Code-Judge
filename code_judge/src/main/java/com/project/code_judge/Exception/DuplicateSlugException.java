package com.project.code_judge.Exception;

public class DuplicateSlugException extends RuntimeException {
    public DuplicateSlugException(String message) {
        super(message);
    }

    public DuplicateSlugException(String message, Throwable cause) {
        super(message, cause);
    }
}

