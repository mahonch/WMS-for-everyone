package com.example.demo.service;

import com.example.demo.entity.*;
import com.example.demo.entity.stock.StockId;
import com.example.demo.exception.NegativeStockException;
import com.example.demo.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class StockService {
    private final StockRepository stockRepository;

    @Transactional
    public void increase(Product product, Batch batch, Location location, int qty) {
        var id = new StockId(product.getId(), location.getId(), batch.getId());
        var stock = stockRepository.findById(id).orElseGet(() ->
                Stock.builder()
                        .id(id)
                        .product(product)
                        .location(location)
                        .batch(batch)
                        .qty(0)
                        .build());
        stock.setQty(stock.getQty() + qty);
        stockRepository.save(stock);

        // также обновляем availableQty партии
        batch.setAvailableQty(batch.getAvailableQty() + qty);
    }

    @Transactional
    public void decrease(Product product, Batch batch, Location location, int qty) {
        var id = new StockId(product.getId(), location.getId(), batch.getId());
        var stock = stockRepository.findById(id)
                .orElseThrow(() -> new NegativeStockException("Нет остатка по товару " + product.getSku() +
                        " партия " + batch.getId() + " локация " + location.getCode()));

        int after = stock.getQty() - qty;
        if (after < 0) throw new NegativeStockException("Нельзя списать больше, чем есть на складе");
        stock.setQty(after);
        stockRepository.save(stock);

        // уменьшаем доступное в партии
        int newAvail = batch.getAvailableQty() - qty;
        if (newAvail < 0) throw new NegativeStockException("Отрицательная доступность партии");
        batch.setAvailableQty(newAvail);
    }
}
