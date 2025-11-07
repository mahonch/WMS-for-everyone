package com.example.demo.entity;

import com.example.demo.entity.stock.StockId;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stock")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Stock {

    @EmbeddedId
    private StockId id;

    @ManyToOne(optional = false) @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(optional = false) @MapsId("locationId")
    @JoinColumn(name = "location_id")
    private Location location;

    @ManyToOne(optional = false) @MapsId("batchId")
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @Column(nullable = false)
    private Integer qty = 0;
}
