package com.example.demo.controller;

import com.example.demo.service.TransferService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService transferService;

    @PostMapping("/{id}/commit")
    public ResponseEntity<?> commit(@PathVariable Long id) {
        transferService.commit(id, null);
        return ResponseEntity.ok().build();
    }
}
