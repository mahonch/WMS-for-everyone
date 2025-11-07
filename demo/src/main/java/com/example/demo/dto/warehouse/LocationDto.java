package com.example.demo.dto.warehouse;

import com.example.demo.entity.enums.LocationType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LocationDto(
        Long id,
        @NotNull Long warehouseId,
        @NotBlank String code,
        String name,
        Long parentId,
        @NotNull LocationType type
) {}
