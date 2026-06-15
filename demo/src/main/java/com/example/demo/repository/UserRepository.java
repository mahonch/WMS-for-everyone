package com.example.demo.repository;

import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    // Все активные пользователи
    List<User> findByActiveTrueOrderByUsername();

    // Пользователи, которые были онлайн недавно (lastSeenAt > threshold)
    @Query("SELECT u FROM User u WHERE u.active = true AND u.lastSeenAt > :since ORDER BY u.lastSeenAt DESC")
    List<User> findOnlineUsers(@Param("since") Instant since);

    // Все пользователи (для админов)
    List<User> findAllByOrderByUsername();
}
