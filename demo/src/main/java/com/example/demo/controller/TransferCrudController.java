package com.example.demo.controller;

import com.example.demo.dto.doc.TransferDtos;
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

import java.util.List;

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

    @GetMapping
    public Page<TransferDtos.View> list(@RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "20") int size) {
        return transferRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(this::toView);
    }

    @GetMapping("/{id}")
    public TransferDtos.View get(@PathVariable Long id) {
        Transfer d = transferRepository.findById(id).orElseThrow(() -> new NotFoundException("Transfer not found"));
        return toView(d);
    }

    @PostMapping
    @Transactional
    public TransferDtos.View create(@Valid @RequestBody TransferDtos.Create dto) {
        Location from = locationRepository.findById(dto.fromLocationId())
                .orElseThrow(() -> new NotFoundException("From location not found"));
        Location to = locationRepository.findById(dto.toLocationId())
                .orElseThrow(() -> new NotFoundException("To location not found"));
        User createdBy = dto.createdById() == null ? null :
                userRepository.findById(dto.createdById())
                        .orElseThrow(() -> new NotFoundException("User not found"));

        String number = (dto.number() == null || dto.number().isBlank())
                ? numberGenerator.next("T")
                : dto.number();

        Transfer d = Transfer.builder()
                .number(number)
                .fromLocation(from)
                .toLocation(to)
                .createdBy(createdBy)
                .status(DocStatus.DRAFT)
                .build();
        d = transferRepository.save(d);

        if (dto.items() != null) {
            for (TransferDtos.ItemCreate ic : dto.items()) {
                Product p = productRepository.findById(ic.productId())
                        .orElseThrow(() -> new NotFoundException("Product not found: " + ic.productId()));
                Batch b = batchRepository.findById(ic.batchId())
                        .orElseThrow(() -> new NotFoundException("Batch not found: " + ic.batchId()));
                TransferItem item = TransferItem.builder()
                        .transfer(d).product(p).batch(b).qty(ic.qty())
                        .build();
                transferItemRepository.save(item);
                d.getItems().add(item);
            }
        }
        return toView(d);
    }

    @PostMapping("/{id}/items")
    @Transactional
    public TransferDtos.ViewItem addItem(@PathVariable Long id, @Valid @RequestBody TransferDtos.ItemCreate dto) {
        Transfer d = mustBeDraft(id);
        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + dto.productId()));
        Batch b = batchRepository.findById(dto.batchId())
                .orElseThrow(() -> new NotFoundException("Batch not found: " + dto.batchId()));
        TransferItem item = TransferItem.builder()
                .transfer(d).product(p).batch(b).qty(dto.qty())
                .build();
        item = transferItemRepository.save(item);
        d.getItems().add(item);
        return new TransferDtos.ViewItem(item.getId(), p.getId(), b.getId(), item.getQty());
    }

    @PutMapping("/{id}/items/{itemId}")
    @Transactional
    public TransferDtos.ViewItem updateItem(@PathVariable Long id, @PathVariable Long itemId, @Valid @RequestBody TransferDtos.ItemUpdate dto) {
        Transfer d = mustBeDraft(id);
        TransferItem item = transferItemRepository.findById(itemId).orElseThrow(() -> new NotFoundException("Transfer item not found"));
        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + dto.productId()));
        Batch b = batchRepository.findById(dto.batchId())
                .orElseThrow(() -> new NotFoundException("Batch not found: " + dto.batchId()));
        item.setProduct(p);
        item.setBatch(b);
        item.setQty(dto.qty());
        item = transferItemRepository.save(item);
        return new TransferDtos.ViewItem(item.getId(), p.getId(), b.getId(), item.getQty());
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @Transactional
    public void deleteItem(@PathVariable Long id, @PathVariable Long itemId) {
        mustBeDraft(id);
        transferItemRepository.deleteById(itemId);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteDraft(@PathVariable Long id) {
        Transfer d = mustBeDraft(id);
        for (var it : List.copyOf(d.getItems())) {
            transferItemRepository.deleteById(it.getId());
        }
        transferRepository.deleteById(d.getId());
    }

    private TransferDtos.View toView(Transfer d) {
        return new TransferDtos.View(
                d.getId(), d.getNumber(), d.getStatus().name(),
                d.getFromLocation() != null ? d.getFromLocation().getId() : null,
                d.getToLocation() != null ? d.getToLocation().getId() : null,
                d.getCreatedBy() != null ? d.getCreatedBy().getId() : null,
                d.getCreatedAt(),
                d.getItems().stream().map(i -> new TransferDtos.ViewItem(
                        i.getId(),
                        i.getProduct().getId(),
                        i.getBatch().getId(),
                        i.getQty()
                )).toList()
        );
    }

    private Transfer mustBeDraft(Long id) {
        Transfer d = transferRepository.findById(id).orElseThrow(() -> new NotFoundException("Transfer not found"));
        if (d.getStatus() != DocStatus.DRAFT) throw new IllegalStateException("Only DRAFT can be modified");
        return d;
    }
}
