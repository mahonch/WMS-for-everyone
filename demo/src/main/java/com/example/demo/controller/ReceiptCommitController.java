package com.example.demo.controller;

import com.example.demo.dto.CommitRequests.ReceiptCommitRequest;
import com.example.demo.security.CustomUserDetails;
import com.example.demo.service.ReceiptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
public class ReceiptCommitController {

    private final ReceiptService receiptService;

    @PostMapping("/{id}/commit")
    public ResponseEntity<?> commit(@PathVariable Long id,
                                    @RequestBody ReceiptCommitRequest body,
                                    @AuthenticationPrincipal CustomUserDetails user) {
        receiptService.commit(id, body.toLocationId(), user != null ? user.getId() : null);
        return ResponseEntity.ok().build();
    }
}
