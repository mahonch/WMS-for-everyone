package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "receipt_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReceiptItem {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "receipt_id")
    private Receipt receipt;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne
    @JoinColumn(name = "batch_id")
    private Batch batch; // можно заполнить после создания партии

    @Column(nullable = false)
    private Integer qty;

    @Column(nullable = false)
    private BigDecimal price;
}
