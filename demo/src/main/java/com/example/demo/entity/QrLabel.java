package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "qr_labels",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"entity_type","entity_id"}),
                @UniqueConstraint(columnNames = {"payload"})
        })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class QrLabel {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="entity_type", nullable=false)
    private String entityType; // LOCATION | BATCH | PRODUCT

    @Column(name="entity_id", nullable=false)
    private Long entityId;

    @Column(nullable=false)
    private String payload;

    @Column(name="created_at", nullable=false, updatable=false)
    private Instant createdAt = Instant.now();
}
