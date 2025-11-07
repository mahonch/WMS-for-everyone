package com.example.demo.controller;

import com.example.demo.dto.CommitRequests.ReceiptCommitRequest;
import com.example.demo.service.ReceiptService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
public class ReceiptController {

    private final ReceiptService receiptService;

    @PostMapping("/{id}/commit")
    public ResponseEntity<?> commit(@PathVariable Long id, @RequestBody ReceiptCommitRequest body) {
        // На этапе dev аудита достаточно, actor = null (в AuditLog actor_id будет NULL)
        receiptService.commit(id, body.toLocationId(), null);
        return ResponseEntity.ok().build();
    }
}
