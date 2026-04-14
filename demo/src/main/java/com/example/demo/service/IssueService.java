package com.example.demo.service;

import com.example.demo.audit.AuditSnapshot;
import com.example.demo.dto.doc.IssueDtos;
import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.entity.enums.IssueReason;
import com.example.demo.exception.DocumentAlreadyCommittedException;
import com.example.demo.exception.NegativeStockException;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import com.example.demo.util.NumberGenerator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IssueService {

    private final IssueRepository issueRepository;
    private final IssueItemRepository issueItemRepository;
    private final LocationRepository locationRepository;
    private final WarehouseRepository warehouseRepository;
    private final BatchRepository batchRepository;
    private final StockRepository stockRepository;
    private final StockService stockService;
    private final AuditService auditService;
    private final ReceiptRepository receiptRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final NumberGenerator numberGenerator;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    /**
     * Создать черновик Issue.
     */
    @Transactional
    public IssueDtos.View create(IssueDtos.Create dto, Long actorId) {
        User actor = actorId != null ? userRepository.findById(actorId).orElse(null) : null;

        Issue issue = Issue.builder()
                .number(numberGenerator.next("ISS"))
                .status(DocStatus.DRAFT)
                .reasonCode(IssueReason.valueOf(dto.reasonCode() != null ? dto.reasonCode() : "SALE"))
                .reason(dto.reason())
                .createdBy(actor)
                .build();

        issue = issueRepository.save(issue);

        List<IssueItem> items = new ArrayList<>();
        for (IssueDtos.ItemCreate ic : dto.items()) {
            Product p = productRepository.findById(ic.productId())
                    .orElseThrow(() -> new NotFoundException("Product not found"));
            IssueItem ii = IssueItem.builder()
                    .issue(issue)
                    .product(p)
                    .qty(ic.qty())
                    .build();
            ii = issueItemRepository.save(ii);
            items.add(ii);
        }
        issue.setItems(items);

        return toView(issue);
    }

    private IssueDtos.View toView(Issue issue) {
        return new IssueDtos.View(
                issue.getId(),
                issue.getNumber(),
                issue.getStatus().name(),
                issue.getCreatedBy() != null ? issue.getCreatedBy().getId() : null,
                issue.getCreatedBy() != null ? issue.getCreatedBy().getUsername() : null,
                null, null, issue.getCommittedAt(),
                issue.getReason(), issue.getReasonCode().name(),
                issue.getCreatedAt(),
                issue.getItems().stream().map(i -> new IssueDtos.ViewItem(i.getId(), i.getProduct().getId(), i.getBatch() != null ? i.getBatch().getId() : null, i.getQty(), i.getCostPrice())).toList(),
                null, null,
                null, null
        );
    }

    @Transactional
    public void commit(Long issueId,
                       Long fromLocationId,
                       Long targetWarehouseId,
                       Long targetLocationId,
                       String reasonCode,
                       User actor) {

        System.out.println("=== ISSUE COMMIT START ===");
        System.out.println("Issue ID: " + issueId);
        System.out.println("From Location ID: " + fromLocationId);
        System.out.println("Target Warehouse ID: " + targetWarehouseId);
        System.out.println("Target Location ID: " + targetLocationId);
        System.out.println("Reason Code: " + reasonCode);

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new NotFoundException("Issue not found: " + issueId));

        if (issue.getStatus() == DocStatus.COMMITTED)
            throw new DocumentAlreadyCommittedException("Issue already committed");

        IssueReason reason = reasonCode != null
                ? IssueReason.valueOf(reasonCode)
                : IssueReason.DAMAGE;
        issue.setReasonCode(reason);

        System.out.println("Issue reasonCode set to: " + reason);

        Location loc = locationRepository.findById(fromLocationId)
                .orElseThrow(() -> new NotFoundException("Location not found: " + fromLocationId));

        Warehouse targetWarehouse = null;
        if (targetWarehouseId != null) {
            targetWarehouse = warehouseRepository.findById(targetWarehouseId)
                    .orElseThrow(() -> new NotFoundException("Warehouse not found: " + targetWarehouseId));
        }

        Location targetLocation = null;
        if (targetLocationId != null) {
            targetLocation = locationRepository.findById(targetLocationId)
                    .orElseThrow(() -> new NotFoundException("Location not found: " + targetLocationId));
            if (targetWarehouse != null && !targetLocation.getWarehouse().getId().equals(targetWarehouse.getId())) {
                throw new IllegalStateException("Target location belongs to another warehouse");
            }
            // если склад не указан, берем из локации
            if (targetWarehouse == null) {
                targetWarehouse = targetLocation.getWarehouse();
            }
        }

        if (reason == IssueReason.TRANSFER_OUT) {
            if (targetWarehouse == null && targetLocation == null) {
                throw new IllegalStateException("Target warehouse or location required for TRANSFER_OUT");
            }
            issue.setTargetWarehouse(targetWarehouse);
            issue.setTargetLocation(targetLocation);
        } else {
            // для DAMAGE/SALE не должно быть цели
            issue.setTargetWarehouse(null);
            issue.setTargetLocation(null);
        }

        // ---------- BEFORE SNAPSHOT ----------
        AuditSnapshot before = snapshot(issue);

        // список новых строк при разбиении по FIFO
        List<IssueItem> itemsToAppend = new ArrayList<>();

        // разбираем позиции
        for (Iterator<IssueItem> itIter = issue.getItems().iterator(); itIter.hasNext(); ) {
            IssueItem it = itIter.next();

            // Если партия известна → просто списываем
            if (it.getBatch() != null) {

                Batch batch = batchRepository.findById(it.getBatch().getId())
                        .orElseThrow(() -> new NotFoundException("Batch not found: " + it.getBatch().getId()));

                stockService.decrease(it.getProduct(), batch, loc, it.getQty());
                it.setCostPrice(batch.getBuyPrice());

                continue;
            }

            // -------- AUTO FIFO --------
            int need = it.getQty();
            var fifoStocks = stockRepository.findFifoStocks(it.getProduct(), loc);

            if (fifoStocks.isEmpty()) {
                throw new NegativeStockException("No stocks found for product " +
                        it.getProduct().getSku() + " at location " + loc.getCode());
            }

            boolean firstUsed = false;

            for (Stock s : fifoStocks) {
                if (need <= 0) break;

                int available = s.getQty();
                if (available <= 0) continue;

                int take = Math.min(available, need);

                stockService.decrease(it.getProduct(), s.getBatch(), loc, take);

                if (!firstUsed) {
                    it.setBatch(s.getBatch());
                    it.setQty(take);
                    it.setCostPrice(s.getBatch().getBuyPrice());
                    issueItemRepository.save(it);
                    firstUsed = true;
                } else {
                    IssueItem extra = IssueItem.builder()
                            .issue(issue)
                            .product(it.getProduct())
                            .batch(s.getBatch())
                            .qty(take)
                            .costPrice(s.getBatch().getBuyPrice())
                            .build();

                    itemsToAppend.add(extra);
                }

                need -= take;
            }

            if (need > 0) {
                throw new NegativeStockException("Not enough stocks for product " +
                        it.getProduct().getSku() + " at location " + loc.getCode());
            }
        }

        // добавляем новые строки
        if (!itemsToAppend.isEmpty()) {
            issue.getItems().addAll(itemsToAppend);
            issueItemRepository.saveAll(itemsToAppend);
        }

        System.out.println("=== CHECKING TRANSFER_OUT ===");
        System.out.println("Reason: " + reason);
        System.out.println("Target Location: " + targetLocation);
        System.out.println("Issue Items: " + issue.getItems().size());

        // Если TRANSFER_OUT и есть целевая локация — приходуем туда и создаём зеркало-приёмку
        if (reason == IssueReason.TRANSFER_OUT && targetLocation != null) {
            System.out.println("=== CREATING INBOUND RECEIPT ===");
            for (IssueItem it : issue.getItems()) {
                if (it.getBatch() == null) continue; // защита, но по логике уже заполнено
                stockService.increase(it.getProduct(), it.getBatch(), targetLocation, it.getQty());
            }
            createInboundReceiptForTransfer(issue, targetWarehouse, targetLocation, actor);
        } else {
            System.out.println("=== NOT CREATING RECEIPT (reason=" + reason + ", targetLocation=" + targetLocation + ")");
        }

        // ---------- COMMIT ----------
        issue.setStatus(DocStatus.COMMITTED);
        issue.setCommittedAt(LocalDateTime.now());
        issue.setCommittedBy(actor);
        issueRepository.save(issue);

        // ---------- AFTER SNAPSHOT ----------
        AuditSnapshot after = snapshot(issue);

        auditService.log(actor, "ISSUE_COMMIT", "Issue", issue.getId(), before, after);
    }


    // ---------------------------------------------
    // SNAPSHOT BUILDER — JSON SAFE
    // ---------------------------------------------
    private AuditSnapshot snapshot(Issue issue) {

        List<AuditSnapshot.Item> itemSnapshots = issue.getItems().stream()
                .map(it -> new AuditSnapshot.Item(
                        it.getId(),
                        it.getProduct().getId(),
                        it.getBatch() != null ? it.getBatch().getId() : null,
                        it.getQty(),
                        it.getCostPrice() != null ? it.getCostPrice().toPlainString() : "0"
                ))
                .toList();

        return new AuditSnapshot(
                issue.getId(),
                issue.getNumber(),
                issue.getStatus().name(),
                issue.getCreatedAt(),
                issue.getCreatedBy() != null ? issue.getCreatedBy().getUsername() : null,
                issue.getReasonCode() != null ? issue.getReasonCode().name() : null,
                itemSnapshots
        );
    }

    // ---------------------------------------------
    // CREATE INBOUND RECEIPT FOR TRANSFER
    // ---------------------------------------------
    @Transactional
    public void createInboundReceiptForTransfer(Issue issue, Warehouse targetWarehouse, Location targetLocation, User actor) {

        System.out.println("=== CREATE INBOUND RECEIPT FOR TRANSFER ===");
        System.out.println("Issue ID: " + issue.getId());
        System.out.println("Target Warehouse: " + (targetWarehouse != null ? targetWarehouse.getName() : "null"));
        System.out.println("Target Location: " + (targetLocation != null ? targetLocation.getCode() : "null"));
        System.out.println("Issue Items count: " + issue.getItems().size());

        // Склад-источник пока не определяем (требуется доработка модели Issue)
        Warehouse sourceWarehouse = null;

        Receipt receipt = Receipt.builder()
                .number(numberGenerator.next("RECEIPT"))
                .createdBy(actor)
                .warehouse(targetWarehouse)
                .fromWarehouse(sourceWarehouse)
                .docType("TRANSFER")
                .status(DocStatus.DRAFT)
                .totalSum(BigDecimal.ZERO)
                .build();

        receipt = receiptRepository.save(receipt);
        System.out.println("Receipt created with ID: " + receipt.getId());

        for (IssueItem it : issue.getItems()) {
            if (it.getBatch() == null) {
                System.out.println("Skipping item - batch is null");
                continue;
            }

            System.out.println("Creating receipt item: product=" + it.getProduct().getId() + 
                               ", qty=" + it.getQty() + 
                               ", price=" + it.getCostPrice());

            ReceiptItem receiptItem = ReceiptItem.builder()
                    .receipt(receipt)
                    .product(it.getProduct())
                    .batch(it.getBatch())
                    .qty(it.getQty())
                    .price(it.getCostPrice() != null ? it.getCostPrice() : BigDecimal.ZERO)
                    .location(targetLocation)
                    .build();

            receiptItem = receiptItemRepository.save(receiptItem);
            System.out.println("ReceiptItem created with ID: " + receiptItem.getId());
        }

        // Рассчитываем totalSum
        BigDecimal total = receipt.getItems().stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        receipt.setTotalSum(total);
        receiptRepository.save(receipt);
        System.out.println("Receipt totalSum updated: " + total);
        System.out.println("=== END CREATE INBOUND RECEIPT ===");
    }
}
