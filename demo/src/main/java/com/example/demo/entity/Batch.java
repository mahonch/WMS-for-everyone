package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalDate;

@Entity
@Table(name = "batches")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Batch {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "received_at", nullable = false)
    private LocalDateTime receivedAt = LocalDateTime.now();

    @Column(name = "buy_price", nullable = false)
    private BigDecimal buyPrice = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer quantity;          // изначально принято

    @Column(name = "available_qty", nullable = false)
    private Integer availableQty;      // доступно (для списания)

    @Column(name = "expiry_date")
    private LocalDate expiryDate;
}
