package com.example.demo.controller;

import com.example.demo.dto.catalog.CategoryDto;
import com.example.demo.entity.Category;
import com.example.demo.exception.NotFoundException;
import com.example.demo.repository.CategoryRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {
    private final CategoryRepository categoryRepository;

    @GetMapping
    public Page<CategoryDto> list(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return categoryRepository.findAll(PageRequest.of(page, size, Sort.by("id").descending()))
                .map(c -> new CategoryDto(c.getId(), c.getName(), c.getParent() != null ? c.getParent().getId() : null));
    }

    @PostMapping
    public CategoryDto create(@Valid @RequestBody CategoryDto dto) {
        Category c = Category.builder()
                .name(dto.name())
                .parent(dto.parentId() == null ? null :
                        categoryRepository.findById(dto.parentId())
                                .orElseThrow(() -> new NotFoundException("Parent category not found")))
                .build();
        c = categoryRepository.save(c);
        return new CategoryDto(c.getId(), c.getName(), c.getParent() != null ? c.getParent().getId() : null);
    }

    @PutMapping("/{id}")
    public CategoryDto update(@PathVariable Long id, @Valid @RequestBody CategoryDto dto) {
        Category c = categoryRepository.findById(id).orElseThrow(() -> new NotFoundException("Category not found"));
        c.setName(dto.name());
        c.setParent(dto.parentId() == null ? null :
                categoryRepository.findById(dto.parentId())
                        .orElseThrow(() -> new NotFoundException("Parent category not found")));
        c = categoryRepository.save(c);
        return new CategoryDto(c.getId(), c.getName(), c.getParent() != null ? c.getParent().getId() : null);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { categoryRepository.deleteById(id); }
}
