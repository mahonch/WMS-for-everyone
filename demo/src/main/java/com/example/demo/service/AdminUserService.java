package com.example.demo.service;

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;

    public List<User> findAll() {
        return users.findAll();
    }

    @Transactional
    public User create(String username, String rawPassword, String roleCode, String email) {
        var role = roles.findByCode(roleCode).orElseThrow();

        var u = User.builder()
                .username(username)
                .email(email)
                .passwordHash(encoder.encode(rawPassword))
                .active(true)
                .roles(Set.of(role))
                .build();

        return users.save(u);
    }

    @Transactional
    public User updateRole(Long userId, String roleCode) {
        var u = users.findById(userId).orElseThrow();
        var role = roles.findByCode(roleCode).orElseThrow();

        // ✔ сброс ролей
        u.getRoles().clear();

        // ✔ установка новой
        u.getRoles().add(role);

        return users.save(u);
    }

    @Transactional
    public User setActive(Long userId, boolean active) {
        var u = users.findById(userId).orElseThrow();
        u.setActive(active);
        return users.save(u);
    }

    @Transactional
    public void safeDelete(Long userId) {
        var u = users.findById(userId).orElseThrow();
        u.setActive(false);
        users.save(u);
    }
}
