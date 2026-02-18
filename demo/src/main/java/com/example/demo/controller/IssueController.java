package com.example.demo.controller;

import com.example.demo.dto.CommitRequests.IssueCommitRequest;
import com.example.demo.repository.UserRepository;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.service.IssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;
    private final UserRepository userRepository;

    @PostMapping("/{id}/commit")
    public ResponseEntity<?> commit(@PathVariable Long id,
                                    @RequestBody IssueCommitRequest body,
                                    @AuthenticationPrincipal CustomUserDetails principal) {
        var actor = principal != null
                ? userRepository.findById(principal.getId()).orElse(null)
                : null;
        issueService.commit(
                id,
                body.fromLocationId(),
                body.targetWarehouseId(),
                body.targetLocationId(),
                body.reasonCode(),
                actor
        );
        return ResponseEntity.ok().build();
    }
}
