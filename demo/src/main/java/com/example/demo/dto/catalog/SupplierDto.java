package com.example.demo.dto.catalog;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SupplierDto(
        Long id,
        @NotBlank(message = "Supplier name is required") String name,
        String inn,
        String phone,
        @Email(message = "Invalid email") String email,
        String address
) {}
