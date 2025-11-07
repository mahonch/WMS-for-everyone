package com.example.demo.controller;

import com.example.demo.security.JwtService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager; // создадим через конфигурацию ниже
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username, req.password)
        );

        var principal = (User) auth.getPrincipal();
        String role = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority).findFirst().orElse("ROLE_GUEST");

        String access = jwtService.generateAccess(principal.getUsername(), role);
        String refresh = jwtService.generateRefresh(principal.getUsername());

        return ResponseEntity.ok(Map.of(
                "accessToken", access,
                "refreshToken", refresh,
                "role", role
        ));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody RefreshReq req) {
        var username = jwtService.getUsername(req.refreshToken);
        String access = jwtService.generateAccess(username, "ROLE_USER"); // роль прочитаем при запросе
        return ResponseEntity.ok(Map.of("accessToken", access));
    }

    @GetMapping("/me")
    public Object me(@AuthenticationPrincipal User user) {
        if (user == null) return Map.of("anonymous", true);
        return Map.of(
                "username", user.getUsername(),
                "roles", user.getAuthorities()
        );
    }

    @Data
    public static class LoginReq { public String username; public String password; }

    @Data
    public static class RefreshReq { public String refreshToken; }
}
