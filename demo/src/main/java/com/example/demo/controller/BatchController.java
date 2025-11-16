package com.example.demo.controller;

import com.example.demo.entity.Batch;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.BatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchRepository batchRepository;

    // === МЕТРИКА ДЛЯ DASHBOARD ===
    // GET /api/batches?size=1
    @GetMapping
    public Page<Batch> list(@RequestParam(defaultValue = "0") int page,
                            @RequestParam(defaultValue = "20") int size) {
        return batchRepository.findAll(PageRequest.of(page, size));
    }

    // === ДЛЯ ФРОНТА /issues (получить партии по товару) ===
    @GetMapping("/by-product/{productId}")
    public List<Batch> getByProduct(@PathVariable Long productId) {
        return batchRepository.findAllByProductIdOrderByReceivedAtAsc(productId);
    }
}
