package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.DocumentAlreadyCommittedException;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class ReceiptService {
    private final ReceiptRepository receiptRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final BatchRepository batchRepository;
    private final LocationRepository locationRepository;
    private final StockService stockService;
    private final AuditService auditService;

    /**
     * Провести приёмку: создаёт партии по позициям и кладёт товар на указанную локацию.
     * @param receiptId документ к проведению (должен быть DRAFT)
     * @param toLocationId локация размещения
     * @param actor пользователь, выполняющий действие
     */
    @Transactional
    public void commit(Long receiptId, Long toLocationId, User actor) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new NotFoundException("Receipt not found: " + receiptId));
        if (receipt.getStatus() == DocStatus.COMMITTED)
            throw new DocumentAlreadyCommittedException("Receipt already committed");

        Location loc = locationRepository.findById(toLocationId)
                .orElseThrow(() -> new NotFoundException("Location not found: " + toLocationId));

        BigDecimal total = BigDecimal.ZERO;

        for (ReceiptItem it : receipt.getItems()) {
            // создаём партию под позицию
            Batch batch = Batch.builder()
                    .product(it.getProduct())
                    .supplier(receipt.getSupplier())
                    .buyPrice(it.getPrice())
                    .quantity(it.getQty())
                    .availableQty(0) // увеличим через stockService.increase
                    .build();
            batch = batchRepository.save(batch);

            // привязываем партию к строке
            it.setBatch(batch);
            receiptItemRepository.save(it);

            // кладём на склад (увеличиваем stock и availableQty)
            stockService.increase(it.getProduct(), batch, loc, it.getQty());

            // считаем сумму
            total = total.add(it.getPrice().multiply(BigDecimal.valueOf(it.getQty())));
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
