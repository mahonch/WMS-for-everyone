package com.example.demo.controller;

import com.example.demo.repository.BatchRepository;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.service.QrService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {
    private final QrService qr;
    private final BatchRepository batchRepo;
    private final ProductRepository productRepo;
    private final LocationRepository locationRepo;

    @GetMapping(value="/batch/{id}.png", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] batchQr(@PathVariable long id, @RequestParam(defaultValue="256") int size) {
        var b = batchRepo.findById(id).orElseThrow();
        var payload = String.format(
                "{\"t\":\"batch\",\"v\":1,\"id\":%d,\"p\":%d%s}",
                b.getId(), b.getProduct().getId(),
                b.getExpiryDate()!=null ? ",\"e\":\""+b.getExpiryDate()+"\"" : ""
        );
        return qr.generatePng(payload, size);
    }

    @GetMapping(value="/product/{id}.png", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] productQr(@PathVariable long id, @RequestParam(defaultValue="256") int size) {
        productRepo.findById(id).orElseThrow();
        var payload = String.format("{\"t\":\"product\",\"v\":1,\"id\":%d}", id);
        return qr.generatePng(payload, size);
    }

    @GetMapping(value="/loc/{id}.png", produces = MediaType.IMAGE_PNG_VALUE)
    public byte[] locQr(@PathVariable long id, @RequestParam(defaultValue="256") int size) {
        locationRepo.findById(id).orElseThrow();
        var payload = String.format("{\"t\":\"loc\",\"v\":1,\"id\":%d}", id);
        return qr.generatePng(payload, size);
    }
}
