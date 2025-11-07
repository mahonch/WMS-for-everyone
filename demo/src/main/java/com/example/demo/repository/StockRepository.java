package com.example.demo.repository;

import com.example.demo.entity.Stock;
import com.example.demo.entity.stock.StockId;
import com.example.demo.entity.Location;
import com.example.demo.entity.Product;
import com.example.demo.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, StockId> {
    List<Stock> findByLocation(Location location);
    List<Stock> findByProduct(Product product);
    Optional<Stock> findByProductAndLocationAndBatch(Product product, Location location, Batch batch);
}
