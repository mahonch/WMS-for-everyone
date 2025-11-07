package com.example.demo.repository;

import com.example.demo.entity.Adjustment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdjustmentRepository extends JpaRepository<Adjustment, Long> {
    List<Adjustment> findBySessionId(Long sessionId);
}
