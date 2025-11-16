package com.example.demo.controller;

import com.example.demo.dto.doc.ReceiptDtos;
import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.*;
import com.example.demo.util.NumberGenerator;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
public class ReceiptCrudController {

    private final ReceiptRepository receiptRepository;
    private final ReceiptItemRepository receiptItemRepository;
    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final NumberGenerator numberGenerator;

    // ----- LIST & GET
    @GetMapping
    public Page<ReceiptDtos.View> list(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return receiptRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(this::toView);
    }

    @GetMapping("/{id}")
    public ReceiptDtos.View get(@PathVariable Long id) {
        Receipt r = receiptRepository.findById(id).orElseThrow(() -> new NotFoundException("Receipt not found"));
        return toView(r);
    }

    // ----- CREATE DRAFT
    @PostMapping
    @Transactional
    public ReceiptDtos.View create(@Valid @RequestBody ReceiptDtos.Create dto) {
        Supplier s = dto.supplierId() == null ? null :
                supplierRepository.findById(dto.supplierId())
                        .orElseThrow(() -> new NotFoundException("Supplier not found"));

        User createdBy = userRepository.findById(dto.createdById())
                .orElseThrow(() -> new NotFoundException("User not found"));

        String number = (dto.number() == null || dto.number().isBlank())
                ? numberGenerator.next("R")
                : dto.number();

        Receipt r = Receipt.builder()
                .number(number)
                .supplier(s)
                .createdBy(createdBy)
                .status(DocStatus.DRAFT)
                .totalSum(BigDecimal.ZERO)
                .build();

        r = receiptRepository.save(r);

        if (dto.items() != null) {
            for (ReceiptDtos.ItemCreate ic : dto.items()) {
                Product p = productRepository.findById(ic.productId())
                        .orElseThrow(() -> new NotFoundException("Product not found: " + ic.productId()));

                ReceiptItem item = ReceiptItem.builder()
                        .receipt(r).product(p).qty(ic.qty()).price(ic.price())
                        .build();

                receiptItemRepository.save(item);
                r.getItems().add(item);
            }
        }

        r.setTotalSum(r.getItems().stream()
                .map(i -> i.getPrice().multiply(BigDecimal.valueOf(i.getQty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add));

        return toView(receiptRepository.save(r));
    }

    // ----- ITEMS: ADD / UPDATE / DELETE (DRAFT only)
    @PostMapping("/{id}/items")
    @Transactional
    public ReceiptDtos.ViewItem addItem(@PathVariable Long id, @Valid @RequestBody ReceiptDtos.ItemCreate dto) {
        Receipt r = mustBeDraft(id);
        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + dto.productId()));

        ReceiptItem item = ReceiptItem.builder()
                .receipt(r).product(p).qty(dto.qty()).price(dto.price())
                .build();

        item = receiptItemRepository.save(item);
        r.getItems().add(item);

        recalcTotal(r);

        return new ReceiptDtos.ViewItem(item.getId(), p.getId(), item.getQty(),
                item.getPrice(), item.getBatch() != null ? item.getBatch().getId() : null);
    }

    @PutMapping("/{id}/items/{itemId}")
    @Transactional
    public ReceiptDtos.ViewItem updateItem(@PathVariable Long id, @PathVariable Long itemId,
                                           @Valid @RequestBody ReceiptDtos.ItemUpdate dto) {
        Receipt r = mustBeDraft(id);

        ReceiptItem item = receiptItemRepository.findById(itemId)
                .orElseThrow(() -> new NotFoundException("Receipt item not found"));

        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + dto.productId()));

        item.setProduct(p);
        item.setQty(dto.qty());
        item.setPrice(dto.price());

        item = receiptItemRepository.save(item);
        recalcTotal(r);

        return new ReceiptDtos.ViewItem(item.getId(), p.getId(), item.getQty(),
                item.getPrice(), item.getBatch() != null ? item.getBatch().getId() : null);
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @Transactional
    public void deleteItem(@PathVariable Long id, @PathVariable Long itemId) {
        Receipt r = mustBeDraft(id);
        receiptItemRepository.deleteById(itemId);
        recalcTotal(r);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteDraft(@PathVariable Long id) {
        Receipt r = mustBeDraft(id);

        for (var it : List.copyOf(r.getItems())) {
            receiptItemRepository.deleteById(it.getId());
        }

        receiptRepository.deleteById(r.getId());
    }

    // ----------------- HELPERS -----------------

    private ReceiptDtos.View toView(Receipt r) {
        return new ReceiptDtos.View(
                r.getId(),
                r.getNumber(),
                r.getStatus().name(),

                r.getSupplier() != null ? r.getSupplier().getId() : null,

                // NOW SENDING BOTH ID + USERNAME
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

    private Receipt mustBeDraft(Long id) {
        Receipt r = receiptRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Receipt not found"));

        if (r.getStatus() != DocStatus.DRAFT)
            throw new IllegalStateException("Only DRAFT can be modified");

        return r;
    }

    private void recalcTotal(Receipt r) {
        r.setTotalSum(r.getItems().stream()
                .map(i -> i.getPrice().multiply(BigDecimal.valueOf(i.getQty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add));
        receiptRepository.save(r);
    }
}
