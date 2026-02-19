package com.example.demo.config;

import com.example.demo.entity.Category;
import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.CategoryRepository;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // роли по-умолчанию
        ensureRole("ADMIN", "Администратор");
        ensureRole("STOREKEEPER", "Кладовщик");
        ensureRole("MANAGER", "Менеджер");
        ensureRole("GUEST", "Гость");

        // категории по-умолчанию
        ensureCategory("Электроника");
        ensureCategory("Бытовая техника");
        ensureCategory("Продукты");
        ensureCategory("Хозтовары");
        ensureCategory("Строительство");
        ensureCategory("Одежда");
        ensureCategory("Автозапчасти");
        ensureCategory("Канцтовары");
        ensureCategory("Игрушки");
        ensureCategory("Спорт");

        if (userRepository.findByUsername("admin").isEmpty()) {
            var adminRole = roleRepository.findByCode("ADMIN").orElseThrow();
            User u = User.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("1111"))
                    .active(true)
                    .roles(Set.of(adminRole))
                    .build();
            userRepository.save(u);
        }
    }

    private void ensureRole(String code, String name) {
        roleRepository.findByCode(code).orElseGet(() -> {
            Role r = Role.builder().code(code).name(name).build();
            return roleRepository.save(r);
        });
    }

    private void ensureCategory(String name) {
        categoryRepository.findByName(name).orElseGet(() -> {
            Category c = Category.builder().name(name).build();
            return categoryRepository.save(c);
        });
    }
}
