package com.example.demo.repository;

import com.example.demo.entity.InventorySession;
import com.example.demo.entity.enums.InventoryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventorySessionRepository extends JpaRepository<InventorySession, Long> {
    List<InventorySession> findByStatusOrderByStartedAtDesc(InventoryStatus status);
}
