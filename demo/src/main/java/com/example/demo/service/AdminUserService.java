package com.example.demo.service;

import com.example.demo.entity.Role;
import com.example.demo.entity.User;
import com.example.demo.repository.RoleRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public User create(String username, String rawPassword, String roleCode) {
        var role = roles.findByCode(roleCode).orElseThrow();
        var u = User.builder()
                .username(username)
                .password(encoder.encode(rawPassword))
                .active(true)
                .roles(Set.of(role))
                .build();
        return users.save(u);
    }

    @Transactional
    public User updateRole(Long userId, String roleCode) {
        var u = users.findById(userId).orElseThrow();
        var role = roles.findByCode(roleCode).orElseThrow();
        u.setRoles(Set.of(role));
        return users.save(u);
    }

    @Transactional
    public User setActive(Long userId, boolean active) {
        var u = users.findById(userId).orElseThrow();
        u.setActive(active);
        return users.save(u);
    }

    @Transactional
    public void delete(Long userId) {
        users.deleteById(userId);
    }
}
