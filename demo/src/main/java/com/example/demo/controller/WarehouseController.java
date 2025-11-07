package com.example.demo.controller;

import com.example.demo.dto.warehouse.WarehouseDto;
import com.example.demo.entity.Warehouse;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.WarehouseRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/warehouses")
@RequiredArgsConstructor
public class WarehouseController {
    private final WarehouseRepository warehouseRepository;

    @GetMapping
    public Page<WarehouseDto> list(@RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        return warehouseRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(w -> new WarehouseDto(w.getId(), w.getName(), w.getCode(), w.getAddress(), w.getIsActive()));
    }

    @PostMapping
    public WarehouseDto create(@Valid @RequestBody WarehouseDto dto) {
        Warehouse w = Warehouse.builder()
                .name(dto.name()).code(dto.code()).address(dto.address())
                .isActive(dto.isActive() != null ? dto.isActive() : true)
                .build();
        w = warehouseRepository.save(w);
        return new WarehouseDto(w.getId(), w.getName(), w.getCode(), w.getAddress(), w.getIsActive());
    }

    @PutMapping("/{id}")
    public WarehouseDto update(@PathVariable Long id, @Valid @RequestBody WarehouseDto dto) {
        Warehouse w = warehouseRepository.findById(id).orElseThrow(() -> new NotFoundException("Warehouse not found"));
        w.setName(dto.name()); w.setCode(dto.code()); w.setAddress(dto.address());
        if (dto.isActive() != null) w.setIsActive(dto.isActive());
        w = warehouseRepository.save(w);
        return new WarehouseDto(w.getId(), w.getName(), w.getCode(), w.getAddress(), w.getIsActive());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { warehouseRepository.deleteById(id); }
}
