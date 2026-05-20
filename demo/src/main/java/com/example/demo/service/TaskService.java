package com.example.demo.service;

import com.example.demo.dto.worker.TaskDtos;
import com.example.demo.entity.*;
import com.example.demo.entity.enums.TaskStatus;
import com.example.demo.entity.enums.TaskType;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.*;
import com.example.demo.util.NumberGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final TaskItemRepository taskItemRepository;
    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;
    private final ReceiptRepository receiptRepository;
    private final IssueRepository issueRepository;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;
    private final RouteRepository routeRepository;
    private final NumberGenerator numberGenerator;
    private final RouteService routeService;

    /**
     * Создать задачу приёмки автоматически при подписании Receipt.
     */
    @Transactional
    public Task createTaskFromReceipt(Long receiptId, Long warehouseId) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new NotFoundException("Receipt not found"));

        String number = numberGenerator.next("TASK-R");

        Task task = Task.builder()
                .number(number)
                .type(TaskType.RECEIPT)
                .status(TaskStatus.PENDING)
                .warehouse(receipt.getWarehouse())
                .createdBy(receipt.getCreatedBy())
                .relatedReceipt(receipt)
                .build();

        task = taskRepository.save(task);

        // Создаём позиции задачи из позиций приёмки
        List<TaskItem> items = new ArrayList<>();
        for (ReceiptItem ri : receipt.getItems()) {
            TaskItem ti = TaskItem.builder()
                    .task(task)
                    .product(ri.getProduct())
                    .location(ri.getLocation())
                    .qtyPlanned(ri.getQty())
                    .qtyActual(0)
                    .confirmed(false)
                    .sortOrder(items.size())
                    .build();
            ti = taskItemRepository.save(ti);
            items.add(ti);
        }

        task.setItems(items);
        return taskRepository.save(task);
    }

    /**
     * Создать задачу сборки автоматически при создании Issue.
     */
    @Transactional
    public Task createTaskFromIssue(Long issueId, Long warehouseId) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new NotFoundException("Issue not found"));

        // Принудительно инициализируем location для каждой позиции
        for (IssueItem ii : issue.getItems()) {
            Location loc = ii.getLocation();
            if (loc != null) {
                loc.getCode(); // trigger lazy load
                loc.getName();
            }
            ii.getProduct().getName();
        }

        String number = numberGenerator.next("TASK-P");

        Warehouse wh = warehouseId != null
                ? warehouseRepository.findById(warehouseId).orElse(issue.getTargetWarehouse())
                : issue.getTargetWarehouse();

        if (wh == null) throw new NotFoundException("Warehouse not found");

        Task task = Task.builder()
                .number(number)
                .type(TaskType.PICKING)
                .status(TaskStatus.PENDING)
                .warehouse(wh)
                .createdBy(issue.getCreatedBy())
                .relatedIssue(issue)
                .build();

        task = taskRepository.save(task);

        // Создаём позиции задачи из позиций Issue
        List<TaskItem> items = new ArrayList<>();
        for (IssueItem ii : issue.getItems()) {
            TaskItem ti = TaskItem.builder()
                    .task(task)
                    .product(ii.getProduct())
                    .location(ii.getLocation()) // берём локацию из IssueItem
                    .qtyPlanned(ii.getQty())
                    .qtyActual(0)
                    .confirmed(false)
                    .sortOrder(items.size())
                    .build();
            ti = taskItemRepository.save(ti);
            items.add(ti);
        }

        task.setItems(items);

        // Строим маршрут для сборки
        Route route = routeService.buildRoute(task.getId(), wh.getId());
        task.setRoute(route);

        return taskRepository.save(task);
    }

    /**
     * Взять задачу (назначить себя).
     */
    @Transactional
    public TaskDtos.View assignTask(Long taskId, Long userId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (task.getStatus() != TaskStatus.PENDING) {
            throw new IllegalStateException("Task is not available");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        // проверяем соответствие склада
        if (user.getWarehouseId() != null && task.getWarehouse() != null) {
            if (!task.getWarehouse().getId().equals(user.getWarehouseId())) {
                throw new IllegalStateException("Task belongs to another warehouse");
            }
        }

        task.setAssignee(user);
        task.setStatus(TaskStatus.ASSIGNED);
        task.setAssignedAt(LocalDateTime.now());
        task = taskRepository.save(task);

        return toView(task);
    }

    /**
     * Начать выполнение задачи.
     */
    @Transactional
    public TaskDtos.View startTask(Long taskId) {
        Task task = mustBeAssigned(taskId);
        task.setStatus(TaskStatus.IN_PROGRESS);
        task.setStartedAt(LocalDateTime.now());
        task = taskRepository.save(task);
        return toView(task);
    }

    /**
     * Завершить задачу.
     */
    @Transactional
    public TaskDtos.View completeTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (task.getStatus() == TaskStatus.PENDING || task.getStatus() == TaskStatus.ASSIGNED) {
            task.setStatus(TaskStatus.IN_PROGRESS);
            if (task.getStartedAt() == null) {
                task.setStartedAt(LocalDateTime.now());
            }
        }

        if (task.getStatus() != TaskStatus.IN_PROGRESS) {
            throw new IllegalStateException("Task is not in progress");
        }

        // Проверяем что все позиции подтверждены
        long unconfirmed = taskItemRepository.countByTaskIdAndConfirmed(taskId, false);
        if (unconfirmed > 0) {
            throw new IllegalStateException("Не все позиции подтверждены: " + unconfirmed);
        }

        // Для сборки дополнительно требуем подтверждение ячейки отгрузки
        if (task.getType() == TaskType.PICKING
                && task.getShipmentLocation() != null
                && Boolean.FALSE.equals(task.getShipmentConfirmed())) {
            throw new IllegalStateException("Не подтверждена ячейка отгрузки");
        }

        task.setStatus(TaskStatus.COMPLETED);
        task.setCompletedAt(LocalDateTime.now());
        task = taskRepository.save(task);

        // Обновляем статистику смены
        if (task.getAssignee() != null) {
            // Увеличиваем tasks_completed в активной смене
            // Это делается в WorkerService
        }

        return toView(task);
    }

    /**
     * Подтвердить позицию задачи (сканирование товара/ячейки).
     */
    @Transactional
    public TaskDtos.ViewItem confirmItem(Long taskItemId, Integer qtyActual) {
        TaskItem item = taskItemRepository.findById(taskItemId)
                .orElseThrow(() -> new NotFoundException("Task item not found"));

        item.setQtyActual(qtyActual != null ? qtyActual : item.getQtyPlanned());
        item.setConfirmed(true);
        item = taskItemRepository.save(item);

        return toViewItem(item);
    }

    /**
     * Подтвердить ячейку отгрузки для задачи сборки.
     */
    @Transactional
    public TaskDtos.View confirmShipmentLocation(Long taskId, Long locationId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));

        if (task.getType() != TaskType.PICKING) {
            throw new IllegalStateException("Shipment location allowed only for picking tasks");
        }
        if (task.getStatus() == TaskStatus.COMPLETED) {
            throw new IllegalStateException("Task already completed");
        }

        Location loc = locationRepository.findById(locationId)
                .orElseThrow(() -> new NotFoundException("Location not found"));

        // Если маршрут существует — проверяем, что ячейка есть в маршруте
        if (task.getRoute() != null && task.getRoute().getPoints() != null && !task.getRoute().getPoints().isEmpty()) {
            boolean existsInRoute = task.getRoute().getPoints().stream()
                    .anyMatch(p -> p.getLocation().getId().equals(locationId));
            if (!existsInRoute) {
                throw new IllegalStateException("Ячейка не входит в маршрут задачи");
            }
        }

        task.setShipmentLocation(loc);
        task.setShipmentConfirmed(true);
        task = taskRepository.save(task);
        return toView(task);
    }

    /**
     * Список доступных задач по типу.
     */
    public Page<TaskDtos.View> getAvailableTasks(TaskType type, Pageable pageable, Long userId) {
        if (userId == null) {
            throw new IllegalStateException("User not found");
        }
        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));
        Long whId = user.getWarehouseId();
        if (whId == null) {
            throw new IllegalStateException("User warehouse is not set");
        }

        if (type == null) {
            return taskRepository.findAvailableByWarehouse(TaskStatus.PENDING, whId, pageable)
                    .map(this::toView);
        }
        return taskRepository.findAvailableByTypeAndWarehouse(type, TaskStatus.PENDING, whId, pageable)
                .map(this::toView);
    }

    /**
     * Задачи конкретного работника.
     */
    public Page<TaskDtos.View> getMyTasks(Long userId, Pageable pageable) {
        return taskRepository.findByAssigneeIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toView);
    }

    /**
     * Детальная задача.
     */
    @Transactional
    public TaskDtos.View getTask(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        fillMissingReceiptLocations(task);
        return toView(task);
    }

    private void fillMissingReceiptLocations(Task task) {
        if (task.getType() != TaskType.RECEIPT || task.getRelatedReceipt() == null || task.getItems() == null) {
            return;
        }

        List<ReceiptItem> receiptItems = task.getRelatedReceipt().getItems();
        for (TaskItem taskItem : task.getItems()) {
            if (taskItem.getLocation() != null || taskItem.getSortOrder() == null) {
                continue;
            }
            if (taskItem.getSortOrder() >= 0 && taskItem.getSortOrder() < receiptItems.size()) {
                ReceiptItem receiptItem = receiptItems.get(taskItem.getSortOrder());
                if (receiptItem.getLocation() != null
                        && receiptItem.getProduct().getId().equals(taskItem.getProduct().getId())) {
                    taskItem.setLocation(receiptItem.getLocation());
                    taskItemRepository.save(taskItem);
                }
            }
        }
    }

    private Task mustBeAssigned(Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new NotFoundException("Task not found"));
        if (task.getStatus() != TaskStatus.ASSIGNED) {
            throw new IllegalStateException("Task must be assigned first");
        }
        return task;
    }

    private TaskDtos.View toView(Task t) {
        return new TaskDtos.View(
                t.getId(),
                t.getNumber(),
                t.getType().name(),
                t.getStatus().name(),
                t.getWarehouse().getId(),
                t.getWarehouse().getName(),
                t.getAssignee() != null ? t.getAssignee().getId() : null,
                t.getAssignee() != null ? t.getAssignee().getUsername() : null,
                t.getCreatedBy().getId(),
                t.getCreatedBy().getUsername(),
                t.getRelatedReceipt() != null ? t.getRelatedReceipt().getId() : null,
                t.getRelatedIssue() != null ? t.getRelatedIssue().getId() : null,
                t.getRoute() != null ? t.getRoute().getId() : null,
                t.getShipmentLocation() != null ? t.getShipmentLocation().getId() : null,
                t.getShipmentLocation() != null ? t.getShipmentLocation().getCode() : null,
                t.getShipmentConfirmed(),
                t.getNotes(),
                t.getCreatedAt(),
                t.getAssignedAt(),
                t.getStartedAt(),
                t.getCompletedAt(),
                t.getItems().stream().map(this::toViewItem).toList()
        );
    }

    private TaskDtos.ViewItem toViewItem(TaskItem ti) {
        return new TaskDtos.ViewItem(
                ti.getId(),
                ti.getProduct().getId(),
                ti.getProduct().getName(),
                ti.getProduct().getSku(),
                ti.getLocation() != null ? ti.getLocation().getId() : null,
                ti.getLocation() != null ? ti.getLocation().getCode() : null,
                ti.getLocation() != null ? ti.getLocation().getName() : null,
                ti.getQtyPlanned(),
                ti.getQtyActual(),
                ti.getConfirmed(),
                ti.getSortOrder()
        );
    }
}
