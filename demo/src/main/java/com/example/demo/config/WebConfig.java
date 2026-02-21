package com.example.demo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Конфигурация для раздачи статических файлов (загруженные изображения).
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads/products}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Раздача файлов из директории uploads
        // Используем абсолютный путь от рабочей директории
        File uploadPath = new File(uploadDir);
        if (!uploadPath.isAbsolute()) {
            uploadPath = new File(System.getProperty("user.dir"), uploadDir);
        }
        String uploadAbsolute = uploadPath.getAbsolutePath();
        
        System.out.println("[WebConfig] Upload directory: " + uploadAbsolute);
        System.out.println("[WebConfig] Exists: " + uploadPath.exists());
        System.out.println("[WebConfig] Can read: " + uploadPath.canRead());

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadAbsolute + File.separator);
    }
}
