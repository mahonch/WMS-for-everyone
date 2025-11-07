package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.DocumentAlreadyCommittedException;
import com.example.demo.exception.NegativeStockException;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.BatchRepository;
import com.example.demo.repository.IssueItemRepository;
import com.example.demo.repository.IssueRepository;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.StockRepository;
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

        var before = Issue.builder()
                .id(issue.getId())
                .number(issue.getNumber())
                .status(issue.getStatus())
                .build();

        // Собираем новые позиции, которые появятся при разбиении строк по партиям
        List<IssueItem> itemsToAppend = new ArrayList<>();

        // Идём по исходным строкам
        for (Iterator<IssueItem> itIter = issue.getItems().iterator(); itIter.hasNext(); ) {
            IssueItem it = itIter.next();

            // Если партия указана — списываем как раньше
            if (it.getBatch() != null) {
                Batch batch = batchRepository.findById(it.getBatch().getId())
                        .orElseThrow(() -> new NotFoundException("Batch not found: " + it.getBatch().getId()));
                stockService.decrease(it.getProduct(), batch, loc, it.getQty());
                it.setCostPrice(batch.getBuyPrice());
                continue;
            }

            // === Автоподбор FIFO по партиям в этой локации ===
            int need = it.getQty();
            var fifoStocks = stockRepository.findFifoStocks(it.getProduct(), loc);

            if (fifoStocks.isEmpty()) {
                throw new NegativeStockException("Нет доступных партий для продукта " + it.getProduct().getSku()
                        + " на локации " + loc.getCode());
            }

            // будем заполнять текущую строку первой найденной партией,
            // остаток (если нужен) разнесём в новые строки
            boolean firstAllocationDone = false;

            for (Stock s : fifoStocks) {
                if (need <= 0) break;

                int available = s.getQty();
                if (available <= 0) continue;

                int take = Math.min(available, need);

                // списываем со склада + уменьшаем availableQty партии (внутри StockService)
                stockService.decrease(it.getProduct(), s.getBatch(), loc, take);

                if (!firstAllocationDone) {
                    // текущую строку "привяжем" к первой партии и установим списанное количество
                    it.setBatch(s.getBatch());
                    it.setQty(take);
                    it.setCostPrice(s.getBatch().getBuyPrice());
                    issueItemRepository.save(it);
                    firstAllocationDone = true;
                } else {
                    // добавляем новую строку под следующую партию
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
                // В сумме по FIFO-партиям не хватило количества — откатываемся исключением
                throw new NegativeStockException("Недостаточно остатков для продукта "
                        + it.getProduct().getSku() + " на локации " + loc.getCode());
            }
        }

        // Присоединяем добавленные строки (если были разбиения)
        if (!itemsToAppend.isEmpty()) {
            issue.getItems().addAll(itemsToAppend);
            issueItemRepository.saveAll(itemsToAppend);
        }

        issue.setStatus(DocStatus.COMMITTED);
        issueRepository.save(issue);

        auditService.log(actor, "ISSUE_COMMIT", "Issue", issue.getId(), before, issue);
    }
}
