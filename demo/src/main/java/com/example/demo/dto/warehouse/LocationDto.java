package com.example.demo.dto.warehouse;

import com.example.demo.entity.enums.LocationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class LocationDto {

    public record Create(
            @NotBlank String code,
            @NotBlank String name,
            @NotNull Long warehouseId,
            Long parentId,
            LocationType type
    ) {}

    public record Update(
            @NotBlank String code,
            @NotBlank String name,
            @NotNull Long warehouseId,
            Long parentId,
            LocationType type
    ) {}

    public record View(
            Long id,
            String code,
            String name,
            Long warehouseId,
            Long parentId,
            LocationType type,
            Long totalProducts,
            Long totalQty,
            BigDecimal totalValue
    ) {}

    // === DTO для статистики склада ===
    public record Stats(
            Long products,
            Long qty,
            BigDecimal value
    ) {}
}
