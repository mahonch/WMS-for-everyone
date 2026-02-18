package com.example.demo.repository;

import com.example.demo.entity.Issue;
import com.example.demo.entity.enums.DocStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface IssueRepository extends JpaRepository<Issue, Long>, JpaSpecificationExecutor<Issue> {

    Optional<Issue> findByNumber(String number);

    List<Issue> findByStatusOrderByCreatedAtDesc(DocStatus status);

    @EntityGraph(attributePaths = {"items", "items.product", "items.batch"})
    Optional<Issue> findWithItemsById(Long id);

    @Override
    @EntityGraph(attributePaths = {"items"})
    Page<Issue> findAll(Pageable pageable);
}
