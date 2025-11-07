package com.example.demo.repository;

import com.example.demo.entity.IssueItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface IssueItemRepository extends JpaRepository<IssueItem, Long> {
    List<IssueItem> findByIssueId(Long issueId);
}
