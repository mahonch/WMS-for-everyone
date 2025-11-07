package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.DocumentAlreadyCommittedException;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.BatchRepository;
import com.example.demo.repository.IssueRepository;
import com.example.demo.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IssueService {
    private final IssueRepository issueRepository;
    private final LocationRepository locationRepository;
    private final BatchRepository batchRepository;
    private final StockService stockService;
    private final AuditService auditService;

    /**
     * Списать товары с указанной локации по строкам (партия обязана быть указана в строке).
     */
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

        for (IssueItem it : issue.getItems()) {
            Batch batch = (it.getBatch() != null)
                    ? batchRepository.findById(it.getBatch().getId())
                    .orElseThrow(() -> new NotFoundException("Batch not found: " + it.getBatch().getId()))
                    : null;

            if (batch == null) {
                throw new NotFoundException("IssueItem batch must be specified for product " + it.getProduct().getSku());
            }

            // уменьшаем остатки
            stockService.decrease(it.getProduct(), batch, loc, it.getQty());

            // фиксируем себестоимость от партии (для отчётов)
            it.setCostPrice(batch.getBuyPrice());
        }

        issue.setStatus(DocStatus.COMMITTED);
        issueRepository.save(issue);

        auditService.log(actor, "ISSUE_COMMIT", "Issue", issue.getId(), before, issue);
    }
}
