package com.example.demo.repository;

import com.example.demo.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, Long> {

    Optional<Route> findByTaskId(Long taskId);

    @Query("SELECT r FROM Route r JOIN r.task t WHERE t.id = :taskId")
    Optional<Route> findByTaskIdJoin(@Param("taskId") Long taskId);
}
