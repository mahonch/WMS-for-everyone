package com.example.demo.entity;

import com.example.demo.entity.stock.StockId;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stock")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stock {

    @EmbeddedId
    private StockId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("locationId")
    private Location location;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("batchId")
    private Batch batch;

    @Column(nullable = false)
    private int qty;

    /**
     * Вспомогательный метод — возвращает "плоский" surrogate id (если нужно для DTO/JSON)
     * Просто хеш из составного ключа.
     */
    public Long getId() {
        if (id == null) return null;
        // Можно вернуть хэш в виде long, если нужно что-то уникальное для фронта
        return (id.hashCode() & 0xffffffffL);
    }
}
