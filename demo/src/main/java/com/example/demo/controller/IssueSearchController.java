package com.example.demo.controller;

import com.example.demo.dto.doc.IssueDtos;
import com.example.demo.dto.search.IssueSearchParams;
import com.example.demo.entity.Issue;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.*;

import jakarta.persistence.criteria.JoinType;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueSearchController {

    private final com.example.demo.repository.IssueRepository issueRepository;

    @GetMapping("/search")
    public Page<IssueDtos.View> search(IssueSearchParams p) {
        Specification<Issue> spec = Specification.allOf();

        if (p.number() != null && !p.number().isBlank()) {
            spec = spec.and((root, q, cb) -> cb.like(cb.lower(root.get("number")), "%" + p.number().toLowerCase() + "%"));
        }
        if (p.status() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), p.status()));
        }
        if (p.createdById() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("createdBy").get("id"), p.createdById()));
        }
        if (p.reason() != null && !p.reason().isBlank()) {
            spec = spec.and((root, q, cb) -> cb.like(cb.lower(root.get("reason")), "%" + p.reason().toLowerCase() + "%"));
        }
        if (p.dateFrom() != null || p.dateTo() != null) {
            spec = spec.and((root, q, cb) -> {
                var path = root.get("createdAt");
                if (p.dateFrom() != null && p.dateTo() != null) return cb.between(root.<LocalDateTime>get("createdAt"), p.dateFrom(), p.dateTo());
                ;
                if (p.dateFrom() != null) return cb.greaterThanOrEqualTo(root.<LocalDateTime>get("createdAt"), p.dateFrom());
                return cb.lessThanOrEqualTo(root.<LocalDateTime>get("createdAt"), p.dateTo());
            });
        }
        if (p.sku() != null && !p.sku().isBlank()) {
            spec = spec.and((root, q, cb) -> {
                var items = root.join("items", JoinType.INNER);
                var product = items.join("product", JoinType.INNER);
                q.distinct(true);
                return cb.equal(cb.lower(product.get("sku")), p.sku().toLowerCase());
            });
        }

        var pageable = PageRequest.of(p.pageOrDefault(), p.sizeOrDefault(), Sort.by(Sort.Direction.DESC, "id"));
        return issueRepository.findAll(spec, pageable).map(this::toView);
    }

    private IssueDtos.View toView(Issue d) {
        return new IssueDtos.View(
                d.getId(), d.getNumber(), d.getStatus().name(),
                d.getCreatedBy() != null ? d.getCreatedBy().getId() : null,
                d.getReason(), d.getCreatedAt(),
                d.getItems().stream().map(i -> new IssueDtos.ViewItem(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getBatch() != null ? i.getBatch().getId() : null,
                        i.getQty(),
                        i.getCostPrice()
                )).toList()
        );
    }
}
