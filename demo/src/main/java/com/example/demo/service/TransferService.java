package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.DocumentAlreadyCommittedException;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.TransferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TransferService {
    private final TransferRepository transferRepository;
    private final LocationRepository locationRepository;
    private final StockService stockService;
    private final AuditService auditService;

    @Transactional
    public void commit(Long transferId, User actor) {
        Transfer doc = transferRepository.findById(transferId)
                .orElseThrow(() -> new NotFoundException("Transfer not found: " + transferId));

        if (doc.getStatus() == DocStatus.COMMITTED)
            throw new DocumentAlreadyCommittedException("Transfer already committed");

        Location from = doc.getFromLocation();
        Location to   = locationRepository.findById(doc.getToLocation().getId())
                .orElseThrow(() -> new NotFoundException("Location not found: " + doc.getToLocation().getId()));

        var before = Transfer.builder()
                .id(doc.getId())
                .number(doc.getNumber())
                .status(doc.getStatus())
                .build();

        for (TransferItem it : doc.getItems()) {
            // списываем с from, кладём на to
            stockService.decrease(it.getProduct(), it.getBatch(), from, it.getQty());
            stockService.increase(it.getProduct(), it.getBatch(), to, it.getQty());
        }

        doc.setStatus(DocStatus.COMMITTED);
        transferRepository.save(doc);

        auditService.log(actor, "TRANSFER_COMMIT", "Transfer", doc.getId(), before, doc);
    }
}
