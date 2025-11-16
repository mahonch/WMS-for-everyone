package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String action;

    private String entity;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(columnDefinition = "jsonb")
    private String beforeJson;

    @Column(columnDefinition = "jsonb")
    private String afterJson;

    @ManyToOne
    @JoinColumn(name = "actor_id")
    private User actor;

    @CreationTimestamp
    @Column(name = "ts", nullable = false, updatable = false)
    private LocalDateTime ts;
}
