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

    // -----------------------------------------------------------
    // GET STOCK LIST
    // -----------------------------------------------------------
    @GetMapping
    public List<StockDto> list(@RequestParam(required = false) Long productId,
                               @RequestParam(required = false) Long locationId,
                               @RequestParam(required = false) Long warehouseId) {
        List<Stock> stocks;
        if (productId != null && locationId != null) {
            stocks = stockRepository.findByProductIdAndLocationId(productId, locationId);
        } else if (productId != null && warehouseId != null) {
            stocks = stockRepository.findByProductIdAndLocation_Warehouse_Id(productId, warehouseId);
        } else if (warehouseId != null) {
            stocks = stockRepository.findByLocation_Warehouse_Id(warehouseId);
        } else if (productId != null) {
            stocks = stockRepository.findByProduct_Id(productId);
        } else if (locationId != null) {
            stocks = stockRepository.findByLocation_Id(locationId);
        } else {
            stocks = stockRepository.findAll();
        }

        return stocks.stream()
                .map(s -> new StockDto(
                        s.getId(),
                        s.getProduct().getId(),
                        s.getProduct().getName(),
                        s.getLocation().getId(),
                        s.getLocation().getCode(),
                        s.getBatch() != null ? s.getBatch().getId() : null,
                        s.getBatch() != null ? s.getBatch().getLotNumber() : null,
                        s.getQty()
                ))
                .toList();
    }

    // -----------------------------------------------------------
    // GET BATCHES FOR TRANSFER (NEEDED BY FRONT-END)
    // -----------------------------------------------------------
    @GetMapping("/batches/{productId}/{locationId}")
    public List<StockDto> batches(
            @PathVariable Long productId,
            @PathVariable Long locationId
    ) {
        List<Stock> stocks = stockRepository.findByProductIdAndLocationId(productId, locationId);

        return stocks.stream()
                .map(s -> new StockDto(
                        s.getId(),
                        s.getProduct().getId(),
                        s.getProduct().getName(),
                        s.getLocation().getId(),
                        s.getLocation().getCode(),
                        s.getBatch() != null ? s.getBatch().getId() : null,
                        s.getBatch() != null ? s.getBatch().getLotNumber() : null,
                        s.getQty()
                ))
                .toList();
    }
}
