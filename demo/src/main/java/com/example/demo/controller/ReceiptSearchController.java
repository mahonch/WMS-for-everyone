package com.example.demo.controller;

import com.example.demo.dto.doc.ReceiptDtos;
import com.example.demo.dto.search.ReceiptSearchParams;
import com.example.demo.entity.Receipt;
import com.example.demo.entity.ReceiptItem;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.repository.ReceiptRepository;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/receipts/search")
@RequiredArgsConstructor
public class ReceiptSearchController {


    private final ReceiptRepository receiptRepository;

    @GetMapping("/search")
    public Page<ReceiptDtos.View> search(ReceiptSearchParams p) {
        Specification<Receipt> spec = Specification.allOf();

        if (p.number() != null && !p.number().isBlank()) {
            spec = spec.and((root, q, cb) -> cb.like(cb.lower(root.get("number")), "%" + p.number().toLowerCase() + "%"));
        }
        if (p.status() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("status"), p.status()));
        }
        if (p.supplierId() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("supplier").get("id"), p.supplierId()));
        }
        if (p.createdById() != null) {
            spec = spec.and((root, q, cb) -> cb.equal(root.get("createdBy").get("id"), p.createdById()));
        }
        if (p.dateFrom() != null || p.dateTo() != null) {
            spec = spec.and((root, q, cb) -> {
                var path = root.get("createdAt");
                if (p.dateFrom() != null && p.dateTo() != null)
                    return cb.between(root.<LocalDateTime>get("createdAt"), p.dateFrom(), p.dateTo());
                if (p.dateFrom() != null)
                    return cb.greaterThanOrEqualTo(root.<LocalDateTime>get("createdAt"), p.dateFrom());
                return cb.lessThanOrEqualTo(root.<LocalDateTime>get("createdAt"), p.dateTo());
            });
        }
        if (p.sku() != null && !p.sku().isBlank()) {
            spec = spec.and((root, q, cb) -> {
                // join items -> product -> sku; нужно distinct, чтобы не дублировать получателей
                var items = root.join("items", JoinType.INNER);
                var product = items.join("product", JoinType.INNER);
                q.distinct(true);
                return cb.equal(cb.lower(product.get("sku")), p.sku().toLowerCase());
            });
        }

        var pageable = PageRequest.of(p.pageOrDefault(), p.sizeOrDefault(), Sort.by(Sort.Direction.DESC, "id"));
        return receiptRepository.findAll(spec, pageable).map(this::toView);
    }

    private ReceiptDtos.View toView(Receipt r) {
        return new ReceiptDtos.View(
                r.getId(),
                r.getNumber(),
                r.getStatus().name(),

                r.getSupplier() != null ? r.getSupplier().getId() : null,

                r.getCreatedBy() != null ? r.getCreatedBy().getId() : null,
                r.getCreatedBy() != null ? r.getCreatedBy().getUsername() : null,

                r.getCreatedAt(),
                r.getTotalSum(),

                r.getItems().stream().map(i -> new ReceiptDtos.ViewItem(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getQty(),
                        i.getPrice(),
                        i.getBatch() != null ? i.getBatch().getId() : null
                )).toList()
        );
    }
}
