package com.example.demo.controller;

import com.example.demo.dto.warehouse.LocationDto;
import com.example.demo.entity.Location;
import com.example.demo.entity.Warehouse;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.WarehouseRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {
    private final LocationRepository locationRepository;
    private final WarehouseRepository warehouseRepository;

    @GetMapping
    public Page<LocationDto> list(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return locationRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(l -> new LocationDto(
                        l.getId(),
                        l.getWarehouse().getId(),
                        l.getCode(),
                        l.getName(),
                        l.getParent() != null ? l.getParent().getId() : null,
                        l.getType()
                ));
    }

    @PostMapping
    public LocationDto create(@Valid @RequestBody LocationDto dto) {
        Warehouse w = warehouseRepository.findById(dto.warehouseId())
                .orElseThrow(() -> new NotFoundException("Warehouse not found"));
        Location parent = dto.parentId() == null ? null :
                locationRepository.findById(dto.parentId())
                        .orElseThrow(() -> new NotFoundException("Parent location not found"));
        Location l = Location.builder()
                .warehouse(w).code(dto.code()).name(dto.name()).parent(parent).type(dto.type())
                .build();
        l = locationRepository.save(l);
        return new LocationDto(l.getId(), l.getWarehouse().getId(), l.getCode(), l.getName(),
                l.getParent() != null ? l.getParent().getId() : null, l.getType());
    }

    @PutMapping("/{id}")
    public LocationDto update(@PathVariable Long id, @Valid @RequestBody LocationDto dto) {
        Location l = locationRepository.findById(id).orElseThrow(() -> new NotFoundException("Location not found"));
        Warehouse w = warehouseRepository.findById(dto.warehouseId())
                .orElseThrow(() -> new NotFoundException("Warehouse not found"));
        l.setWarehouse(w);
        l.setCode(dto.code());
        l.setName(dto.name());
        l.setType(dto.type());
        l.setParent(dto.parentId() == null ? null :
                locationRepository.findById(dto.parentId())
                        .orElseThrow(() -> new NotFoundException("Parent location not found")));
        l = locationRepository.save(l);
        return new LocationDto(l.getId(), l.getWarehouse().getId(), l.getCode(), l.getName(),
                l.getParent() != null ? l.getParent().getId() : null, l.getType());
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { locationRepository.deleteById(id); }
}
