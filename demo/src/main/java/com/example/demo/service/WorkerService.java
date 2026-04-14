package com.example.demo.service;

import com.example.demo.dto.worker.WorkerShiftDtos;
import com.example.demo.entity.User;
import com.example.demo.entity.WorkerShift;
import com.example.demo.entity.enums.ShiftStatus;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.TaskRepository;
import com.example.demo.repository.UserRepository;
import com.example.demo.repository.WorkerShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkerService {

    private final WorkerShiftRepository workerShiftRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    /**
     * Начать смену для пользователя.
     */
    @Transactional
    public WorkerShiftDtos.View startShift(Long userId) {
        // Проверяем, нет ли уже активной смены
        Optional<WorkerShift> active = workerShiftRepository.findByUserIdAndStatus(userId, ShiftStatus.ACTIVE);
        if (active.isPresent()) {
            throw new IllegalStateException("Смена уже активна");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new NotFoundException("User not found"));

        WorkerShift shift = WorkerShift.builder()
                .user(user)
                .startedAt(LocalDateTime.now())
                .status(ShiftStatus.ACTIVE)
                .tasksCompleted(0)
                .build();

        shift = workerShiftRepository.save(shift);
        return toView(shift);
    }

    /**
     * Завершить смену.
     */
    @Transactional
    public WorkerShiftDtos.View endShift(Long userId) {
        WorkerShift shift = workerShiftRepository.findByUserIdAndStatus(userId, ShiftStatus.ACTIVE)
                .orElseThrow(() -> new IllegalStateException("Нет активной смены"));

        shift.setEndedAt(LocalDateTime.now());
        shift.setStatus(ShiftStatus.COMPLETED);
        shift = workerShiftRepository.save(shift);
        return toView(shift);
    }

    /**
     * Текущая активная смена.
     */
    public WorkerShiftDtos.View getCurrentShift(Long userId) {
        return workerShiftRepository.findByUserIdAndStatus(userId, ShiftStatus.ACTIVE)
                .map(this::toView)
                .orElse(null);
    }

    /**
     * Статистика работника за текущую смену.
     */
    public WorkerStats getWorkerStats(Long userId) {
        long completedTasks = taskRepository.countByAssigneeIdAndStatus(userId, com.example.demo.entity.enums.TaskStatus.COMPLETED);
        WorkerShift activeShift = workerShiftRepository.findByUserIdAndStatus(userId, ShiftStatus.ACTIVE).orElse(null);
        LocalDateTime shiftStart = activeShift != null ? activeShift.getStartedAt() : null;
        long shiftDurationMinutes = shiftStart != null ? java.time.Duration.between(shiftStart, LocalDateTime.now()).toMinutes() : 0;

        return new WorkerStats(completedTasks, shiftDurationMinutes, activeShift != null);
    }

    public record WorkerStats(long completedTasks, long shiftDurationMinutes, boolean onShift) {}

    private WorkerShiftDtos.View toView(WorkerShift s) {
        return new WorkerShiftDtos.View(
                s.getId(),
                s.getUser().getId(),
                s.getUser().getUsername(),
                s.getStartedAt(),
                s.getEndedAt(),
                s.getStatus().name(),
                s.getTasksCompleted(),
                s.getCreatedAt()
        );
    }
}
