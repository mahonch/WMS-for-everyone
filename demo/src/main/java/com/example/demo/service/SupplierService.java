package com.example.demo.service;

import com.example.demo.dto.catalog.SupplierDto;
import com.example.demo.dto.catalog.SupplierSearchParams;
import com.example.demo.entity.Receipt;
import com.example.demo.entity.Supplier;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.ReceiptRepository;
import com.example.demo.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

/**
 * Сервис для управления поставщиками.
 */
@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final ReceiptRepository receiptRepository;
    private final AuditService auditService;

    /**
     * Поиск поставщиков с фильтрами.
     */
    @Transactional(readOnly = true)
    public Page<SupplierDto.View> search(SupplierSearchParams params, Pageable pageable) {
        Specification<Supplier> spec = Specification.where(null);

        if (params.getName() != null && !params.getName().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("name")), "%" + params.getName().toLowerCase() + "%"));
        }

        if (params.getInn() != null && !params.getInn().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("inn")), "%" + params.getInn().toLowerCase() + "%"));
        }

        if (params.getEmail() != null && !params.getEmail().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(cb.lower(root.get("email")), "%" + params.getEmail().toLowerCase() + "%"));
        }

        if (params.getPhone() != null && !params.getPhone().isBlank()) {
            spec = spec.and((root, query, cb) ->
                    cb.like(root.get("phone"), "%" + params.getPhone() + "%"));
        }

        return supplierRepository.findAll(spec, pageable).map(this::toView);
    }

    /**
     * Получить всех поставщиков (пагинация).
     */
    @Transactional(readOnly = true)
    public Page<SupplierDto.View> findAll(Pageable pageable) {
        return supplierRepository.findAll(pageable).map(this::toView);
    }

    /**
     * Получить поставщика по ID.
     */
    @Transactional(readOnly = true)
    public SupplierDto.View findById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Поставщик не найден: " + id));
        return toView(supplier);
    }

    /**
     * Создать поставщика.
     */
    @Transactional
    public SupplierDto.View create(SupplierDto.Create dto, Long actorId) {
        // Проверка на дубликат ИНН (если указан)
        if (dto.inn() != null && !dto.inn().isBlank()) {
            supplierRepository.findByInn(dto.inn()).ifPresent(existing -> {
                throw new IllegalArgumentException("Поставщик с таким ИНН уже существует");
            });
        }

        Supplier supplier = Supplier.builder()
                .name(dto.name())
                .inn(dto.inn())
                .phone(dto.phone())
                .email(dto.email())
                .address(dto.address())
                .build();

        supplier = supplierRepository.save(supplier);

        // Аудит создания
        auditService.logById(actorId, "SUPPLIER_CREATE", "Supplier", supplier.getId(), null, toView(supplier));

        return toView(supplier);
    }

    /**
     * Обновить поставщика.
     */
    @Transactional
    public SupplierDto.View update(Long id, SupplierDto.Update dto, Long actorId) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Поставщик не найден: " + id));

        SupplierDto.View before = toView(supplier);

        // Проверка на дубликат ИНН (если ИНН изменился и указан)
        if (dto.inn() != null && !dto.inn().isBlank()) {
            supplierRepository.findByInn(dto.inn())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Поставщик с таким ИНН уже существует");
                    });
        }

        supplier.setName(dto.name());
        supplier.setInn(dto.inn());
        supplier.setPhone(dto.phone());
        supplier.setEmail(dto.email());
        supplier.setAddress(dto.address());

        supplier = supplierRepository.save(supplier);

        // Аудит обновления
        auditService.logById(actorId, "SUPPLIER_UPDATE", "Supplier", id, before, toView(supplier));

        return toView(supplier);
    }

    /**
     * Удалить поставщика.
     */
    @Transactional
    public void deleteById(Long id, Long actorId) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Поставщик не найден: " + id));

        SupplierDto.View before = toView(supplier);

        supplierRepository.deleteById(id);

        // Аудит удаления
        auditService.logById(actorId, "SUPPLIER_DELETE", "Supplier", id, before, null);
    }

    private SupplierDto.View toView(Supplier s) {
        return new SupplierDto.View(
                s.getId(),
                s.getName(),
                s.getInn(),
                s.getPhone(),
                s.getEmail(),
                s.getAddress()
        );
    }

    /**
     * Получить документы поставщика (приёмки).
     */
    @Transactional(readOnly = true)
    public Page<SupplierDto.DocumentView> findDocumentsBySupplierId(Long supplierId, Pageable pageable) {
        return receiptRepository.findBySupplierId(supplierId, pageable)
                .map(r -> new SupplierDto.DocumentView(
                        r.getId(),
                        r.getNumber(),
                        r.getDocType(),
                        r.getStatus().name(),
                        r.getCreatedAt(),
                        r.getCommittedAt(),
                        r.getWarehouse() != null ? r.getWarehouse().getName() : null,
                        r.getItems().size(),
                        r.getTotalSum()
                ));
    }
} 
