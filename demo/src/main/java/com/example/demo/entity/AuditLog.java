package com.example.demo.entity;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne @JoinColumn(name = "actor_id")
    private User actor;

    @Column(nullable = false) private String action; // e.g. RECEIPT_COMMIT
    @Column(nullable = false) private String entity; // e.g. Receipt
    private Long entityId;

    @Column(name = "before_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode beforeJson;

    @Column(name = "after_json", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private JsonNode afterJson;

    @Column(name = "ts", nullable = false)
    private LocalDateTime ts = LocalDateTime.now();
}
