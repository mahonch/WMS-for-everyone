package com.example.demo.controller;

import com.example.demo.entity.Batch;
import com.example.demo.repository.BatchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchRepository batchRepository;

    @GetMapping
    public Page<Batch> list(@RequestParam(defaultValue = "0") int page,
                            @RequestParam(defaultValue = "20") int size) {

        return batchRepository.findAll(PageRequest.of(page, size));
    }
}
