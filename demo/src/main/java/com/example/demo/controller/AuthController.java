package com.example.demo.controller;

import com.example.demo.security.CustomUserDetails;
import com.example.demo.security.JwtService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginReq req) {

        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username, req.password)
        );

        var principal = (CustomUserDetails) auth.getPrincipal();

        String role = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst().orElse("ROLE_GUEST");

        String access = jwtService.generateAccess(
                principal.getUsername(),
                role,
                principal.getId()
        );

        String refresh = jwtService.generateRefresh(principal.getUsername());

        return ResponseEntity.ok(Map.of(
                "id", principal.getId(),
                "username", principal.getUsername(),
                "role", role,
                "accessToken", access,
                "refreshToken", refresh
        ));
    }

    @GetMapping("/me")
    public Object me(@AuthenticationPrincipal CustomUserDetails user) {
        if (user == null)
            return Map.of("anonymous", true);

        return Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "roles", user.getAuthorities()
        );
    }

    @Data
    public static class LoginReq {
        public String username;
        public String password;
    }
}
