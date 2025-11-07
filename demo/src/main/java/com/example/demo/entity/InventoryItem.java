package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InventoryItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "session_id")
    private InventorySession session;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(name = "system_qty", nullable = false)
    private Integer systemQty = 0;

    @Column(name = "actual_qty", nullable = false)
    private Integer actualQty = 0;

    @Column(name = "diff_qty", nullable = false)
    private Integer diffQty = 0;
}
