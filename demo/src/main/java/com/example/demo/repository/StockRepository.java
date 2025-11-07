package com.example.demo.repository;

import com.example.demo.entity.Stock;
import com.example.demo.entity.stock.StockId;
import com.example.demo.entity.Location;
import com.example.demo.entity.Product;
import com.example.demo.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, StockId> {
    List<Stock> findByLocation(Location location);
    List<Stock> findByProduct(Product product);
    Optional<Stock> findByProductAndLocationAndBatch(Product product, Location location, Batch batch);

    @Query("""
           select s
           from Stock s
           where s.product = :product
             and s.location = :location
             and s.qty > 0
           order by s.batch.receivedAt asc
           """)
    List<Stock> findFifoStocks(@Param("product") Product product,
                               @Param("location") Location location);
}
