package com.example.demo.exception;

public class DocumentAlreadyCommittedException extends RuntimeException {
    public DocumentAlreadyCommittedException(String message) { super(message); }
}
