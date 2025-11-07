package com.example.demo.controller;

import com.example.demo.dto.CommitRequests.IssueCommitRequest;
import com.example.demo.service.IssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;

    @PostMapping("/{id}/commit")
    public ResponseEntity<?> commit(@PathVariable Long id, @RequestBody IssueCommitRequest body) {
        issueService.commit(id, body.fromLocationId(), null);
        return ResponseEntity.ok().build();
    }
}
