package com.example.demo.dto.warehouse;

import lombok.Builder;
import lombok.Data;

/**
 * Параметры поиска складов.
 */
@Data
@Builder
public class WarehouseSearchParams {
    private String name;      // поиск по названию (частичное совпадение)
    private String code;      // поиск по коду (точное или частичное)
    private Boolean isActive; // фильтр по активности
}
