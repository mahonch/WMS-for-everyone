package com.example.demo.entity.stock;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockId implements Serializable {
    private Long productId;
    private Long locationId;
    private Long batchId;
}
