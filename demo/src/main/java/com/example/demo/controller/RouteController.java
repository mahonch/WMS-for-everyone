package com.example.demo.controller;

import com.example.demo.dto.worker.RouteDtos;
import com.example.demo.service.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    /**
     * Получить маршрут для задачи.
     */
    @GetMapping("/task/{taskId}")
    public ResponseEntity<RouteDtos.View> getRoute(@PathVariable Long taskId) {
        return ResponseEntity.ok(routeService.getRoute(taskId));
    }

    /**
     * Отметить точку маршрута как пройденную.
     */
    @PostMapping("/points/{pointId}/visit")
    public ResponseEntity<Void> markVisited(@PathVariable Long pointId) {
        routeService.markPointVisited(pointId);
        return ResponseEntity.ok().build();
    }
}
