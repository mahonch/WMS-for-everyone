package com.example.demo.repository;

import com.example.demo.entity.Receipt;
import com.example.demo.entity.enums.DocStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReceiptRepository extends JpaRepository<Receipt, Long> {
    Optional<Receipt> findByNumber(String number);
    List<Receipt> findByStatusOrderByCreatedAtDesc(DocStatus status);
}
