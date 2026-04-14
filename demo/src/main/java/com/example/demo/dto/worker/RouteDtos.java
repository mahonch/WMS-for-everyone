package com.example.demo.dto.worker;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO для маршрутов.
 */
public class RouteDtos {

    public record View(
            Long id,
            Long taskId,
            LocalDateTime createdAt,
            List<ViewPoint> points
    ) {
        // Алиас для фронта: routePoints = points
        @JsonProperty("routePoints")
        public List<ViewPoint> routePoints() {
            return points;
        }
    }

    public record ViewPoint(
            Long id,
            Long locationId,
            String locationCode,
            String locationName,
            String locationType,
            Integer sortOrder,
            Boolean visited
    ) {}
}
