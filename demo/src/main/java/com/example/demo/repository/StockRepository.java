package com.example.demo.repository;

import com.example.demo.entity.Batch;
import com.example.demo.entity.Location;
import com.example.demo.entity.Product;
import com.example.demo.entity.Stock;
import com.example.demo.entity.stock.StockId;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface StockRepository extends JpaRepository<Stock, StockId> {

    // ---------------- BASIC FINDERS ----------------

    List<Stock> findByLocation(Location location);
    List<Stock> findByProduct(Product product);

    Optional<Stock> findByProductAndLocationAndBatch(Product product,
                                                     Location location,
                                                     Batch batch);

    List<Stock> findByProduct_Id(Long productId);
    List<Stock> findByLocation_Id(Long locationId);
    List<Stock> findByProductIdAndLocationId(Long productId, Long locationId);


    // ---------------- FIFO for ISSUE ----------------

    /**
     * FIFO-выборка для списаний (Issue):
     * выбираем партии по дате поступления, только с qty > 0,
     * блокируем OPTIMISTIC_WRITE/PESSIMISTIC_WRITE, чтобы не было параллельных гонок.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT s
        FROM Stock s
        WHERE s.product = :product
          AND s.location = :location
          AND s.qty > 0
        ORDER BY s.batch.receivedAt ASC, s.batch.id ASC
    """)
    List<Stock> findFifoStocks(@Param("product") Product product,
                               @Param("location") Location location);


    // ---------------- LOCATION AGGREGATES ----------------

    /**
     * Количество уникальных товаров на локации
     */
    @Query("""
        SELECT COUNT(DISTINCT s.product.id)
        FROM Stock s
        WHERE s.location.id = :locationId
    """)
    Long countProductsByLocation(@Param("locationId") Long locationId);

    /**
     * Общий запас (сумма qty по всем партиям)
     */
    @Query("""
        SELECT COALESCE(SUM(s.qty), 0)
        FROM Stock s
        WHERE s.location.id = :locationId
    """)
    Long sumQtyByLocation(@Param("locationId") Long locationId);

    /**
     * Общая стоимость запасов (qty × batch.buyPrice)
     */
    @Query("""
        SELECT COALESCE(SUM(s.qty * s.batch.buyPrice), 0)
        FROM Stock s
        WHERE s.location.id = :locationId
    """)
    BigDecimal sumValueByLocation(@Param("locationId") Long locationId);
}
