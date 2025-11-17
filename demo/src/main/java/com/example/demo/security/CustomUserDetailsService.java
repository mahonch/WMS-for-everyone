package com.example.demo.security;

import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        var u = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        var authorities = u.getRoles().stream()
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r.getCode()))
                .collect(Collectors.toSet());

        return new CustomUserDetails(
                u.getId(),
                u.getUsername(),
                u.getPasswordHash(),
                authorities
        );
    }
}
