package com.jobtracker.repository;

import com.jobtracker.model.Interview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findByUserIdOrderByInterviewDateDesc(Long userId);
    Optional<Interview> findByIdAndUserId(Long id, Long userId);
}
