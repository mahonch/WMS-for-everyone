package com.example.demo.repository;

import com.example.demo.entity.Issue;
import com.example.demo.entity.enums.DocStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface IssueRepository extends JpaRepository<Issue, Long> {
    Optional<Issue> findByNumber(String number);
    List<Issue> findByStatusOrderByCreatedAtDesc(DocStatus status);
}
