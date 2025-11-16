package com.example.demo.repository;

import com.example.demo.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findAllByProductIdOrderByReceivedAtAsc(Long productId);
}
