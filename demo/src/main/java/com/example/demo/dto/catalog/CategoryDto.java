package com.example.demo.dto.catalog;

import jakarta.validation.constraints.NotBlank;

public record CategoryDto(
        Long id,
        @NotBlank(message = "Category name is required") String name,
        Long parentId
) {}
