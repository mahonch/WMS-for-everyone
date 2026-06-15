package com.example.demo.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Кэширование статики (CSS, JS, изображения)
        registry.addResourceHandler("/css/**", "/js/**", "/images/**", "/assets/**")
                .addResourceLocations("classpath:/static/css/",
                                     "classpath:/static/js/",
                                     "classpath:/static/images/",
                                     "classpath:/static/assets/")
                .setCachePeriod(2592000); // 30 дней
    }
}
