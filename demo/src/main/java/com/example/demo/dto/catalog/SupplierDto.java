package com.example.demo.dto.catalog;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * DTO для поставщиков.
 */
public class SupplierDto {

    /**
     * DTO для создания поставщика.
     */
    public record Create(
            @NotBlank(message = "Название поставщика обязательно") String name,
            String inn,
            String phone,
            @Email(message = "Некорректный email") String email,
            String address
    ) {}

    /**
     * DTO для обновления поставщика.
     */
    public record Update(
            @NotBlank(message = "Название поставщика обязательно") String name,
            String inn,
            String phone,
            @Email(message = "Некорректный email") String email,
            String address
    ) {}

    /**
     * DTO для отображения поставщика.
     */
    public record View(
            Long id,
            String name,
            String inn,
            String phone,
            String email,
            String address
    ) {}
}
