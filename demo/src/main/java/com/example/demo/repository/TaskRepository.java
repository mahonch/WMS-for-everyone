package com.example.demo.repository;

import com.example.demo.entity.Task;
import com.example.demo.entity.enums.TaskStatus;
import com.example.demo.entity.enums.TaskType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    Optional<Task> findByNumber(String number);

    Page<Task> findByStatusAndTypeOrderByCreatedAtDesc(TaskStatus status, TaskType type, Pageable pageable);

    Page<Task> findByStatusOrderByCreatedAtDesc(TaskStatus status, Pageable pageable);

    Page<Task> findByAssigneeIdOrderByCreatedAtDesc(Long assigneeId, Pageable pageable);

    List<Task> findByStatusAndType(TaskStatus status, TaskType type);

    @Query("SELECT t FROM Task t WHERE t.type = :type AND t.status = :status AND t.warehouse.id = :whId ORDER BY t.createdAt DESC")
    Page<Task> findAvailableByTypeAndWarehouse(@Param("type") TaskType type,
                                               @Param("status") TaskStatus status,
                                               @Param("whId") Long warehouseId,
                                               Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.status = :status AND t.warehouse.id = :whId ORDER BY t.createdAt DESC")
    Page<Task> findAvailableByWarehouse(@Param("status") TaskStatus status,
                                        @Param("whId") Long warehouseId,
                                        Pageable pageable);

    long countByAssigneeIdAndStatus(Long assigneeId, TaskStatus status);

    Page<Task> findByTypeOrderByCreatedAtDesc(TaskType type, Pageable pageable);

    Page<Task> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(TaskStatus status);

    long countByType(TaskType type);

    // Количество выполненных задач для пользователя
    long countByAssigneeIdAndStatusAndType(Long assigneeId, TaskStatus status, TaskType type);

    // Количество выполненных задач за период
    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignee.id = :uid AND t.status = 'COMPLETED' AND t.completedAt >= :since")
    long countCompletedSince(@Param("uid") Long assigneeId, @Param("since") java.time.LocalDateTime since);

    // Количество выполненных задач по типу за период
    @Query("SELECT COUNT(t) FROM Task t WHERE t.assignee.id = :uid AND t.status = 'COMPLETED' AND t.type = :type AND t.completedAt >= :since")
    long countCompletedSinceByType(@Param("uid") Long assigneeId, @Param("type") TaskType type, @Param("since") java.time.LocalDateTime since);
}
