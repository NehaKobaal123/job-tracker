package com.jobtracker.controller;

import com.jobtracker.dto.InterviewRequest;
import com.jobtracker.model.Interview;
import com.jobtracker.model.User;
import com.jobtracker.repository.InterviewRepository;
import com.jobtracker.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/interviews")
public class InterviewController extends BaseController {
    private final InterviewRepository repository;

    public InterviewController(InterviewRepository repository, UserRepository userRepository) {
        super(userRepository);
        this.repository = repository;
    }

    @GetMapping
    public List<Interview> list(Authentication auth) {
        return repository.findByUserIdOrderByInterviewDateDesc(currentUser(auth).getId());
    }

    @PostMapping
    public Interview create(@RequestBody InterviewRequest r, Authentication auth) {
        User u = currentUser(auth);
        Interview i = new Interview();
        i.setUser(u);
        i.setCompany(r.company());
        i.setRole(r.role());
        i.setInterviewDate(r.interviewDate() == null ? LocalDateTime.now() : r.interviewDate());
        i.setType(r.type());
        i.setStatus(r.status() == null ? "Scheduled" : r.status());
        i.setNotes(r.notes());
        return repository.save(i);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, Authentication auth) {
        User u = currentUser(auth);
        Interview i = repository.findByIdAndUserId(id, u.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Interview not found."));
        repository.delete(i);
    }
}
