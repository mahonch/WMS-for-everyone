package com.example.demo.controller;

import com.example.demo.dto.stock.StockBatchDto;
import com.example.demo.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stock/batches")
@RequiredArgsConstructor
public class StockBatchController {

    private final StockRepository stockRepository;

    /**
     * Вернуть список партий (batch) с остатками по товару и локации.
     * Используется на странице transfers.
     */
    @GetMapping("/{productId}/{locationId}")
    public List<StockBatchDto> getBatchesByProductAndLocation(
            @PathVariable Long productId,
            @PathVariable Long locationId
    ) {
        return stockRepository
                .findByProductIdAndLocationId(productId, locationId)
                .stream()
                .map(s -> new StockBatchDto(
                        s.getBatch() != null ? s.getBatch().getId() : null,
                        s.getBatch() != null ? s.getBatch().getBuyPrice() : null,
                        s.getQty()
                ))
                .toList();
    }
}
