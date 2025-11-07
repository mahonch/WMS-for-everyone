package com.example.demo.exception;

public class NegativeStockException extends RuntimeException {
    public NegativeStockException(String message) { super(message); }
}
