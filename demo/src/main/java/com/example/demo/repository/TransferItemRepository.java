package com.example.demo.repository;

import com.example.demo.entity.TransferItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransferItemRepository extends JpaRepository<TransferItem, Long> {
    List<TransferItem> findByTransferId(Long transferId);
}
