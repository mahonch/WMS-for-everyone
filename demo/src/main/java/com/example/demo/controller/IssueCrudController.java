package com.example.demo.controller;

import com.example.demo.dto.doc.IssueDtos;
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
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueCrudController {

    private final IssueRepository issueRepository;
    private final IssueItemRepository issueItemRepository;
    private final ProductRepository productRepository;
    private final BatchRepository batchRepository;
    private final UserRepository userRepository;
    private final NumberGenerator numberGenerator;

    @GetMapping
    public Page<IssueDtos.View> list(@RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size) {
        return issueRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(this::toView);
    }

    @GetMapping("/{id}")
    public IssueDtos.View get(@PathVariable Long id) {
        Issue doc = issueRepository.findById(id).orElseThrow(() -> new NotFoundException("Issue not found"));
        return toView(doc);
    }

    @PostMapping
    @Transactional
    public IssueDtos.View create(@Valid @RequestBody IssueDtos.Create dto) {
        User createdBy = userRepository.findById(dto.createdById())
                .orElseThrow(() -> new NotFoundException("User not found"));

        String number = (dto.number() == null || dto.number().isBlank())
                ? numberGenerator.next("I")
                : dto.number();

        Issue doc = Issue.builder()
                .number(number)
                .createdBy(createdBy)
                .reason(dto.reason())
                .status(DocStatus.DRAFT)
                .build();
        doc = issueRepository.save(doc);

        if (dto.items() != null) {
            for (IssueDtos.ItemCreate ic : dto.items()) {
                Product p = productRepository.findById(ic.productId())
                        .orElseThrow(() -> new NotFoundException("Product not found: " + ic.productId()));
                Batch b = ic.batchId() == null ? null :
                        batchRepository.findById(ic.batchId())
                                .orElseThrow(() -> new NotFoundException("Batch not found: " + ic.batchId()));
                IssueItem item = IssueItem.builder()
                        .issue(doc).product(p).batch(b).qty(ic.qty())
                        .build();
                issueItemRepository.save(item);
                doc.getItems().add(item);
            }
        }
        return toView(doc);
    }

    @PostMapping("/{id}/items")
    @Transactional
    public IssueDtos.ViewItem addItem(@PathVariable Long id, @Valid @RequestBody IssueDtos.ItemCreate dto) {
        Issue doc = mustBeDraft(id);
        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + dto.productId()));
        Batch b = dto.batchId() == null ? null :
                batchRepository.findById(dto.batchId())
                        .orElseThrow(() -> new NotFoundException("Batch not found: " + dto.batchId()));
        IssueItem item = IssueItem.builder()
                .issue(doc).product(p).batch(b).qty(dto.qty())
                .build();
        item = issueItemRepository.save(item);
        doc.getItems().add(item);
        return new IssueDtos.ViewItem(item.getId(), p.getId(), b != null ? b.getId() : null, item.getQty(), item.getCostPrice());
    }

    @PutMapping("/{id}/items/{itemId}")
    @Transactional
    public IssueDtos.ViewItem updateItem(@PathVariable Long id, @PathVariable Long itemId, @Valid @RequestBody IssueDtos.ItemUpdate dto) {
        Issue doc = mustBeDraft(id);
        IssueItem item = issueItemRepository.findById(itemId).orElseThrow(() -> new NotFoundException("Issue item not found"));
        Product p = productRepository.findById(dto.productId())
                .orElseThrow(() -> new NotFoundException("Product not found: " + dto.productId()));
        Batch b = dto.batchId() == null ? null :
                batchRepository.findById(dto.batchId())
                        .orElseThrow(() -> new NotFoundException("Batch not found: " + dto.batchId()));
        item.setProduct(p);
        item.setBatch(b);
        item.setQty(dto.qty());
        item = issueItemRepository.save(item);
        return new IssueDtos.ViewItem(item.getId(), p.getId(), b != null ? b.getId() : null, item.getQty(), item.getCostPrice());
    }

    @DeleteMapping("/{id}/items/{itemId}")
    @Transactional
    public void deleteItem(@PathVariable Long id, @PathVariable Long itemId) {
        mustBeDraft(id);
        issueItemRepository.deleteById(itemId);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void deleteDraft(@PathVariable Long id) {
        Issue doc = mustBeDraft(id);
        for (var it : List.copyOf(doc.getItems())) {
            issueItemRepository.deleteById(it.getId());
        }
        issueRepository.deleteById(doc.getId());
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

    private Issue mustBeDraft(Long id) {
        Issue d = issueRepository.findById(id).orElseThrow(() -> new NotFoundException("Issue not found"));
        if (d.getStatus() != DocStatus.DRAFT) throw new IllegalStateException("Only DRAFT can be modified");
        return d;
    }
}
