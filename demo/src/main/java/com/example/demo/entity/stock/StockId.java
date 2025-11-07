package com.example.demo.entity.stock;

import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StockId implements Serializable {
    private Long productId;
    private Long locationId;
    private Long batchId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof StockId that)) return false;
        return Objects.equals(productId, that.productId)
                && Objects.equals(locationId, that.locationId)
                && Objects.equals(batchId, that.batchId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(productId, locationId, batchId);
    }


}
