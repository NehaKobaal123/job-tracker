package com.jobtracker.controller;

import com.jobtracker.dto.SavedJobRequest;
import com.jobtracker.model.SavedJob;
import com.jobtracker.model.User;
import com.jobtracker.repository.SavedJobRepository;
import com.jobtracker.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/saved-jobs")
public class SavedJobController extends BaseController {
    private final SavedJobRepository repository;

    public SavedJobController(SavedJobRepository repository, UserRepository userRepository) {
        super(userRepository);
        this.repository = repository;
    }

    @GetMapping
    public List<SavedJob> list(Authentication auth) {
        return repository.findByUserIdOrderBySavedAtDesc(currentUser(auth).getId());
    }

    @PostMapping
    public SavedJob create(@RequestBody SavedJobRequest r, Authentication auth) {
        User u = currentUser(auth);
        SavedJob s = new SavedJob();
        s.setUser(u);
        s.setCompany(r.company());
        s.setRole(r.role());
        s.setLocation(r.location());
        s.setJobUrl(r.jobUrl());
        s.setSavedAt(LocalDateTime.now());
        return repository.save(s);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, Authentication auth) {
        User u = currentUser(auth);
        SavedJob s = repository.findByIdAndUserId(id, u.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Saved job not found."));
        repository.delete(s);
    }
}
