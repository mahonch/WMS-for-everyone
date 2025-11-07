package com.example.demo.repository;

import com.example.demo.entity.QrLabel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QrLabelRepository extends JpaRepository<QrLabel, Long> {
    Optional<QrLabel> findByEntityTypeAndEntityId(String entityType, Long entityId);
    Optional<QrLabel> findByPayload(String payload);
}
