package com.example.demo.repository;

import com.example.demo.entity.RoutePoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoutePointRepository extends JpaRepository<RoutePoint, Long> {

    @Query("SELECT rp FROM RoutePoint rp WHERE rp.route.id = :routeId ORDER BY rp.sortOrder ASC")
    List<RoutePoint> findByRouteIdOrderBySortOrder(@Param("routeId") Long routeId);

    long countByRouteIdAndVisited(Long routeId, Boolean visited);
}
