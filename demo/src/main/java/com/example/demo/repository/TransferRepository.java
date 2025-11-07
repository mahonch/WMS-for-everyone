package com.example.demo.repository;

import com.example.demo.entity.Transfer;
import com.example.demo.entity.enums.DocStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TransferRepository extends JpaRepository<Transfer, Long> {
    Optional<Transfer> findByNumber(String number);
    List<Transfer> findByStatusOrderByCreatedAtDesc(DocStatus status);
}
