package com.example.demo.repository;

import com.example.demo.entity.TaskItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskItemRepository extends JpaRepository<TaskItem, Long> {

    List<TaskItem> findByTaskIdOrderBySortOrderAsc(Long taskId);

    long countByTaskIdAndConfirmed(Long taskId, Boolean confirmed);

    @Query("SELECT ti FROM TaskItem ti WHERE ti.task.id = :taskId AND ti.confirmed = false ORDER BY ti.sortOrder ASC")
    List<TaskItem> findUnconfirmedByTaskId(@Param("taskId") Long taskId);
}
