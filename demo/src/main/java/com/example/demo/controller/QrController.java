package com.example.demo.controller;

import com.example.demo.service.QrService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {

    private final QrService qrService;
    private final ObjectMapper om;

    private String payload(String type, long id) {
        try {
            // {"t":"batch","id":123}
            var node = om.createObjectNode();
            node.put("t", type);
            node.put("id", id);
            return om.writeValueAsString(node);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @GetMapping("/{type}/{id}.png")
    public ResponseEntity<byte[]> qrGeneric(@PathVariable String type,
                                            @PathVariable long id,
                                            @RequestParam(defaultValue = "300") int size) {
        String json = payload(type, id);
        byte[] png = qrService.generatePng(json, size);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"qr_%s_%d.png\"".formatted(type, id))
                .body(png);
    }

    @GetMapping("/batch/{id}.png")
    public ResponseEntity<byte[]> qrBatch(@PathVariable long id,
                                          @RequestParam(defaultValue = "300") int size) {
        return qrGeneric("batch", id, size);
    }

    @GetMapping("/product/{id}.png")
    public ResponseEntity<byte[]> qrProduct(@PathVariable long id,
                                            @RequestParam(defaultValue = "300") int size) {
        return qrGeneric("product", id, size);
    }

    @GetMapping("/loc/{id}.png")
    public ResponseEntity<byte[]> qrLoc(@PathVariable long id,
                                        @RequestParam(defaultValue = "300") int size) {
        return qrGeneric("loc", id, size);
    }
}
