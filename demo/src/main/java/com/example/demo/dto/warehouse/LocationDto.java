package com.example.demo.dto.warehouse;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public class LocationDto {

    public record Create(
            @NotBlank String code,
            @NotBlank String name
    ) {}

    public record Update(
            @NotBlank String code,
            @NotBlank String name
    ) {}

    public record View(
            Long id,
            String code,
            String name,
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
