package com.example.demo.dto.warehouse;

import com.example.demo.entity.enums.LocationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/**
 * DTO для локаций (ячеек хранения).
 */
public class LocationDto {

    /**
     * DTO для создания локации.
     */
    public record Create(
            @NotBlank(message = "Код локации обязателен") String code,
            @NotBlank(message = "Название обязательно") String name,
            @NotNull(message = "Склад обязателен") Long warehouseId,
            Long parentId,
            LocationType type
    ) {}

    /**
     * DTO для обновления локации.
     */
    public record Update(
            @NotBlank(message = "Код локации обязателен") String code,
            @NotBlank(message = "Название обязательно") String name,
            @NotNull(message = "Склад обязателен") Long warehouseId,
            Long parentId,
            LocationType type
    ) {}

    /**
     * DTO для отображения локации со статистикой.
     */
    public record View(
            Long id,
            String code,
            String name,
            Long warehouseId,
            String warehouseName,
            Long parentId,
            String parentName,
            LocationType type,
            Long totalProducts,
            Long totalQty,
            BigDecimal totalValue
    ) {}
}
