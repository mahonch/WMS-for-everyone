package com.example.demo.controller;

import com.example.demo.dto.doc.IssueDtos;
import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.entity.enums.IssueReason;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.*;
import com.example.demo.util.NumberGenerator;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueCrudController {

    private final IssueRepository issueRepository;
    private final IssueItemRepository issueItemRepository;
    private final ProductRepository productRepository;
    private final BatchRepository batchRepository;
    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;
    private final LocationRepository locationRepository;
    private final NumberGenerator numberGenerator;

    @GetMapping
    public Page<IssueDtos.View> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Если у пользователя назначен склад, фильтруем только по его складу
        if (userDetails != null) {
            Optional<User> currentUser = userRepository.findByUsername(userDetails.getUsername());
            if (currentUser.isPresent() && currentUser.get().getWarehouseId() != null) {
                Long userWarehouseId = currentUser.get().getWarehouseId();
                
                // Получаем все списания и фильтруем
                Page<Issue> issuesPage = issueRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()));
                
                // Фильтруем на уровне Java и маппим в View
                // Показываем если:
                // 1. targetWarehouse = склад пользователя (для TRANSFER_OUT - это склад назначения)
                // 2. createdBy.warehouseId = склад пользователя (для DAMAGE/SALE или TRANSFER_OUT - склад отправителя)
                List<IssueDtos.View> filtered = issuesPage.getContent().stream()
                    .filter(issue -> {
                        boolean matchesTargetWarehouse = issue.getTargetWarehouse() != null && 
                            issue.getTargetWarehouse().getId().equals(userWarehouseId);
                        
                        boolean matchesCreatedByWarehouse = issue.getCreatedBy() != null && 
                            issue.getCreatedBy().getWarehouseId() != null &&
                            issue.getCreatedBy().getWarehouseId().equals(userWarehouseId);
                        
                        // Показываем если совпадает ИЛИ targetWarehouse ИЛИ createdBy warehouse
                        return matchesTargetWarehouse || matchesCreatedByWarehouse;
                    })
                    .map(this::toView)
                    .toList();
                
                // Возвращаем отфильтрованную страницу
                return new org.springframework.data.domain.PageImpl<>(filtered, PageRequest.of(page, size, Sort.by("id").descending()), filtered.size());
            }
        }

        return issueRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(this::toView);
    }

    @GetMapping("/{id}")
    public IssueDtos.View get(@PathVariable Long id) {
        Issue doc = issueRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Issue not found"));
        return toView(doc);
    }

    @PostMapping
    @Transactional
    public IssueDtos.View create(
            @Valid @RequestBody IssueDtos.Create dto,
            @AuthenticationPrincipal UserDetails userDetails) {

        // Используем текущего пользователя как создателя
        User createdBy = null;
        if (userDetails != null) {
            createdBy = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
        }
        if (createdBy == null && dto.createdById() != null) {
            createdBy = userRepository.findById(dto.createdById())
                    .orElseThrow(() -> new NotFoundException("User not found"));
        }
        if (createdBy == null) {
            throw new NotFoundException("User not found");
        }

        String number = (dto.number() == null || dto.number().isBlank())
                ? numberGenerator.next("I")
                : dto.number();

        // Находим targetWarehouse и targetLocation до создания Issue
        Warehouse targetWarehouse = null;
        if (dto.targetWarehouseId() != null) {
            targetWarehouse = warehouseRepository.findById(dto.targetWarehouseId())
                    .orElseThrow(() -> new NotFoundException("Target warehouse not found: " + dto.targetWarehouseId()));
        }

        Location targetLocation = null;
        if (dto.targetLocationId() != null) {
            targetLocation = locationRepository.findById(dto.targetLocationId())
                    .orElseThrow(() -> new NotFoundException("Target location not found: " + dto.targetLocationId()));
        }

        // Устанавливаем reasonCode если передан (для TRANSFER_OUT и т.д.)
        IssueReason reasonCode = IssueReason.DAMAGE; // значение по умолчанию
        if (dto.reasonCode() != null && !dto.reasonCode().isBlank()) {
            try {
                reasonCode = IssueReason.valueOf(dto.reasonCode());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid reasonCode: " + dto.reasonCode());
            }
        }

        Issue doc = Issue.builder()
                .number(number)
                .createdBy(createdBy)
                .reason(dto.reason())
                .status(DocStatus.DRAFT)
                .reasonCode(reasonCode)
                .targetWarehouse(targetWarehouse)
                .targetLocation(targetLocation)
                .build();

        issueRepository.save(doc);

        if (dto.items() != null) {
            for (IssueDtos.ItemCreate ic : dto.items()) {

                Product p = productRepository.findById(ic.productId())
                        .orElseThrow(() -> new NotFoundException("Product not found: " + ic.productId()));

                Batch b = ic.batchId() == null ? null :
                        batchRepository.findById(ic.batchId())
                                .orElseThrow(() -> new NotFoundException("Batch not found: " + ic.batchId()));

                BigDecimal cost = b != null ? b.getBuyPrice() : BigDecimal.ZERO;

                Location loc = ic.locationId() != null ? locationRepository.findById(ic.locationId()).orElse(null) : null;

                IssueItem item = IssueItem.builder()
                        .issue(doc)
                        .product(p)
                        .batch(b)
                        .location(loc)
                        .qty(ic.qty())
                        .costPrice(cost)
                        .build();

                issueItemRepository.save(item);
                doc.getItems().add(item);
            }
        }

        return toView(doc);
    }

    @PostMapping("/{id}/items")
    @Transactional
    public IssueDtos.ViewItem addItem(@PathVariable Long id,
                                      @Valid @RequestBody IssueDtos.ItemCreate dto) {

        Issue doc = mustBeDraft(id);

        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + dto.productId()));

        Batch b = dto.batchId() == null ? null :
                batchRepository.findById(dto.batchId())
                        .orElseThrow(() -> new NotFoundException("Batch not found: " + dto.batchId()));

        BigDecimal cost = b != null ? b.getBuyPrice() : BigDecimal.ZERO;

        Location loc = dto.locationId() != null ? locationRepository.findById(dto.locationId()).orElse(null) : null;

        IssueItem item = IssueItem.builder()
                .issue(doc)
                .product(p)
                .batch(b)
                .location(loc)
                .qty(dto.qty())
                .costPrice(cost)
                .build();

        item = issueItemRepository.save(item);
        doc.getItems().add(item);

        return new IssueDtos.ViewItem(item.getId(), p.getId(),
                b != null ? b.getId() : null, item.getQty(), item.getCostPrice(),
                loc != null ? loc.getId() : null,
                loc != null ? loc.getCode() : null,
                loc != null ? loc.getName() : null);
    }

    @PutMapping("/{id}/items/{itemId}")
    @Transactional
    public IssueDtos.ViewItem updateItem(@PathVariable Long id,
                                         @PathVariable Long itemId,
                                         @Valid @RequestBody IssueDtos.ItemUpdate dto) {

        Issue doc = mustBeDraft(id);

        IssueItem item = issueItemRepository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("Issue item not found"));

        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + dto.productId()));

        Batch b = dto.batchId() == null ? null :
                batchRepository.findById(dto.batchId())
                        .orElseThrow(() -> new NotFoundException("Batch not found: " + dto.batchId()));

        BigDecimal cost = b != null ? b.getBuyPrice() : BigDecimal.ZERO;

        item.setProduct(p);
        item.setBatch(b);
        item.setQty(dto.qty());
        item.setCostPrice(cost);

        issueItemRepository.save(item);

        return new IssueDtos.ViewItem(item.getId(), p.getId(),
                b != null ? b.getId() : null, item.getQty(), item.getCostPrice(),
                item.getLocation() != null ? item.getLocation().getId() : null,
                item.getLocation() != null ? item.getLocation().getCode() : null,
                item.getLocation() != null ? item.getLocation().getName() : null);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @Transactional
    public void deleteItem(@PathVariable Long id, @PathVariable Long itemId) {
        mustBeDraft(id);
        issueItemRepository.deleteById(itemId);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteDraft(@PathVariable Long id) {
        Issue doc = mustBeDraft(id);

        for (var it : List.copyOf(doc.getItems())) {
            issueItemRepository.deleteById(it.getId());
        }

        issueRepository.deleteById(doc.getId());
    }

    private IssueDtos.View toView(Issue d) {

        List<IssueDtos.ViewItem> itemViews =
                d.getItems().stream().map(i -> new IssueDtos.ViewItem(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getBatch() != null ? i.getBatch().getId() : null,
                        i.getQty(),
                        i.getCostPrice(),
                        i.getLocation() != null ? i.getLocation().getId() : null,
                        i.getLocation() != null ? i.getLocation().getCode() : null,
                        i.getLocation() != null ? i.getLocation().getName() : null
                )).toList();

        return new IssueDtos.View(
                d.getId(),
                d.getNumber(),
                d.getStatus().name(),
                d.getCreatedBy() != null ? d.getCreatedBy().getId() : null,
                d.getCreatedBy() != null ? d.getCreatedBy().getUsername() : null,
                d.getCommittedBy() != null ? d.getCommittedBy().getId() : null,
                d.getCommittedBy() != null ? d.getCommittedBy().getUsername() : null,
                d.getCommittedAt(),
                d.getReason(),
                d.getReasonCode() != null ? d.getReasonCode().name() : null,
                d.getCreatedAt(),
                itemViews,
                d.getTargetWarehouse() != null ? d.getTargetWarehouse().getId() : null,
                d.getTargetWarehouse() != null ? d.getTargetWarehouse().getName() : null,
                d.getTargetLocation() != null ? d.getTargetLocation().getId() : null,
                d.getTargetLocation() != null ? d.getTargetLocation().getCode() : null
        );
    }

    private Issue mustBeDraft(Long id) {
        Issue d = issueRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Issue not found"));

        if (d.getStatus() != DocStatus.DRAFT)
            throw new IllegalStateException("Only DRAFT can be modified");

        return d;
    }
}
