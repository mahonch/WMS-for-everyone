package com.example.demo.config;

import com.example.demo.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.security.servlet.PathRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // фронт работает без cookies → CSRF отключаем
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(reg -> reg
                        // статика и публичные страницы
                        .requestMatchers(PathRequest.toStaticResources().atCommonLocations()).permitAll()
                        .requestMatchers("/", "/index.html", "/dashboard.html", "/scan.html", "/labels.html", "/favicon.ico").permitAll()
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/assets/**", "/webjars/**").permitAll()

                        // swagger
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // ошибки
                        .requestMatchers("/error").permitAll()

                        // аутентификация
                        .requestMatchers("/api/auth/**").permitAll()

                        // публичные api (если нужно)
                        .requestMatchers(HttpMethod.POST, "/api/scan").permitAll()
                        .requestMatchers(HttpMethod.GET,  "/api/qr/**").permitAll()

                        // 🔐 АДМИН-ПАНЕЛЬ — только ADMIN (ставим до общих правил!)
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // остальные GET по API — чтение доступно этим ролям
                        .requestMatchers(HttpMethod.GET, "/api/**")
                        .hasAnyRole("ADMIN","MANAGER","STOREKEEPER","GUEST")

                        // операций по складу — ADMIN | STOREKEEPER
                        .requestMatchers("/api/receipts/**", "/api/issues/**", "/api/transfers/**")
                        .hasAnyRole("ADMIN","STOREKEEPER")

                        // всё остальное — только ADMIN
                        .anyRequest().hasRole("ADMIN")
                )
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .authenticationProvider(authProvider())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public AuthenticationProvider authProvider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(userDetailsService);
        p.setPasswordEncoder(passwordEncoder());
        return p;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
