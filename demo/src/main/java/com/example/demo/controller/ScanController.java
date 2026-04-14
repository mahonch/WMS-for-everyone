package com.example.demo.controller;

import com.example.demo.entity.TaskItem;
import com.example.demo.repository.BatchRepository;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.TaskItemRepository;
import com.example.demo.service.TaskService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Data class ScanRequest { String data; }   // строка из QR
@Data class ScanResponse {
    String type; Long id;
    String productName; Integer availableQty; String locationCode; String expiryDate;
}

@Data class TaskScanRequest {
    Long taskId;
    Long itemId;
    String scannedId;     // ID отсканированного товара/ячейки
    String scannedType;   // "product" или "location"
    Integer qty;          // подтверждённое кол-во (опционально)
}

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
public class ScanController {
    private final BatchRepository batchRepo;
    private final ProductRepository productRepo;
    private final LocationRepository locationRepo;
    private final TaskItemRepository taskItemRepo;
    private final TaskService taskService;
    private final ObjectMapper om;

    @PostMapping
    public ScanResponse scan(@RequestBody ScanRequest req) throws Exception {
        var node = om.readTree(req.getData());
        var type = node.get("t").asText();
        var id = node.get("id").asLong();

        var resp = new ScanResponse(); resp.setType(type); resp.setId(id);

        switch (type) {
            case "batch" -> {
                var b = batchRepo.findById(id).orElseThrow();
                resp.setProductName(b.getProduct().getName());
                resp.setAvailableQty(b.getAvailableQty());
            }
            case "product" -> {
                var p = productRepo.findById(id).orElseThrow();
                resp.setProductName(p.getName());
            }
            case "loc" -> {
                var l = locationRepo.findById(id).orElseThrow();
                resp.setLocationCode(l.getCode());
            }
            default -> throw new IllegalArgumentException("Unknown QR type: "+type);
        }
        return resp;
    }

    /**
     * Сканирование в контексте задачи (приёмка/сборка).
     */
    @PostMapping("/task-item")
    public ResponseEntity<?> scanTaskItem(@RequestBody TaskScanRequest req) {
        TaskItem item = taskItemRepo.findById(req.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Task item not found"));

        if ("product".equals(req.scannedType)) {
            Long scannedProductId = Long.parseLong(req.scannedId);
            if (!item.getProduct().getId().equals(scannedProductId)) {
                return ResponseEntity.badRequest().body("Неверный товар. Ожидался: " + item.getProduct().getName());
            }
        }

        var confirmed = taskService.confirmItem(item.getId(), req.getQty());
        return ResponseEntity.ok(confirmed);
    }

    /**
     * Сканирование локации в контексте задачи.
     */
    @PostMapping("/location")
    public ResponseEntity<?> scanLocation(@RequestBody TaskScanRequest req) {
        TaskItem item = taskItemRepo.findById(req.getItemId())
                .orElseThrow(() -> new IllegalArgumentException("Task item not found"));

        Long scannedLocationId = Long.parseLong(req.scannedId);
        if (item.getLocation() == null || !item.getLocation().getId().equals(scannedLocationId)) {
            return ResponseEntity.badRequest().body("Неверная ячейка. Ожидалась: " +
                (item.getLocation() != null ? item.getLocation().getCode() : "не указана"));
        }

        var confirmed = taskService.confirmItem(item.getId(), req.getQty());
        return ResponseEntity.ok(confirmed);
    }
}


