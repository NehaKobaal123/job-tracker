package com.jobtracker.security;

import com.jobtracker.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;

    public JwtAuthFilter(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                String email = jwtService.extractEmail(token);
                userRepository.findByEmail(email).ifPresent(user -> {
                    if (jwtService.isValid(token, user.getEmail())) {
                        var auth = new UsernamePasswordAuthenticationToken(
                                user.getEmail(), null, AuthorityUtils.NO_AUTHORITIES);
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                });
            } catch (Exception ignored) {
                // Invalid token: protected endpoints will return 401.
            }
        }

        filterChain.doFilter(request, response);
    }
}
