package com.example.demo.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtService {

    private final Key key;
    private final long accessTtl;
    private final long refreshTtl;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.access-ttl}") long accessTtl,
                      @Value("${app.jwt.refresh-ttl}") long refreshTtl) {

        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.accessTtl = accessTtl;
        this.refreshTtl = refreshTtl;
    }

    public String generateAccess(String username, String role, Long userId) {

        return Jwts.builder()
                .setSubject(username)
                .claim("userId", userId)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + accessTtl))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String generateRefresh(String username) {
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + refreshTtl))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
    }

    public String getUsername(String token) {
        return parse(token).getBody().getSubject();
    }

    public Long getUserId(String token) {
        Object v = parse(token).getBody().get("userId");
        return v == null ? null : Long.valueOf(v.toString());
    }
}
