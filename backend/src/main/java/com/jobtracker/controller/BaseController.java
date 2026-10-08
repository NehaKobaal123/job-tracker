package com.jobtracker.controller;

import com.jobtracker.model.User;
import com.jobtracker.repository.UserRepository;
import org.springframework.security.core.Authentication;

public abstract class BaseController {
    protected final UserRepository userRepository;

    protected BaseController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    protected User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "User not found."));
    }
}
