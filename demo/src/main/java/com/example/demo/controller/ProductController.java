package com.example.demo.controller;

import com.example.demo.dto.catalog.ProductDtos;
import com.example.demo.entity.Category;
import com.example.demo.entity.Product;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.ProductRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @GetMapping
    public Page<ProductDtos.View> list(@RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "20") int size) {
        return productRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(this::toView);
    }

    @GetMapping("/by-sku/{sku}")
    public ProductDtos.View bySku(@PathVariable String sku) {
        Product p = productRepository.findBySku(sku).orElseThrow(() -> new NotFoundException("Product not found"));
        return toView(p);
    }

    @GetMapping("/by-barcode/{barcode}")
    public ProductDtos.View byBarcode(@PathVariable String barcode) {
        Product p = productRepository.findByBarcode(barcode).orElseThrow(() -> new NotFoundException("Product not found"));
        return toView(p);
    }

    @PostMapping
    public ProductDtos.View create(@Valid @RequestBody ProductDtos.Create dto) {
        Category c = categoryRepository.findById(dto.categoryId())
                .orElseThrow(() -> new NotFoundException("Category not found"));
        Product p = Product.builder()
                .sku(dto.sku()).name(dto.name()).barcode(dto.barcode())
                .category(c).unit(dto.unit()).minStock(dto.minStock())
                .costPrice(dto.costPrice()).isActive(dto.isActive() != null ? dto.isActive() : true)
                .imageUrl(dto.imageUrl())
                .build();
        p = productRepository.save(p);
        return toView(p);
    }

    @PutMapping("/{id}")
    public ProductDtos.View update(@PathVariable Long id, @Valid @RequestBody ProductDtos.Update dto) {
        Product p = productRepository.findById(id).orElseThrow(() -> new NotFoundException("Product not found"));
        Category c = categoryRepository.findById(dto.categoryId())
                .orElseThrow(() -> new NotFoundException("Category not found"));
        p.setName(dto.name()); p.setBarcode(dto.barcode()); p.setCategory(c);
        p.setUnit(dto.unit()); p.setMinStock(dto.minStock()); p.setCostPrice(dto.costPrice());
        if (dto.isActive() != null) p.setIsActive(dto.isActive()); p.setImageUrl(dto.imageUrl());
        p = productRepository.save(p);
        return toView(p);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { productRepository.deleteById(id); }

    private ProductDtos.View toView(Product p) {
        return new ProductDtos.View(
                p.getId(), p.getSku(), p.getName(), p.getBarcode(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getUnit(), p.getMinStock(), p.getCostPrice(), p.getIsActive(), p.getImageUrl()
        );
    }
}
