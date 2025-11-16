package com.example.demo.controller;

import com.example.demo.dto.CommitRequests.ReceiptCommitRequest;
import com.example.demo.service.ReceiptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
public class ReceiptCommitController {

    private final ReceiptService receiptService;

    @PostMapping("/{id}/commit")
    public ResponseEntity<?> commit(@PathVariable Long id,
                                    @RequestBody ReceiptCommitRequest body) {
        receiptService.commit(id, body.toLocationId(), null);
        return ResponseEntity.ok().build();
    }
}
