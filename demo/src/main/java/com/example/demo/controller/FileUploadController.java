package com.example.demo.controller;

import com.example.demo.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Контроллер для загрузки и отдачи файлов изображений.
 */
@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final FileUploadService fileUploadService;

    /**
     * Загрузка файла изображения.
     */
    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestParam("file") MultipartFile file
    ) {
        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Файл пуст"));
            }

            // Проверка типа файла
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Только изображения"));
            }

            String filePath = fileUploadService.uploadFile(file);
            
            Map<String, String> response = new HashMap<>();
            response.put("url", filePath);
            response.put("filename", file.getOriginalFilename());
            
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Ошибка загрузки: " + e.getMessage()));
        }
    }

    /**
     * Удаление файла.
     */
    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteFile(@RequestParam String path) {
        fileUploadService.deleteFile(path);
        return ResponseEntity.ok().build();
    }
}
