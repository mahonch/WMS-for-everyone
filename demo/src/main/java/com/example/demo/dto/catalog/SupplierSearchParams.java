package com.example.demo.dto.catalog;

import lombok.Builder;
import lombok.Data;

/**
 * Параметры поиска поставщиков.
 */
@Data
@Builder
public class SupplierSearchParams {
    private String name;      // поиск по названию (частичное совпадение)
    private String inn;       // поиск по ИНН (точное или частичное)
    private String email;     // поиск по email
    private String phone;     // поиск по телефону
}
