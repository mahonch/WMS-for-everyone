package com.example.demo.repository;

import com.example.demo.entity.WorkerShift;
import com.example.demo.entity.enums.ShiftStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkerShiftRepository extends JpaRepository<WorkerShift, Long> {

    Optional<WorkerShift> findByUserIdAndStatus(Long userId, ShiftStatus status);

    List<WorkerShift> findByUserIdOrderByStartedAtDesc(Long userId);

    long countByUserIdAndStatus(Long userId, ShiftStatus status);
}
