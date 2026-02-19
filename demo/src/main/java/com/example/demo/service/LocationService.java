package com.example.demo.service;

import com.example.demo.dto.warehouse.LocationDto;
import com.example.demo.dto.warehouse.LocationSearchParams;
import com.example.demo.entity.Location;
import com.example.demo.entity.QrLabel;
import com.example.demo.entity.Warehouse;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.LocationRepository;
import com.example.demo.repository.QrLabelRepository;
import com.example.demo.repository.StockRepository;
import com.example.demo.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Сервис для управления локациями (ячейками хранения).
 */
@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;
    private final WarehouseRepository warehouseRepository;
    private final StockRepository stockRepository;
    private final QrLabelRepository qrLabelRepository;
    private final AuditService auditService;

    /**
     * Поиск локаций с фильтрами.
     */
    @Transactional(readOnly = true)
    public Page<LocationDto.View> search(LocationSearchParams params, Pageable pageable) {
        Specification<Location> spec = Specification.where(null);

        if (params.getCode() != null && !params.getCode().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("code")), "%" + params.getCode().toLowerCase() + "%"));
        }

        if (params.getName() != null && !params.getName().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("name")), "%" + params.getName().toLowerCase() + "%"));
        }

        if (params.getWarehouseId() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("warehouse").get("id"), params.getWarehouseId()));
        }

        if (params.getParentId() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("parent").get("id"), params.getParentId()));
        }

        if (params.getType() != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("type"), params.getType()));
        }

        return locationRepository.findAll(spec, pageable).map(this::toViewWithStats);
    }

    /**
     * Получить все локации (пагинация).
     */
    @Transactional(readOnly = true)
    public Page<LocationDto.View> findAll(Pageable pageable) {
        return locationRepository.findAll(pageable).map(this::toViewWithStats);
    }

    /**
     * Получить все локации списком.
     */
    @Transactional(readOnly = true)
    public List<LocationDto.View> findAllList() {
        return locationRepository.findAll().stream().map(this::toViewWithStats).toList();
    }

    /**
     * Получить локацию по ID.
     */
    @Transactional(readOnly = true)
    public LocationDto.View findById(Long id) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Локация не найдена: " + id));
        return toViewWithStats(location);
    }

    /**
     * Получить локации по складу.
     */
    @Transactional(readOnly = true)
    public List<LocationDto.View> findByWarehouseId(Long warehouseId) {
        return locationRepository.findAll().stream()
                .filter(l -> l.getWarehouse().getId().equals(warehouseId))
                .map(this::toViewWithStats)
                .toList();
    }

    /**
     * Создать локацию.
     */
    @Transactional
    public LocationDto.View create(LocationDto.Create dto, Long actorId) {
        Warehouse warehouse = warehouseRepository.findById(dto.warehouseId())
                .orElseThrow(() -> new NotFoundException("Склад не найден: " + dto.warehouseId()));

        Location parent = null;
        if (dto.parentId() != null) {
            parent = locationRepository.findById(dto.parentId())
                    .orElseThrow(() -> new NotFoundException("Родительская локация не найдена: " + dto.parentId()));
        }

        Location location = Location.builder()
                .code(dto.code())
                .name(dto.name())
                .warehouse(warehouse)
                .parent(parent)
                .type(dto.type() != null ? dto.type() : com.example.demo.entity.enums.LocationType.BIN)
                .build();

        location = locationRepository.save(location);

        // Генерация QR-кода для локации
        String qrPayload = "LOCATION:" + location.getId() + ":CODE:" + location.getCode();
        QrLabel qrLabel = QrLabel.builder()
                .entityType("LOCATION")
                .entityId(location.getId())
                .payload(qrPayload)
                .createdAt(java.time.Instant.now())
                .build();
        qrLabelRepository.save(qrLabel);

        // Аудит создания
        auditService.logById(actorId, "LOCATION_CREATE", "Location", location.getId(), null, toView(location));

        return toViewWithStats(location);
    }

    /**
     * Обновить локацию.
     */
    @Transactional
    public LocationDto.View update(Long id, LocationDto.Update dto, Long actorId) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Локация не найдена: " + id));

        LocationDto.View before = toView(location);

        Warehouse warehouse = warehouseRepository.findById(dto.warehouseId())
                .orElseThrow(() -> new NotFoundException("Склад не найден: " + dto.warehouseId()));

        Location parent = null;
        if (dto.parentId() != null) {
            parent = locationRepository.findById(dto.parentId())
                    .orElseThrow(() -> new NotFoundException("Родительская локация не найдена: " + dto.parentId()));
        }

        location.setCode(dto.code());
        location.setName(dto.name());
        location.setWarehouse(warehouse);
        location.setParent(parent);
        if (dto.type() != null) {
            location.setType(dto.type());
        }

        location = locationRepository.save(location);

        // Обновление QR-кода если изменился код
        Long locationId = location.getId();
        String locationCode = location.getCode();
        qrLabelRepository.findByEntityTypeAndEntityId("LOCATION", id).ifPresent(qr -> {
            qr.setPayload("LOCATION:" + locationId + ":CODE:" + locationCode);
            qrLabelRepository.save(qr);
        });

        // Аудит обновления
        auditService.logById(actorId, "LOCATION_UPDATE", "Location", id, before, toViewWithStats(location));

        return toViewWithStats(location);
    }

    /**
     * Удалить локацию.
     */
    @Transactional
    public void deleteById(Long id, Long actorId) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Локация не найдена: " + id));

        LocationDto.View before = toView(location);

        // Проверка: нельзя удалять локацию с остатками
        long stockCount = stockRepository.findByLocation_Id(id).size();
        if (stockCount > 0) {
            throw new IllegalStateException("Нельзя удалить локацию с остатками товаров (позиций: " + stockCount + ")");
        }

        // Удаление дочерних локаций
        List<Location> children = locationRepository.findAll().stream()
                .filter(l -> l.getParent() != null && l.getParent().getId().equals(id))
                .toList();

        for (Location child : children) {
            deleteById(child.getId(), actorId);
        }

        // Удаление QR-кода
        qrLabelRepository.findByEntityTypeAndEntityId("LOCATION", id)
                .ifPresent(qrLabelRepository::delete);

        locationRepository.deleteById(id);

        // Аудит удаления
        auditService.logById(actorId, "LOCATION_DELETE", "Location", id, before, null);
    }

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
                l.getWarehouse() != null ? l.getWarehouse().getName() : null,
                l.getParent() != null ? l.getParent().getId() : null,
                l.getParent() != null ? l.getParent().getName() : null,
                l.getType(),
                products != null ? products : 0L,
                qty != null ? qty : 0L,
                value != null ? value : BigDecimal.ZERO
        );
    }

    private LocationDto.View toView(Location l) {
        return new LocationDto.View(
                l.getId(),
                l.getCode(),
                l.getName(),
                l.getWarehouse() != null ? l.getWarehouse().getId() : null,
                l.getWarehouse() != null ? l.getWarehouse().getName() : null,
                l.getParent() != null ? l.getParent().getId() : null,
                l.getParent() != null ? l.getParent().getName() : null,
                l.getType(),
                0L,
                0L,
                BigDecimal.ZERO
        );
    }
}
