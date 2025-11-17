package com.example.demo.controller;

import com.example.demo.dto.doc.TransferDtos;
import com.example.demo.entity.*;
import com.example.demo.entity.enums.DocStatus;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.*;
import com.example.demo.util.NumberGenerator;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferCrudController {

    private final TransferRepository transferRepository;
    private final TransferItemRepository transferItemRepository;
    private final ProductRepository productRepository;
    private final BatchRepository batchRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final NumberGenerator numberGenerator;

    @PostMapping
    @Transactional
    public TransferDtos.View create(@RequestBody TransferDtos.Create dto) {

        User createdBy = userRepository.findById(dto.createdById())
                .orElseThrow(() -> new NotFoundException("User not found"));

        Location from = locationRepository.findById(dto.fromLocationId())
                .orElseThrow(() -> new NotFoundException("Location not found"));

        Location to = locationRepository.findById(dto.toLocationId())
                .orElseThrow(() -> new NotFoundException("Location not found"));

        String number = (dto.number() == null || dto.number().isBlank())
                ? numberGenerator.next("T")
                : dto.number();

        Transfer t = Transfer.builder()
                .number(number)
                .createdBy(createdBy)
                .fromLocation(from)
                .toLocation(to)
                .status(DocStatus.DRAFT)
                .build();

        t = transferRepository.save(t);

        return toView(t);
    }

    @GetMapping("/{id}")
    public TransferDtos.View get(@PathVariable Long id) {
        Transfer t = transferRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Transfer not found"));
        return toView(t);
    }

    @PostMapping("/{id}/items")
    @Transactional
    public TransferDtos.ViewItem addItem(@PathVariable Long id,
                                         @RequestBody TransferDtos.ItemCreate dto) {

        Transfer t = transferRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Transfer not found"));

        if (t.getStatus() != DocStatus.DRAFT)
            throw new IllegalStateException("Only DRAFT documents can be modified");

        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found"));

        Batch b = batchRepository.findById(dto.batchId())
                .orElseThrow(() -> new NotFoundException("Batch not found"));

        TransferItem item = TransferItem.builder()
                .transfer(t)
                .product(p)
                .batch(b)
                .qty(dto.qty())
                .build();

        item = transferItemRepository.save(item);
        t.getItems().add(item);

        return new TransferDtos.ViewItem(
                item.getId(),
                p.getId(),
                b.getId(),
                item.getQty()
        );
    }

    private TransferDtos.View toView(Transfer t) {
        return new TransferDtos.View(
                t.getId(),
                t.getNumber(),
                t.getStatus().name(),
                t.getCreatedBy() != null ? t.getCreatedBy().getId() : null,
                t.getFromLocation().getId(),
                t.getToLocation().getId(),
                t.getCreatedAt(),
                t.getItems().stream()
                        .map(i -> new TransferDtos.ViewItem(
                                i.getId(),
                                i.getProduct().getId(),
                                i.getBatch() != null ? i.getBatch().getId() : null,
                                i.getQty()
                        ))
                        .toList()
        );
    }
}
