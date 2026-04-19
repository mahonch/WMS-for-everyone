package com.example.demo.controller;

import com.example.demo.dto.doc.IssueDtos;
import com.example.demo.dto.worker.TaskDtos;
import com.example.demo.entity.*;
import com.example.demo.entity.enums.IssueReason;
import com.example.demo.repository.*;
import com.example.demo.service.IssueService;
import com.example.demo.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final IssueService issueService;
    private final TaskService taskService;
    private final ProductRepository productRepository;
    private final LocationRepository locationRepository;
    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;

    /**
     * Сгенерировать тестовый заказ (Issue) и сразу создать задачу сборки.
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateTestOrder(@AuthenticationPrincipal UserDetails userDetails) {
        Long actorId = null;
        try {
            // 1) Определяем склад: сначала склад пользователя, потом первый, иначе создаём тестовый
            Warehouse warehouse = null;
            if (userDetails != null) {
                var userOpt = userRepository.findByUsername(userDetails.getUsername());
                if (userOpt.isPresent()) {
                    var u = userOpt.get();
                    actorId = u.getId();
                    if (u.getWarehouseId() != null) {
                        warehouse = warehouseRepository.findById(u.getWarehouseId())
                                .orElse(null);
                    }
                }
            }
            if (warehouse == null) {
                warehouse = warehouseRepository.findAll().stream().findFirst().orElse(null);
            }
            if (warehouse == null) {
                warehouse = warehouseRepository.save(
                        Warehouse.builder().name("Test WH").code("TEST-WH").address("—").isActive(true).build()
                );
                // если пользователь без склада — привяжем его к тестовому, чтобы увидел задачу
                if (userDetails != null) {
                    var u = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
                    if (u != null) {
                        u.setWarehouseId(warehouse.getId());
                        userRepository.save(u);
                    }
                }
            }

            // 2) Локация
            final Long whIdForFilter = warehouse.getId();
            Location location = locationRepository.findAll().stream()
                    .filter(l -> l.getWarehouse().getId().equals(whIdForFilter))
                    .findFirst()
                    .orElse(null);
            if (location == null) {
                location = locationRepository.save(
                        Location.builder()
                                .warehouse(warehouse)
                                .code("PICK-1")
                                .name("Зона сборки")
                                .type(com.example.demo.entity.enums.LocationType.PICKING)
                                .build()
                );
            }

            // 3) Продукты
            List<Product> products = productRepository.findAll();
            if (products.isEmpty()) {
                String sku = "TEST-" + System.currentTimeMillis();
                Product p = Product.builder()
                        .sku(sku)
                        .name("Тестовый товар")
                        .barcode(sku)
                        .unit("pcs")
                        .minStock(0)
                        .costPrice(java.math.BigDecimal.ONE)
                        .isActive(true)
                        .build();
                productRepository.save(p);
                products = List.of(p);
            }

            Random rand = new Random();
            int count = Math.min(5, products.size());
            List<IssueDtos.ItemCreate> items = new ArrayList<>();

            products.sort((a, b) -> rand.nextInt() - rand.nextInt());
            
            for (int i = 0; i < count; i++) {
                Product p = products.get(i);
                Location loc = location;
                
                items.add(new IssueDtos.ItemCreate(
                        p.getId(),
                        null, // batchId
                        rand.nextInt(3) + 1,
                        loc != null ? loc.getId() : null
                ));
            }

            // IssueDtos.Create: (createdById, number, reason, reasonCode, items, targetWarehouseId, targetLocationId)
            IssueDtos.Create dto = new IssueDtos.Create(
                    null, // createdById
                    null, // number (auto)
                    "Тестовый заказ",
                    IssueReason.SALE.name(),
                    items,
                    null,
                    null
            );

            // Создаем Issue через сервис
            var createdIssue = issueService.create(dto, actorId);
            
            // Автоматически создаем задачу сборки для этого заказа
            taskService.createTaskFromIssue(createdIssue.id(), warehouse.getId());
            
            return ResponseEntity.ok(createdIssue);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Ошибка генерации: " + e.getMessage());
        }
    }
}
