package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "issue_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class IssueItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "issue_id")
    private Issue issue;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @Column(nullable = false)
    private Integer qty;

    // фиксируем себестоимость для отчётности
    @Column(name = "cost_price", nullable = false)
    private java.math.BigDecimal costPrice = java.math.BigDecimal.ZERO;
}
