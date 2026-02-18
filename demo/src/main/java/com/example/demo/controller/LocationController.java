package com.example.demo.controller;

import com.example.demo.dto.warehouse.LocationDto;
import com.example.demo.entity.Location;
import com.example.demo.entity.Warehouse;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.StockRepository;
import com.example.demo.repository.WarehouseRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationRepository locationRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockRepository stockRepository;

    // ---------- LIST ----------
    @GetMapping
    public List<LocationDto.View> list() {
        return locationRepository.findAll()
                .stream()
                .map(this::toViewWithStats)
                .toList();
    }

    // ---------- GET ----------
    @GetMapping("/{id}")
    public LocationDto.View get(@PathVariable Long id) {
        Location l = locationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Location not found"));
        return toViewWithStats(l);
    }

    // ---------- CREATE ----------
    @PostMapping
    public LocationDto.View create(@Valid @RequestBody LocationDto.Create dto) {
        Warehouse wh = warehouseRepository.findById(dto.warehouseId())
                .orElseThrow(() -> new NotFoundException("Warehouse not found"));

        Location parent = dto.parentId() == null ? null :
                locationRepository.findById(dto.parentId())
                        .orElseThrow(() -> new NotFoundException("Parent location not found"));

        Location loc = Location.builder()
                .code(dto.code())
                .name(dto.name())
                .warehouse(wh)
                .parent(parent)
                .type(dto.type() != null ? dto.type() : com.example.demo.entity.enums.LocationType.BIN)
                .build();

        loc = locationRepository.save(loc);

        return new LocationDto.View(
                loc.getId(),
                loc.getCode(),
                loc.getName(),
                loc.getWarehouse().getId(),
                loc.getParent() != null ? loc.getParent().getId() : null,
                loc.getType(),
                0L,
                0L,
                BigDecimal.ZERO
        );
    }

    // ---------- UPDATE ----------
    @PutMapping("/{id}")
    public LocationDto.View update(@PathVariable Long id,
                                   @Valid @RequestBody LocationDto.Update dto) {

        Location loc = locationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Location not found"));

        Warehouse wh = warehouseRepository.findById(dto.warehouseId())
                .orElseThrow(() -> new NotFoundException("Warehouse not found"));

        Location parent = dto.parentId() == null ? null :
                locationRepository.findById(dto.parentId())
                        .orElseThrow(() -> new NotFoundException("Parent location not found"));

        loc.setCode(dto.code());
        loc.setName(dto.name());
        loc.setWarehouse(wh);
        loc.setParent(parent);
        loc.setType(dto.type() != null ? dto.type() : loc.getType());
        loc = locationRepository.save(loc);

        return toViewWithStats(loc);
    }

    // ---------- DELETE ----------
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        locationRepository.deleteById(id);
    }

    // ---------- PRIVATE HELPERS ----------

    private LocationDto.View toViewWithStats(Location l) {
        Long locationId = l.getId();

        Long products = stockRepository.countProductsByLocation(locationId);
        Long qty = stockRepository.sumQtyByLocation(locationId);
        BigDecimal value = stockRepository.sumValueByLocation(locationId);

        return new LocationDto.View(
                l.getId(),
                l.getCode(),
                l.getName(),
                l.getWarehouse() != null ? l.getWarehouse().getId() : null,
                l.getParent() != null ? l.getParent().getId() : null,
                l.getType(),
                products != null ? products : 0L,
                qty != null ? qty : 0L,
                value != null ? value : BigDecimal.ZERO
        );
    }
}
