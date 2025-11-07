package com.example.demo.controller;

import com.example.demo.dto.stock.StockDto;
import com.example.demo.entity.Stock;
import com.example.demo.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/stocks")
@RequiredArgsConstructor
public class StockController {

    private final StockRepository stockRepository;

    @GetMapping
    public List<StockDto> list(@RequestParam(required = false) Long productId,
                               @RequestParam(required = false) Long locationId) {
        List<Stock> stocks;
        if (productId != null && locationId != null) {
            stocks = stockRepository.findByProductIdAndLocationId(productId, locationId);
        } else if (productId != null) {
            stocks = stockRepository.findByProduct_Id(productId);
        } else if (locationId != null) {
            stocks = stockRepository.findByLocation_Id(locationId);
        } else {
            stocks = stockRepository.findAll();
        }

        return stocks.stream()
                .map(s -> new StockDto(
                        s.getId() != null ? s.getId() : null,
                        s.getProduct().getId(),
                        s.getLocation().getId(),
                        s.getBatch() != null ? s.getBatch().getId() : null,
                        s.getQty()
                ))
                .toList();
    }
}
