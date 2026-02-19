package com.example.demo.dto.warehouse;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO для складов.
 */
public class WarehouseDto {

    /**
     * DTO для создания склада.
     */
    public record Create(
            @NotBlank(message = "Название склада обязательно") String name,
            String code,
            String address,
            Boolean isActive
    ) {}

    /**
     * DTO для обновления склада.
     */
    public record Update(
            @NotBlank(message = "Название склада обязательно") String name,
            String code,
            String address,
            Boolean isActive
    ) {}

    /**
     * DTO для отображения склада.
     */
    public record View(
            Long id,
            String name,
            String code,
            String address,
            Boolean isActive
    ) {}
}
