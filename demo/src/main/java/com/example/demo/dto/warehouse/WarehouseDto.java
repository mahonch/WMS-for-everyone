package com.example.demo.dto.warehouse;

import jakarta.validation.constraints.NotBlank;

public record WarehouseDto(
        Long id,
        @NotBlank String name,
        String code,
        String address,
        Boolean isActive
) {}
