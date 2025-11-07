package com.example.demo.config;

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
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
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // роли по-умолчанию
        ensureRole("ADMIN", "Администратор");
        ensureRole("STOREKEEPER", "Кладовщик");
        ensureRole("MANAGER", "Менеджер");
        ensureRole("GUEST", "Гость");

        if (userRepository.findByUsername("admin").isEmpty()) {
            var adminRole = roleRepository.findByCode("ADMIN").orElseThrow();
            User u = User.builder()
                    .username("admin")
                    .password(passwordEncoder.encode("1111"))
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
}
