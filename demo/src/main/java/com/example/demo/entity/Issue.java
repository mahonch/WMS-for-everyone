package com.example.demo.entity;

import com.example.demo.entity.enums.DocStatus;
import com.example.demo.entity.enums.IssueReason;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import com.example.demo.entity.Warehouse;
import com.example.demo.entity.Location;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "issues")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Issue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String number;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne
    @JoinColumn(name = "committed_by")
    private User committedBy;

    @Column(name = "committed_at")
    private LocalDateTime committedAt;

    private String reason;

    @ManyToOne
    @JoinColumn(name = "target_warehouse_id")
    private Warehouse targetWarehouse;

    @ManyToOne
    @JoinColumn(name = "target_location_id")
    private Location targetLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DocStatus status = DocStatus.DRAFT;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason_code", nullable = false)
    private IssueReason reasonCode = IssueReason.DAMAGE;

    @OneToMany(mappedBy = "issue", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<IssueItem> items = new ArrayList<>();
}
