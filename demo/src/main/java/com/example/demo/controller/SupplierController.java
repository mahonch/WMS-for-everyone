package com.example.demo.controller;

import com.example.demo.dto.catalog.SupplierDto;
import com.example.demo.entity.Supplier;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.SupplierRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {
    private final SupplierRepository supplierRepository;

    @GetMapping
    public Page<SupplierDto> list(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return supplierRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(s -> new SupplierDto(s.getId(), s.getName(), s.getInn(), s.getPhone(), s.getEmail(), s.getAddress()));
    }

    @PostMapping
    public SupplierDto create(@Valid @RequestBody SupplierDto dto) {
        Supplier s = Supplier.builder()
                .name(dto.name()).inn(dto.inn()).phone(dto.phone()).email(dto.email()).address(dto.address())
                .build();
        s = supplierRepository.save(s);
        return new SupplierDto(s.getId(), s.getName(), s.getInn(), s.getPhone(), s.getEmail(), s.getAddress());
    }

    @PutMapping("/{id}")
    public SupplierDto update(@PathVariable Long id, @Valid @RequestBody SupplierDto dto) {
        Supplier s = supplierRepository.findById(id).orElseThrow(() -> new NotFoundException("Supplier not found"));
        s.setName(dto.name()); s.setInn(dto.inn()); s.setPhone(dto.phone()); s.setEmail(dto.email()); s.setAddress(dto.address());
        s = supplierRepository.save(s);
        return new SupplierDto(s.getId(), s.getName(), s.getInn(), s.getPhone(), s.getEmail(), s.getAddress());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { supplierRepository.deleteById(id); }
}
