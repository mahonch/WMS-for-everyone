package com.example.demo.util;

import jakarta.persistence.criteria.*;
import java.time.LocalDateTime;
import java.util.function.Function;

public final class SpecUtil {
    private SpecUtil() {}

    public static <T> Function<Root<T>, Predicate> eq(Path<?> path, CriteriaBuilder cb, Object value) {
        return root -> cb.equal(path, value);
    }

    public static <T> Function<Root<T>, Predicate> like(CriteriaBuilder cb, Path<String> path, String needle) {
        return root -> cb.like(cb.lower(path), "%" + needle.toLowerCase() + "%");
    }

    public static <T> Function<Root<T>, Predicate> betweenDate(CriteriaBuilder cb, Path<LocalDateTime> path,
                                                               LocalDateTime from, LocalDateTime to) {
        return root -> {
            if (from != null && to != null) return cb.between(path, from, to);
            if (from != null) return cb.greaterThanOrEqualTo(path, from);
            if (to != null) return cb.lessThanOrEqualTo(path, to);
            return cb.conjunction();
        };
    }
}
