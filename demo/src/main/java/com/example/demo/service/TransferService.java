package com.example.demo.service;

import com.example.demo.audit.AuditSnapshot;
import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.DocumentAlreadyCommittedException;
import com.example.demo.exception.NegativeStockException;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final TransferRepository transferRepository;
    private final TransferItemRepository transferItemRepository;
    private final BatchRepository batchRepository;
    private final StockRepository stockRepository;
    private final LocationRepository locationRepository;
    private final StockService stockService;
    private final AuditService auditService;

    private AuditSnapshot snapshot(Transfer t) {
        return new AuditSnapshot(
                t.getId(),
                t.getNumber(),
                t.getStatus().name(),
                t.getCreatedAt(),
                t.getCreatedBy() != null ? t.getCreatedBy().getUsername() : null,
                null, // reason — у Transfer нет reason
                t.getItems().stream()
                        .map(i -> new AuditSnapshot.Item(
                                i.getId(),
                                i.getProduct() != null ? i.getProduct().getId() : null,
                                i.getBatch() != null ? i.getBatch().getId() : null,
                                i.getQty(),
                                null     // << transfer НЕ имеет costPrice
                        ))
                        .toList()
        );
    }




    @Transactional
    public void commit(Long id, User actor) {

        Transfer t = transferRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Transfer not found"));

        if (t.getStatus() == DocStatus.COMMITTED)
            throw new DocumentAlreadyCommittedException("Already committed");

        var before = snapshot(t);

        Location from = t.getFromLocation();
        Location to = t.getToLocation();

        for (TransferItem it : t.getItems()) {

            // списываем со старой локации
            stockService.decrease(it.getProduct(), it.getBatch(), from, it.getQty());

            // добавляем на новую
            stockService.increase(it.getProduct(), it.getBatch(), to, it.getQty());
        }

        t.setStatus(DocStatus.COMMITTED);
        transferRepository.save(t);

        auditService.log(actor, "TRANSFER_COMMIT", "Transfer", t.getId(), before, snapshot(t));
    }
}
