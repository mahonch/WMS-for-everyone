package com.example.demo.util;

import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class NumberGenerator {
    private final AtomicInteger seq = new AtomicInteger(1);
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");

    public String next(String prefix) {
        return prefix + "-" + LocalDateTime.now().format(FMT) + "-" + seq.getAndIncrement();
    }
}
