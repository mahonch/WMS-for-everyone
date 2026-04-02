package com.example.demo.repository;

import com.example.demo.entity.Receipt;
import com.example.demo.entity.enums.DocStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface ReceiptRepository extends JpaRepository<Receipt, Long>,JpaSpecificationExecutor<Receipt> {
    Optional<Receipt> findByNumber(String number);
    List<Receipt> findByStatusOrderByCreatedAtDesc(DocStatus status);
    Page<Receipt> findBySupplierId(Long supplierId, Pageable pageable);
    Page<Receipt> findByWarehouseId(Pageable pageable, Long warehouseId);
}
