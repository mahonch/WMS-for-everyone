package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.DocumentAlreadyCommittedException;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.BatchRepository;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.ReceiptItemRepository;
import com.example.demo.repository.ReceiptRepository;
import jakarta.persistence.Column;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

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
    private Instant createdAt;

    /**
     * Провести приёмку: создаёт партии по позициям (если не заданы) и кладёт товар на указанную локацию.
     * Операция идемпотентна: повторный вызов для уже проведённого документа завершится исключением.
     *
     * @param receiptId    документ к проведению (должен быть DRAFT)
     * @param toLocationId локация размещения
     * @param actor        пользователь (для аудита), может быть null на dev-этапе
     */
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public void commit(Long receiptId, Long toLocationId, User actor) {

        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new NotFoundException("Receipt not found: " + receiptId));

        em.lock(receipt, LockModeType.PESSIMISTIC_WRITE);

        if (receipt.getStatus() == DocStatus.COMMITTED) {
            throw new DocumentAlreadyCommittedException("Receipt already committed");
        }

        Location loc = locationRepository.findById(toLocationId)
                .orElseThrow(() -> new NotFoundException("Location not found: " + toLocationId));

        BigDecimal total = BigDecimal.ZERO;

        for (ReceiptItem it : receipt.getItems()) {

            Batch batch = it.getBatch();

            if (batch == null) {
                batch = Batch.builder()
                        .product(it.getProduct())
                        .supplier(receipt.getSupplier())
                        .buyPrice(it.getPrice())
                        .receivedAt(receipt.getCreatedAt())
                        .quantity(it.getQty())
                        .availableQty(it.getQty())
                        .build();

                batch = batchRepository.save(batch);

                // прикрепляем локацию
                batch.setLocation(loc);
                batchRepository.save(batch);

                it.setBatch(batch);
                receiptItemRepository.save(it);
            }

            // кладём товар
            stockService.increase(it.getProduct(), batch, loc, it.getQty());

            BigDecimal lineSum = it.getPrice().multiply(BigDecimal.valueOf(it.getQty()));
            total = total.add(lineSum);
        }

        var before = Receipt.builder()
                .id(receipt.getId())
                .number(receipt.getNumber())
                .status(receipt.getStatus())
                .totalSum(receipt.getTotalSum())
                .build();

        receipt.setTotalSum(total);
        receipt.setStatus(DocStatus.COMMITTED);
        receiptRepository.save(receipt);

        auditService.log(actor, "RECEIPT_COMMIT", "Receipt", receipt.getId(), before, receipt);
    }
}
