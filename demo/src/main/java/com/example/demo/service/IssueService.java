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

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IssueService {

    private final IssueRepository issueRepository;
    private final IssueItemRepository issueItemRepository;
    private final LocationRepository locationRepository;
    private final BatchRepository batchRepository;
    private final StockRepository stockRepository;
    private final StockService stockService;
    private final AuditService auditService;

    @Transactional
    public void commit(Long issueId, Long fromLocationId, User actor) {

        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new NotFoundException("Issue not found: " + issueId));

        if (issue.getStatus() == DocStatus.COMMITTED)
            throw new DocumentAlreadyCommittedException("Issue already committed");

        Location loc = locationRepository.findById(fromLocationId)
                .orElseThrow(() -> new NotFoundException("Location not found: " + fromLocationId));

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

        // ---------- COMMIT ----------
        issue.setStatus(DocStatus.COMMITTED);
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
                issue.getReason(),
                itemSnapshots
        );
    }
}
