package com.example.demo.dto.warehouse;

import com.example.demo.entity.enums.LocationType;
import lombok.Builder;
import lombok.Data;

/**
 * Параметры поиска локаций.
 */
@Data
@Builder
public class LocationSearchParams {
    private String code;          // поиск по коду (частичное совпадение)
    private String name;          // поиск по названию (частичное совпадение)
    private Long warehouseId;     // фильтр по складу
    private Long parentId;        // фильтр по родительской локации
    private LocationType type;    // фильтр по типу
}
