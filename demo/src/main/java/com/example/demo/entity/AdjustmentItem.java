package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "adjustment_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdjustmentItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "adjustment_id")
    private Adjustment adjustment;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @Column(name = "qty_delta", nullable = false)
    private Integer qtyDelta = 0;
}
