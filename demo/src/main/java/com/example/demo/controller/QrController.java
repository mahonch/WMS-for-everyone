package com.example.demo.controller;

import com.example.demo.service.QrService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.ProductRepository;
import com.example.demo.repository.StockRepository;
import com.example.demo.exception.NotFoundException;

@RestController
@RequestMapping("/api/qr")
@RequiredArgsConstructor
public class QrController {

    private final QrService qrService;
    private final ObjectMapper om;
    private final LocationRepository locationRepository;
    private final ProductRepository productRepository;
    private final StockRepository stockRepository;

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

    @GetMapping("/product/barcode/{barcode}.png")
    public ResponseEntity<byte[]> qrProductByBarcode(@PathVariable String barcode,
                                                     @RequestParam(defaultValue = "300") int size) {
        return qrGeneric("barcode", 0, size);
    }

    @GetMapping("/barcode/{barcode}.png")
    public ResponseEntity<byte[]> qrByBarcode(@PathVariable String barcode,
                                              @RequestParam(defaultValue = "300") int size) {
        try {
            // Генерируем QR с данными штрих-кода
            var node = om.createObjectNode();
            node.put("t", "barcode");
            node.put("barcode", barcode);
            String json = om.writeValueAsString(node);
            byte[] png = qrService.generatePng(json, size);
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "inline; filename=\"qr_barcode_%s.png\"".formatted(barcode))
                    .body(png);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @GetMapping("/loc/{id}.png")
    public ResponseEntity<byte[]> qrLoc(@PathVariable long id,
                                        @RequestParam(defaultValue = "300") int size) {
        return qrGeneric("loc", id, size);
    }

    // ---------- INFO ENDPOINTS ----------
    @GetMapping("/loc/{id}/info")
    public ResponseEntity<?> locInfo(@PathVariable long id) {
        var loc = locationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Location not found: " + id));

        var stocks = stockRepository.findByLocation_Id(id).stream()
                .map(s -> om.createObjectNode()
                        .put("productId", s.getProduct().getId())
                        .put("sku", s.getProduct().getSku())
                        .put("name", s.getProduct().getName())
                        .put("batchId", s.getBatch().getId())
                        .put("qty", s.getQty()))
                .toList();

        var node = om.createObjectNode();
        node.put("id", loc.getId());
        node.put("code", loc.getCode());
        node.put("name", loc.getName());
        node.put("warehouseId", loc.getWarehouse().getId());
        node.put("warehouse", loc.getWarehouse().getName());
        node.put("type", loc.getType().name());
        node.set("stocks", om.valueToTree(stocks));
        return ResponseEntity.ok(node);
    }

    @GetMapping("/product/{id}/info")
    public ResponseEntity<?> productInfo(@PathVariable long id) {
        var product = productRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Product not found: " + id));

        var stocks = stockRepository.findByProduct_Id(id).stream()
                .map(s -> om.createObjectNode()
                        .put("locationId", s.getLocation().getId())
                        .put("location", s.getLocation().getCode())
                        .put("warehouseId", s.getLocation().getWarehouse().getId())
                        .put("warehouse", s.getLocation().getWarehouse().getName())
                        .put("batchId", s.getBatch().getId())
                        .put("qty", s.getQty()))
                .toList();

        var node = om.createObjectNode();
        node.put("id", product.getId());
        node.put("sku", product.getSku());
        node.put("name", product.getName());
        node.put("unit", product.getUnit());
        node.set("stocks", om.valueToTree(stocks));
        return ResponseEntity.ok(node);
    }
}
