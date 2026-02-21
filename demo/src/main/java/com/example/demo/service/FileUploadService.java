package com.example.demo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FileUploadService {

    @Value("${app.upload.dir:uploads/products}")
    private String uploadDir;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
            System.out.println("[FileUploadService] Upload directory created: " + uploadDir);
        } catch (IOException e) {
            System.err.println("[FileUploadService] Failed to create upload directory: " + e.getMessage());
        }
    }

    /**
     * Загрузка файла и сохранение на диск
     * @return относительный путь к файлу (для сохранения в БД)
     */
    public String uploadFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return null;
        }

        // Генерируем уникальное имя файла
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        String filename = UUID.randomUUID().toString() + extension;
        Path filePath = Paths.get(uploadDir, filename);

        // Сохраняем файл
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        // Возвращаем относительный путь (для URL)
        return "/uploads/products/" + filename;
    }

    /**
     * Удаление файла
     */
    public void deleteFile(String filePath) {
        if (filePath != null && !filePath.isEmpty()) {
            try {
                // Убираем ведущий слэш для получения относительного пути
                String relativePath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
                Path path = Paths.get(relativePath);
                Files.deleteIfExists(path);
                System.out.println("[FileUploadService] File deleted: " + filePath);
            } catch (IOException e) {
                System.err.println("[FileUploadService] Failed to delete file: " + filePath + ", error: " + e.getMessage());
            }
        }
    }

    /**
     * Получить полный путь к файлу
     */
    public Path getFilePath(String filename) {
        return Paths.get(uploadDir, filename);
    }
}
