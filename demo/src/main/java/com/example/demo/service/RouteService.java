package com.example.demo.service;

import com.example.demo.dto.worker.RouteDtos;
import com.example.demo.entity.Location;
import com.example.demo.entity.Route;
import com.example.demo.entity.RoutePoint;
import com.example.demo.entity.Task;
import com.example.demo.entity.TaskItem;
import com.example.demo.entity.enums.TaskStatus;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.RoutePointRepository;
import com.example.demo.repository.RouteRepository;
import com.example.demo.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final RouteRepository routeRepository;
    private final RoutePointRepository routePointRepository;
    private final TaskRepository taskRepository;
    private final LocationRepository locationRepository;

    /**
     * Построить маршрут для задачи сборки.
     * Сортировка: по зоне (type) → по коду ячейки (возрастание).
     */
    @Transactional
    public Route buildRoute(Long taskId, Long warehouseId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        // Собираем уникальные локации из позиций задачи
        List<Location> locations = task.getItems().stream()
                .map(TaskItem::getLocation)
                .filter(l -> l != null)
                .distinct()
                .sorted(Comparator.comparing(Location::getCode))
                .toList();

        Route route = Route.builder()
                .task(task)
                .build();
        route = routeRepository.save(route);

        // Создаём точки маршрута
        List<RoutePoint> points = new ArrayList<>();
        for (int i = 0; i < locations.size(); i++) {
            Location loc = locations.get(i);
            RoutePoint point = RoutePoint.builder()
                    .route(route)
                    .location(loc)
                    .sortOrder(i)
                    .visited(false)
                    .build();
            point = routePointRepository.save(point);
            points.add(point);
        }

        route.setPoints(points);
        return routeRepository.save(route);
    }

    /**
     * Получить маршрут для задачи.
     */
    public RouteDtos.View getRoute(Long taskId) {
        Route route = routeRepository.findByTaskId(taskId)
                .orElseThrow(() -> new NotFoundException("Route not found for task"));
        return toView(route);
    }

    /**
     * Отметить точку маршрута как пройденную.
     */
    @Transactional
    public void markPointVisited(Long routePointId) {
        RoutePoint point = routePointRepository.findById(routePointId)
                .orElseThrow(() -> new NotFoundException("Route point not found"));
        point.setVisited(true);
        routePointRepository.save(point);
    }

    private RouteDtos.View toView(Route route) {
        return new RouteDtos.View(
                route.getId(),
                route.getTask().getId(),
                route.getCreatedAt(),
                route.getPoints().stream().map(this::toViewPoint).toList()
        );
    }

    private RouteDtos.ViewPoint toViewPoint(RoutePoint p) {
        return new RouteDtos.ViewPoint(
                p.getId(),
                p.getLocation().getId(),
                p.getLocation().getCode(),
                p.getLocation().getName(),
                p.getLocation().getType() != null ? p.getLocation().getType().name() : null,
                p.getSortOrder(),
                p.getVisited()
        );
    }
}
