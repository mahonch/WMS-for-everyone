package com.example.demo.controller;

import com.example.demo.repository.BatchRepository;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Data class ScanRequest { String data; }   // строка из QR
@Data class ScanResponse {
    String type; Long id;
    String productName; Integer availableQty; String locationCode; String expiryDate;
}

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
public class ScanController {
    private final BatchRepository batchRepo;
    private final ProductRepository productRepo;
    private final LocationRepository locationRepo;
    private final ObjectMapper om;

    @PostMapping
    public ScanResponse scan(@RequestBody ScanRequest req) throws Exception {
        var node = om.readTree(req.getData());
        var type = node.get("t").asText();
        var id = node.get("id").asLong();

        var resp = new ScanResponse(); resp.setType(type); resp.setId(id);

        switch (type) {
            case "batch" -> {
                var b = batchRepo.findById(id).orElseThrow();
                resp.setProductName(b.getProduct().getName());
                resp.setAvailableQty(b.getAvailableQty());
                if (b.getLocation()!=null) resp.setLocationCode(b.getLocation().getCode());
                if (b.getExpiryDate()!=null) resp.setExpiryDate(b.getExpiryDate().toString());
            }
            case "product" -> {
                var p = productRepo.findById(id).orElseThrow();
                resp.setProductName(p.getName());
            }
            case "loc" -> {
                var l = locationRepo.findById(id).orElseThrow();
                resp.setLocationCode(l.getCode());
            }
            default -> throw new IllegalArgumentException("Unknown QR type: "+type);
        }
        return resp;
    }
}


