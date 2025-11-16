package com.example.demo.service;

import com.example.demo.audit.AuditSnapshot;
import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.DocumentAlreadyCommittedException;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.BatchRepository;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.ReceiptItemRepository;
import com.example.demo.repository.ReceiptRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReceiptService {

    private final ReceiptRepository receiptRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final BatchRepository batchRepository;
    private final LocationRepository locationRepository;
    private final StockService stockService;
    private final AuditService auditService;
    private final EntityManager em;

    // --------------------------------------------------------------------
    // SNAPSHOT BUILDER — JSON SAFE, no recursion
    // --------------------------------------------------------------------

    private AuditSnapshot snapshot(Receipt r) {

        List<AuditSnapshot.Item> items = r.getItems().stream()
                .map(i -> new AuditSnapshot.Item(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getBatch() != null ? i.getBatch().getId() : null,
                        i.getQty(),
                        i.getPrice().toPlainString()
                ))
                .toList();

        return new AuditSnapshot(
                r.getId(),
                r.getNumber(),
                r.getStatus().name(),
                r.getCreatedAt(),
                r.getCreatedBy() != null ? r.getCreatedBy().getUsername() : null,
                r.getSupplier() != null ? r.getSupplier().getName() : null,
                items
        );
    }

    // --------------------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------------------

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void commit(Long receiptId, Long toLocationId, User actor) {

        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new NotFoundException("Receipt not found: " + receiptId));

        em.lock(receipt, LockModeType.PESSIMISTIC_WRITE);

        if (receipt.getStatus() == DocStatus.COMMITTED)
            throw new DocumentAlreadyCommittedException("Receipt already committed");

        Location loc = locationRepository.findById(toLocationId)
                .orElseThrow(() -> new NotFoundException("Location not found: " + toLocationId));

        // BEFORE snapshot
        AuditSnapshot before = snapshot(receipt);

        BigDecimal total = BigDecimal.ZERO;

        for (ReceiptItem it : receipt.getItems()) {

            Batch batch = it.getBatch();

            // ---------------- CREATE NEW BATCH IF MISSING ----------------
            if (batch == null) {
                batch = Batch.builder()
                        .product(it.getProduct())
                        .supplier(receipt.getSupplier())
                        .buyPrice(it.getPrice())
                        .receivedAt(receipt.getCreatedAt())
                        .quantity(it.getQty())
                        .availableQty(it.getQty())
                        .location(loc)
                        .build();

                batch = batchRepository.save(batch);

                it.setBatch(batch);
                receiptItemRepository.save(it);
            }

            // ---------------- PUT TO STOCK ----------------
            stockService.increase(it.getProduct(), batch, loc, it.getQty());

            total = total.add(
                    it.getPrice().multiply(BigDecimal.valueOf(it.getQty()))
            );
        }

        receipt.setTotalSum(total);
        receipt.setStatus(DocStatus.COMMITTED);

        receiptRepository.save(receipt);

        // AFTER snapshot
        AuditSnapshot after = snapshot(receipt);

        auditService.log(actor, "RECEIPT_COMMIT", "Receipt", receipt.getId(), before, after);
    }
}
