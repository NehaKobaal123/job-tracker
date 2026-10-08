package com.jobtracker.controller;

import com.jobtracker.dto.ApplicationRequest;
import com.jobtracker.model.JobApplication;
import com.jobtracker.model.User;
import com.jobtracker.repository.JobApplicationRepository;
import com.jobtracker.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController extends BaseController {
    private final JobApplicationRepository repository;

    public ApplicationController(JobApplicationRepository repository, UserRepository userRepository) {
        super(userRepository);
        this.repository = repository;
    }

    @GetMapping
    public List<JobApplication> list(Authentication auth) {
        return repository.findByUserIdOrderByAppliedDateDesc(currentUser(auth).getId());
    }

    @PostMapping
    public JobApplication create(@RequestBody ApplicationRequest request, Authentication auth) {
        User user = currentUser(auth);
        JobApplication a = new JobApplication();
        a.setUser(user);
        apply(a, request);
        return repository.save(a);
    }

    @PutMapping("/{id}")
    public JobApplication update(@PathVariable Long id, @RequestBody ApplicationRequest request, Authentication auth) {
        User user = currentUser(auth);
        JobApplication a = repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Application not found."));
        apply(a, request);
        return repository.save(a);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, Authentication auth) {
        User user = currentUser(auth);
        JobApplication a = repository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Application not found."));
        repository.delete(a);
    }

    private void apply(JobApplication a, ApplicationRequest r) {
        if (r.company() == null || r.company().isBlank() || r.role() == null || r.role().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Company and role are required.");
        }
        a.setCompany(r.company().trim());
        a.setRole(r.role().trim());
        a.setLocation(r.location());
        a.setSource(r.source());
        a.setAppliedDate(r.appliedDate() == null ? LocalDate.now() : r.appliedDate());
        a.setStatus(r.status() == null || r.status().isBlank() ? "Applied" : r.status());
        a.setNotes(r.notes());
        a.setJobUrl(r.jobUrl());
    }
}
